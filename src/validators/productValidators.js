import Joi from "joi";

const sizeVariantSchema = Joi.object({
  size: Joi.number().required(),
  stock: Joi.number().min(0).required(),
  price: Joi.number().min(0),
});

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().min(10).max(2000).required(),
  brand: Joi.string().trim().max(100).required(),
  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({ "string.pattern.base": "category must be a valid ObjectId" }),
  basePrice: Joi.number().min(0).required(),
  sizeVariants: Joi.array().items(sizeVariantSchema).min(1).required(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200),
  description: Joi.string().trim().min(10).max(2000),
  brand: Joi.string().trim().max(100),
  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({ "string.pattern.base": "category must be a valid ObjectId" }),
  basePrice: Joi.number().min(0),
  sizeVariants: Joi.array().items(sizeVariantSchema).min(1),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
  isActive: Joi.boolean(),
});
