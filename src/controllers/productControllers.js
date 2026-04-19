import mongoose from "mongoose";
import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import ServerError from "../common/errors/ServerError.js";
import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";
import { saveMultipleImagesToDb } from "../common/utils/saveMultipleImagesToDb.js";

export const listProducts = wrapAsync(async (req, res) => {
  const {
    category,
    size,
    minPrice,
    maxPrice,
    seller,
    sort,
    search,
    page = 1,
    limit = 20,
    isActive,
  } = req.query;

  const filter = {};

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  } else {
    filter.isActive = true;
  }

  if (category) {
    filter.category = mongoose.Types.ObjectId.isValid(category)
      ? category
      : (await Category.findOne({ slug: category }))?._id;
  }

  if (size) {
    const sizeNum = Number(size);
    filter.sizeVariants = {
      $elemMatch: { size: sizeNum, stock: { $gt: 0 } },
    };
  }

  if (minPrice || maxPrice) {
    filter.basePrice = {};
    if (minPrice) filter.basePrice.$gte = Number(minPrice);
    if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
  }

  if (seller) filter.seller = seller;

  if (search) {
    filter.$text = { $search: search };
  }

  const sortMap = {
    price_asc: { basePrice: 1 },
    price_desc: { basePrice: -1 },
    rating: { averageRating: -1 },
    newest: { createdAt: -1 },
  };
  const sortQuery = sortMap[sort] || { createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name slug")
      .populate("seller", "firstName lastName")
      .skip(skip)
      .limit(Number(limit))
      .sort(sortQuery),
    Product.countDocuments(filter),
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
      "Products fetched."
    )
  );
});

export const getProduct = wrapAsync(async (req, res) => {
  const { slugOrId } = req.params;
  const query = mongoose.Types.ObjectId.isValid(slugOrId)
    ? { _id: slugOrId }
    : { slug: slugOrId };

  const product = await Product.findOne(query)
    .populate("category", "name slug")
    .populate("seller", "firstName lastName");

  if (!product) throw new ServerError(404, "Product not found.");
  return res
    .status(200)
    .json(new ServerResponse(200, product, "Product fetched."));
});

export const listMyProducts = wrapAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Product.find({ seller: req.user._id })
      .populate("category", "name slug")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Product.countDocuments({ seller: req.user._id }),
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
      "Products fetched."
    )
  );
});

export const createProduct = wrapAsync(async (req, res) => {
  const imageIds =
    req.files && req.files.length > 0
      ? await saveMultipleImagesToDb(req.files)
      : [];

  // sizeVariants may arrive as JSON string when sent via multipart
  let sizeVariants = req.body.sizeVariants;
  if (typeof sizeVariants === "string") {
    sizeVariants = JSON.parse(sizeVariants);
  }

  let tags = req.body.tags;
  if (typeof tags === "string") {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = tags.split(",").map((t) => t.trim());
    }
  }

  const product = await Product.create({
    ...req.body,
    sizeVariants,
    tags,
    images: imageIds,
    seller: req.user._id,
  });

  return res
    .status(201)
    .json(new ServerResponse(201, product, "Product created."));
});

export const updateProduct = wrapAsync(async (req, res) => {
  const product = await Product.findById(req.params.productId);
  if (!product) throw new ServerError(404, "Product not found.");

  if (
    req.user.role === "seller" &&
    product.seller.toString() !== req.user._id.toString()
  ) {
    throw new ServerError(403, "Forbidden: you do not own this product.");
  }

  const newImageIds =
    req.files && req.files.length > 0
      ? await saveMultipleImagesToDb(req.files)
      : [];

  let sizeVariants = req.body.sizeVariants;
  if (typeof sizeVariants === "string") {
    sizeVariants = JSON.parse(sizeVariants);
  }

  let tags = req.body.tags;
  if (typeof tags === "string") {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = tags.split(",").map((t) => t.trim());
    }
  }

  const ALLOWED = [
    "name",
    "description",
    "brand",
    "category",
    "basePrice",
    "isActive",
  ];
  const updates = {};
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (sizeVariants) updates.sizeVariants = sizeVariants;
  if (tags) updates.tags = tags;
  if (newImageIds.length > 0) {
    updates.images = [...(product.images || []), ...newImageIds];
  }

  Object.assign(product, updates);
  await product.save();

  return res
    .status(200)
    .json(new ServerResponse(200, product, "Product updated."));
});

export const deleteProduct = wrapAsync(async (req, res) => {
  const product = await Product.findById(req.params.productId);
  if (!product) throw new ServerError(404, "Product not found.");

  if (
    req.user.role === "seller" &&
    product.seller.toString() !== req.user._id.toString()
  ) {
    throw new ServerError(403, "Forbidden: you do not own this product.");
  }

  await product.deleteOne();
  return res
    .status(200)
    .json(new ServerResponse(200, null, "Product deleted."));
});
