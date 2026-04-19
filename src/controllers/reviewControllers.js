import mongoose from "mongoose";
import Review from "../models/reviewModel.js";
import Product from "../models/productModel.js";
import ServerError from "../common/errors/ServerError.js";
import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";

const updateProductRatingStats = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  await Product.findByIdAndUpdate(productId, {
    averageRating: stats ? parseFloat(stats.avg.toFixed(2)) : 0,
    reviewCount: stats ? stats.count : 0,
  });
};

export const getMyReviews = wrapAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Review.find({ buyer: req.user._id })
      .populate("product", "name brand images slug")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Review.countDocuments({ buyer: req.user._id }),
  ]);

  return res.status(200).json(
    new ServerResponse(
      200,
      {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      "Reviews fetched."
    )
  );
});

export const getProductReviews = wrapAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ServerError(400, "Invalid product id.");
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Review.find({ product: productId })
      .populate("buyer", "firstName lastName avatar")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Review.countDocuments({ product: productId }),
  ]);

  return res.status(200).json(
    new ServerResponse(
      200,
      {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      "Reviews fetched."
    )
  );
});

export const createReview = wrapAsync(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ServerError(400, "Invalid product id.");
  }

  const product = await Product.findById(productId);
  if (!product) throw new ServerError(404, "Product not found.");

  let review;
  try {
    review = await Review.create({
      product: productId,
      buyer: req.user._id,
      rating: req.body.rating,
      comment: req.body.comment,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ServerError(409, "You have already reviewed this product.");
    }
    throw err;
  }

  await updateProductRatingStats(productId);

  const populated = await review.populate("buyer", "firstName lastName avatar");
  return res
    .status(201)
    .json(new ServerResponse(201, populated, "Review submitted."));
});

export const updateReview = wrapAsync(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw new ServerError(404, "Review not found.");

  if (review.buyer.toString() !== req.user._id.toString()) {
    throw new ServerError(403, "Forbidden: you do not own this review.");
  }

  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  review.isEdited = true;
  await review.save();

  await updateProductRatingStats(review.product.toString());

  const populated = await review.populate("buyer", "firstName lastName avatar");
  return res
    .status(200)
    .json(new ServerResponse(200, populated, "Review updated."));
});

export const deleteReview = wrapAsync(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw new ServerError(404, "Review not found.");

  if (
    req.user.role === "buyer" &&
    review.buyer.toString() !== req.user._id.toString()
  ) {
    throw new ServerError(403, "Forbidden: you do not own this review.");
  }

  const productId = review.product.toString();
  await review.deleteOne();
  await updateProductRatingStats(productId);

  return res.status(200).json(new ServerResponse(200, null, "Review deleted."));
});
