import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";
import * as categoryService from "../services/category.service.js";

export const listCategories = wrapAsync(async (req, res) => {
  const categories = await categoryService.listCategories();
  res
    .status(200)
    .json(new ServerResponse(200, categories, "Categories fetched."));
});

export const getCategory = wrapAsync(async (req, res) => {
  const category = await categoryService.getCategory(req.params.slugOrId);
  res.status(200).json(new ServerResponse(200, category, "Category fetched."));
});

export const createCategory = wrapAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json(new ServerResponse(201, category, "Category created."));
});

export const updateCategory = wrapAsync(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.params.categoryId,
    req.body
  );
  res.status(200).json(new ServerResponse(200, category, "Category updated."));
});

export const deleteCategory = wrapAsync(async (req, res) => {
  await categoryService.deleteCategory(
    req.params.categoryId,
    req.query.force === "true"
  );
  res.status(200).json(new ServerResponse(200, null, "Category deleted."));
});
