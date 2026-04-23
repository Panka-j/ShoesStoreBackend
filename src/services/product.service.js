import mongoose from "mongoose";
import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import ServerError from "../common/errors/ServerError.js";

const paginate = (page, limit) => ({
  skip: (Number(page) - 1) * Number(limit),
  limit: Number(limit),
  page: Number(page),
});

const SORT_MAP = {
  price_asc: { basePrice: 1 },
  price_desc: { basePrice: -1 },
  rating: { averageRating: -1 },
  newest: { createdAt: -1 },
};

export const listProducts = async ({
  category,
  size,
  minPrice,
  maxPrice,
  seller,
  sort,
  search,
  page = 1,
  limit = 20,
  isActive = true,
} = {}) => {
  const filter = { isActive };

  if (category) {
    filter.category = mongoose.Types.ObjectId.isValid(category)
      ? category
      : (await Category.findOne({ slug: category }))?._id;
  }
  if (size) {
    filter.sizeVariants = {
      $elemMatch: { size: Number(size), stock: { $gt: 0 } },
    };
  }
  if (minPrice || maxPrice) {
    filter.basePrice = {};
    if (minPrice) filter.basePrice.$gte = Number(minPrice);
    if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
  }
  if (seller) filter.seller = seller;
  if (search) filter.$text = { $search: search };

  const { skip, limit: lim, page: pg } = paginate(page, limit);
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .populate("seller", "firstName lastName")
      .skip(skip)
      .limit(lim)
      .sort(SORT_MAP[sort] || { createdAt: -1 }),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: pg,
    limit: lim,
    totalPages: Math.ceil(total / lim),
  };
};

export const getProduct = async (slugOrId) => {
  const query = mongoose.Types.ObjectId.isValid(slugOrId)
    ? { _id: slugOrId }
    : { slug: slugOrId };
  const product = await Product.findOne(query)
    .populate("category", "name slug")
    .populate("seller", "firstName lastName");
  if (!product) throw new ServerError(404, "Product not found.");
  return product;
};

export const listMyProducts = async (
  sellerId,
  { page = 1, limit = 20 } = {}
) => {
  const { skip, limit: lim, page: pg } = paginate(page, limit);
  const [items, total] = await Promise.all([
    Product.find({ seller: sellerId })
      .populate("category", "name slug")
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 }),
    Product.countDocuments({ seller: sellerId }),
  ]);
  return {
    items,
    total,
    page: pg,
    limit: lim,
    totalPages: Math.ceil(total / lim),
  };
};

export const createProduct = async (sellerId, data, imageIds) => {
  return Product.create({ ...data, images: imageIds, seller: sellerId });
};

export const updateProduct = async (user, productId, updates, newImageIds) => {
  const product = await Product.findById(productId);
  if (!product) throw new ServerError(404, "Product not found.");
  if (
    user.role === "seller" &&
    product.seller.toString() !== user._id.toString()
  )
    throw new ServerError(403, "Forbidden: you do not own this product.");

  if (newImageIds.length > 0)
    updates.images = [...(product.images || []), ...newImageIds];

  Object.assign(product, updates);
  await product.save();
  return product;
};

export const deleteProduct = async (user, productId) => {
  const product = await Product.findById(productId);
  if (!product) throw new ServerError(404, "Product not found.");
  if (
    user.role === "seller" &&
    product.seller.toString() !== user._id.toString()
  )
    throw new ServerError(403, "Forbidden: you do not own this product.");
  await product.deleteOne();
};
