import Joi from "joi";

export const placeOrderSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({ "string.pattern.base": "productId must be a valid ObjectId" }),
  size: Joi.number().required(),
  quantity: Joi.number().integer().min(1).max(20).required(),
});

export const cancelOrderSchema = Joi.object({
  cancelReason: Joi.string().trim().max(500).allow(""),
});

export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "confirmed",
      "processing",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled"
    )
    .required(),
  note: Joi.string().trim().max(300).allow(""),
});
