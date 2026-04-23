import mongoose from "mongoose";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import ServerError from "../common/errors/ServerError.js";

export const listCategories = async () => Category.find().sort({ name: 1 });

export const getCategory = async (slugOrId) => {
  const query = mongoose.Types.ObjectId.isValid(slugOrId)
    ? { _id: slugOrId }
    : { slug: slugOrId };
  const category = await Category.findOne(query);
  if (!category) throw new ServerError(404, "Category not found.");
  return category;
};

export const createCategory = async (data) => Category.create(data);

export const updateCategory = async (categoryId, data) => {
  const category = await Category.findById(categoryId);
  if (!category) throw new ServerError(404, "Category not found.");
  Object.assign(category, data);
  await category.save();
  return category;
};

export const deleteCategory = async (categoryId, force = false) => {
  const category = await Category.findById(categoryId);
  if (!category) throw new ServerError(404, "Category not found.");

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0 && !force)
    throw new ServerError(
      400,
      `Cannot delete: ${productCount} product(s) use this category. Pass ?force=true to override.`
    );

  await category.deleteOne();
};
