import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";
import { saveMultipleImagesToDb } from "../common/utils/saveMultipleImagesToDb.js";
import * as productService from "../services/product.service.js";

const parseJsonField = (value, fallbackSplit = false) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallbackSplit ? value.split(",").map((t) => t.trim()) : value;
  }
};

export const listProducts = wrapAsync(async (req, res) => {
  const {
    category,
    size,
    minPrice,
    maxPrice,
    seller,
    sort,
    search,
    page,
    limit,
    isActive,
  } = req.query;
  const data = await productService.listProducts({
    category,
    size,
    minPrice,
    maxPrice,
    seller,
    sort,
    search,
    page,
    limit,
    isActive: isActive !== undefined ? isActive === "true" : true,
  });
  res.status(200).json(new ServerResponse(200, data, "Products fetched."));
});

export const getProduct = wrapAsync(async (req, res) => {
  const product = await productService.getProduct(req.params.slugOrId);
  res.status(200).json(new ServerResponse(200, product, "Product fetched."));
});

export const listMyProducts = wrapAsync(async (req, res) => {
  const { page, limit } = req.query;
  const data = await productService.listMyProducts(req.user._id, {
    page,
    limit,
  });
  res.status(200).json(new ServerResponse(200, data, "Products fetched."));
});

export const createProduct = wrapAsync(async (req, res) => {
  const imageIds = req.files?.length
    ? await saveMultipleImagesToDb(req.files)
    : [];
  const data = {
    ...req.body,
    sizeVariants: parseJsonField(req.body.sizeVariants),
    tags: parseJsonField(req.body.tags, true),
  };
  const product = await productService.createProduct(
    req.user._id,
    data,
    imageIds
  );
  res.status(201).json(new ServerResponse(201, product, "Product created."));
});

export const updateProduct = wrapAsync(async (req, res) => {
  const newImageIds = req.files?.length
    ? await saveMultipleImagesToDb(req.files)
    : [];

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
  const sizeVariants = parseJsonField(req.body.sizeVariants);
  const tags = parseJsonField(req.body.tags, true);
  if (sizeVariants) updates.sizeVariants = sizeVariants;
  if (tags) updates.tags = tags;

  const product = await productService.updateProduct(
    req.user,
    req.params.productId,
    updates,
    newImageIds
  );
  res.status(200).json(new ServerResponse(200, product, "Product updated."));
});

export const deleteProduct = wrapAsync(async (req, res) => {
  await productService.deleteProduct(req.user, req.params.productId);
  res.status(200).json(new ServerResponse(200, null, "Product deleted."));
});
