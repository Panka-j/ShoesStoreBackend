import mongoose from "mongoose";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import ServerError from "../common/errors/ServerError.js";
import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";

export const listCategories = wrapAsync(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  return res
    .status(200)
    .json(new ServerResponse(200, categories, "Categories fetched."));
});

export const getCategory = wrapAsync(async (req, res) => {
  const { slugOrId } = req.params;
  const query = mongoose.Types.ObjectId.isValid(slugOrId)
    ? { _id: slugOrId }
    : { slug: slugOrId };

  const category = await Category.findOne(query);
  if (!category) throw new ServerError(404, "Category not found.");
  return res
    .status(200)
    .json(new ServerResponse(200, category, "Category fetched."));
});

export const createCategory = wrapAsync(async (req, res) => {
  const category = await Category.create(req.body);
  return res
    .status(201)
    .json(new ServerResponse(201, category, "Category created."));
});

export const updateCategory = wrapAsync(async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (!category) throw new ServerError(404, "Category not found.");

  Object.assign(category, req.body);
  await category.save();

  return res
    .status(200)
    .json(new ServerResponse(200, category, "Category updated."));
});

export const deleteCategory = wrapAsync(async (req, res) => {
  const category = await Category.findById(req.params.categoryId);
  if (!category) throw new ServerError(404, "Category not found.");

  const productCount = await Product.countDocuments({
    category: category._id,
  });

  if (productCount > 0 && req.query.force !== "true") {
    throw new ServerError(
      400,
      `Cannot delete: ${productCount} product(s) use this category. Pass ?force=true to override.`
    );
  }

  await category.deleteOne();
  return res
    .status(200)
    .json(new ServerResponse(200, null, "Category deleted."));
});
