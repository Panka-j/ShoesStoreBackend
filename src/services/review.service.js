import mongoose from "mongoose";
import Review from "../models/reviewModel.js";
import Product from "../models/productModel.js";
import ServerError from "../common/errors/ServerError.js";

const paginate = (page, limit) => ({
  skip: (Number(page) - 1) * Number(limit),
  limit: Number(limit),
  page: Number(page),
});

const syncProductRating = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    averageRating: stats ? parseFloat(stats.avg.toFixed(2)) : 0,
    reviewCount: stats ? stats.count : 0,
  });
};

export const getMyReviews = async (userId, { page = 1, limit = 20 } = {}) => {
  const { skip, limit: lim, page: pg } = paginate(page, limit);
  const [items, total] = await Promise.all([
    Review.find({ buyer: userId })
      .populate("product", "name brand images slug")
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 }),
    Review.countDocuments({ buyer: userId }),
  ]);
  return {
    items,
    total,
    page: pg,
    limit: lim,
    totalPages: Math.ceil(total / lim),
  };
};

export const getProductReviews = async (
  productId,
  { page = 1, limit = 20 } = {}
) => {
  if (!mongoose.Types.ObjectId.isValid(productId))
    throw new ServerError(400, "Invalid product id.");

  const { skip, limit: lim, page: pg } = paginate(page, limit);
  const [items, total] = await Promise.all([
    Review.find({ product: productId })
      .populate("buyer", "firstName lastName avatar")
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 }),
    Review.countDocuments({ product: productId }),
  ]);
  return {
    items,
    total,
    page: pg,
    limit: lim,
    totalPages: Math.ceil(total / lim),
  };
};

export const createReview = async (userId, productId, { rating, comment }) => {
  if (!mongoose.Types.ObjectId.isValid(productId))
    throw new ServerError(400, "Invalid product id.");

  const product = await Product.findById(productId);
  if (!product) throw new ServerError(404, "Product not found.");

  let review;
  try {
    review = await Review.create({
      product: productId,
      buyer: userId,
      rating,
      comment,
    });
  } catch (err) {
    if (err.code === 11000)
      throw new ServerError(409, "You have already reviewed this product.");
    throw err;
  }

  await syncProductRating(productId);
  return review.populate("buyer", "firstName lastName avatar");
};

export const updateReview = async (userId, reviewId, { rating, comment }) => {
  const review = await Review.findById(reviewId);
  if (!review) throw new ServerError(404, "Review not found.");
  if (review.buyer.toString() !== userId.toString())
    throw new ServerError(403, "Forbidden: you do not own this review.");

  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;
  review.isEdited = true;
  await review.save();

  await syncProductRating(review.product.toString());
  return review.populate("buyer", "firstName lastName avatar");
};

export const deleteReview = async (user, reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) throw new ServerError(404, "Review not found.");
  if (user.role === "buyer" && review.buyer.toString() !== user._id.toString())
    throw new ServerError(403, "Forbidden: you do not own this review.");

  const productId = review.product.toString();
  await review.deleteOne();
  await syncProductRating(productId);
};
