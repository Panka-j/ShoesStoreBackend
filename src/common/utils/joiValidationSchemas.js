import Joi from "joi";

const textField = (fieldName, maxLength = 400) =>
  Joi.string()
    .trim()
    .min(1)
    .max(maxLength)
    .required()
    .messages({
      "string.base": `${fieldName} must be a string.`,
      "string.empty": `${fieldName} cannot be empty.`,
      "string.max": `${fieldName} cannot exceed ${maxLength} characters.`,
      "any.required": `${fieldName} is required.`,
    });

const optionalTextField = (fieldName, maxLength = 400) =>
  Joi.string()
    .trim()
    .min(1)
    .max(maxLength)
    .optional()
    .messages({
      "string.base": `${fieldName} must be a string.`,
      "string.empty": `${fieldName} cannot be empty.`,
      "string.max": `${fieldName} cannot exceed ${maxLength} characters.`,
    });

const email = Joi.string()
  .pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  .required()
  .messages({
    "string.pattern.base": "Please provide a valid email address.",
    "string.empty": "Email cannot be empty.",
    "any.required": "Email is required.",
  });

const password = Joi.string().min(8).required().messages({
  "string.base": "Password must be a string.",
  "string.min": "Password must be at least 8 characters.",
  "any.required": "Password is required.",
});
