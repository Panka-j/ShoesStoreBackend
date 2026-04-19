import Joi from "joi";

const addressSchema = Joi.object({
  street: Joi.string().trim(),
  city: Joi.string().trim(),
  state: Joi.string().trim().allow(""),
  zipCode: Joi.string().trim(),
  country: Joi.string().trim(),
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50),
  lastName: Joi.string().trim().min(2).max(50),
  phone: Joi.string().trim().max(20).allow(""),
  address: addressSchema,
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

export const adminUpdateUserSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50),
  lastName: Joi.string().trim().min(2).max(50),
  phone: Joi.string().trim().max(20).allow(""),
  address: addressSchema,
});

export const changeRoleSchema = Joi.object({
  role: Joi.string().valid("buyer", "seller", "admin").required(),
});
