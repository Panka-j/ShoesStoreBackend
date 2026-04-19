import Joi from "joi";

// ── Primitive helpers ──────────────────────────────────────────────────────────

export const textField = (fieldName, maxLength = 400) =>
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

export const optionalTextField = (fieldName, maxLength = 400) =>
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

export const email = Joi.string()
  .pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  .required()
  .messages({
    "string.pattern.base": "Please provide a valid email address.",
    "string.empty": "Email cannot be empty.",
    "any.required": "Email is required.",
  });

export const password = Joi.string().min(8).required().messages({
  "string.base": "Password must be a string.",
  "string.min": "Password must be at least 8 characters.",
  "any.required": "Password is required.",
});

const objectId = (fieldName) =>
  Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      "string.pattern.base": `${fieldName} must be a valid MongoDB ObjectId.`,
      "string.empty": `${fieldName} cannot be empty.`,
      "any.required": `${fieldName} is required.`,
    });

// Accepts either a parsed array OR a JSON string (for multipart/form-data fields).
// opts.min / opts.max bound the array length.
const parseableArray = (itemSchema, opts = {}) =>
  Joi.custom((val, helpers) => {
    let arr = val;
    if (typeof val === "string") {
      try {
        arr = JSON.parse(val);
      } catch {
        return helpers.error("any.invalid");
      }
    }
    if (!Array.isArray(arr)) return helpers.error("any.invalid");
    if (opts.min !== undefined && arr.length < opts.min)
      return helpers.error("any.invalid");
    if (opts.max !== undefined && arr.length > opts.max)
      return helpers.error("any.invalid");
    const result = Joi.array()
      .items(itemSchema)
      .validate(arr, { abortEarly: false, convert: true });
    if (result.error) return helpers.error("any.invalid");
    return result.value;
  });

// ── Auth ───────────────────────────────────────────────────────────────────────

export const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required().messages({
    "string.min": "First name must be at least 2 characters.",
    "string.max": "First name cannot exceed 50 characters.",
    "any.required": "First name is required.",
  }),
  lastName: Joi.string().trim().min(2).max(50).required().messages({
    "string.min": "Last name must be at least 2 characters.",
    "string.max": "Last name cannot exceed 50 characters.",
    "any.required": "Last name is required.",
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address.",
    "any.required": "Email is required.",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters.",
    "any.required": "Password is required.",
  }),
  role: Joi.string().valid("buyer", "seller").default("buyer").messages({
    "any.only": "Role must be buyer or seller.",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address.",
    "any.required": "Email is required.",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required.",
  }),
});

// ── User ───────────────────────────────────────────────────────────────────────

const addressSchema = Joi.object({
  street: Joi.string()
    .trim()
    .messages({ "string.base": "Street must be a string." }),
  city: Joi.string()
    .trim()
    .messages({ "string.base": "City must be a string." }),
  state: Joi.string()
    .trim()
    .allow("")
    .messages({ "string.base": "State must be a string." }),
  zipCode: Joi.string()
    .trim()
    .messages({ "string.base": "Zip code must be a string." }),
  country: Joi.string()
    .trim()
    .messages({ "string.base": "Country must be a string." }),
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).messages({
    "string.min": "First name must be at least 2 characters.",
    "string.max": "First name cannot exceed 50 characters.",
  }),
  lastName: Joi.string().trim().min(2).max(50).messages({
    "string.min": "Last name must be at least 2 characters.",
    "string.max": "Last name cannot exceed 50 characters.",
  }),
  phone: Joi.string().trim().max(20).allow("").messages({
    "string.max": "Phone cannot exceed 20 characters.",
  }),
  address: addressSchema,
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required.",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.min": "New password must be at least 8 characters.",
    "any.required": "New password is required.",
  }),
});

export const adminUpdateUserSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).messages({
    "string.min": "First name must be at least 2 characters.",
    "string.max": "First name cannot exceed 50 characters.",
  }),
  lastName: Joi.string().trim().min(2).max(50).messages({
    "string.min": "Last name must be at least 2 characters.",
    "string.max": "Last name cannot exceed 50 characters.",
  }),
  phone: Joi.string().trim().max(20).allow("").messages({
    "string.max": "Phone cannot exceed 20 characters.",
  }),
  address: addressSchema,
});

export const changeRoleSchema = Joi.object({
  role: Joi.string().valid("buyer", "seller", "admin").required().messages({
    "any.only": "Role must be buyer, seller, or admin.",
    "any.required": "Role is required.",
  }),
});

// ── Category ───────────────────────────────────────────────────────────────────

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.min": "Category name must be at least 2 characters.",
    "string.max": "Category name cannot exceed 100 characters.",
    "any.required": "Category name is required.",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters.",
  }),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).messages({
    "string.min": "Category name must be at least 2 characters.",
    "string.max": "Category name cannot exceed 100 characters.",
  }),
  description: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Description cannot exceed 500 characters.",
  }),
});

// ── Product ────────────────────────────────────────────────────────────────────
// sizeVariants and tags may arrive as JSON strings in multipart/form-data.

const sizeVariantItemSchema = Joi.object({
  size: Joi.number().required().messages({
    "number.base": "Size must be a number.",
    "any.required": "Size is required in each size variant.",
  }),
  stock: Joi.number().min(0).required().messages({
    "number.base": "Stock must be a number.",
    "number.min": "Stock cannot be negative.",
    "any.required": "Stock is required in each size variant.",
  }),
  price: Joi.number().min(0).messages({
    "number.base": "Variant price must be a number.",
    "number.min": "Variant price cannot be negative.",
  }),
});

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    "string.min": "Product name must be at least 2 characters.",
    "string.max": "Product name cannot exceed 200 characters.",
    "any.required": "Product name is required.",
  }),
  description: Joi.string().trim().min(10).max(2000).required().messages({
    "string.min": "Description must be at least 10 characters.",
    "string.max": "Description cannot exceed 2000 characters.",
    "any.required": "Description is required.",
  }),
  brand: Joi.string().trim().max(100).required().messages({
    "string.max": "Brand cannot exceed 100 characters.",
    "any.required": "Brand is required.",
  }),
  category: objectId("category").required(),
  basePrice: Joi.number().min(0).required().messages({
    "number.base": "Base price must be a number.",
    "number.min": "Base price cannot be negative.",
    "any.required": "Base price is required.",
  }),
  sizeVariants: parseableArray(sizeVariantItemSchema, { min: 1 })
    .required()
    .messages({
      "any.required": "At least one size variant is required.",
      "any.invalid":
        "sizeVariants must be a valid JSON array with at least one size variant.",
    }),
  tags: parseableArray(Joi.string().trim().max(50), { max: 10 })
    .optional()
    .messages({
      "any.invalid": "tags must be a valid JSON array of up to 10 strings.",
    }),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).messages({
    "string.min": "Product name must be at least 2 characters.",
    "string.max": "Product name cannot exceed 200 characters.",
  }),
  description: Joi.string().trim().min(10).max(2000).messages({
    "string.min": "Description must be at least 10 characters.",
    "string.max": "Description cannot exceed 2000 characters.",
  }),
  brand: Joi.string().trim().max(100).messages({
    "string.max": "Brand cannot exceed 100 characters.",
  }),
  category: objectId("category"),
  basePrice: Joi.number().min(0).messages({
    "number.base": "Base price must be a number.",
    "number.min": "Base price cannot be negative.",
  }),
  sizeVariants: parseableArray(sizeVariantItemSchema, { min: 1 })
    .optional()
    .messages({
      "any.invalid":
        "sizeVariants must be a valid JSON array with at least one size variant.",
    }),
  tags: parseableArray(Joi.string().trim().max(50), { max: 10 })
    .optional()
    .messages({
      "any.invalid": "tags must be a valid JSON array of up to 10 strings.",
    }),
  isActive: Joi.boolean().messages({
    "boolean.base": "isActive must be true or false.",
  }),
});

// ── Order ──────────────────────────────────────────────────────────────────────

export const placeOrderSchema = Joi.object({
  productId: objectId("productId").required(),
  size: Joi.number().required().messages({
    "number.base": "Size must be a number.",
    "any.required": "Size is required.",
  }),
  quantity: Joi.number().integer().min(1).max(20).required().messages({
    "number.base": "Quantity must be a number.",
    "number.integer": "Quantity must be a whole number.",
    "number.min": "Quantity must be at least 1.",
    "number.max": "Quantity cannot exceed 20.",
    "any.required": "Quantity is required.",
  }),
});

export const cancelOrderSchema = Joi.object({
  cancelReason: Joi.string().trim().max(500).allow("").messages({
    "string.max": "Cancel reason cannot exceed 500 characters.",
  }),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "confirmed",
      "processing",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled"
    )
    .required()
    .messages({
      "any.only":
        "Status must be one of: confirmed, processing, shipped, out_for_delivery, delivered, cancelled.",
      "any.required": "Status is required.",
    }),
  note: Joi.string().trim().max(300).allow("").messages({
    "string.max": "Note cannot exceed 300 characters.",
  }),
});

// ── Review ─────────────────────────────────────────────────────────────────────

export const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.base": "Rating must be a number.",
    "number.integer": "Rating must be a whole number.",
    "number.min": "Rating must be at least 1.",
    "number.max": "Rating cannot exceed 5.",
    "any.required": "Rating is required.",
  }),
  comment: Joi.string().trim().max(1000).allow("").messages({
    "string.max": "Comment cannot exceed 1000 characters.",
  }),
});

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).messages({
    "number.base": "Rating must be a number.",
    "number.integer": "Rating must be a whole number.",
    "number.min": "Rating must be at least 1.",
    "number.max": "Rating cannot exceed 5.",
  }),
  comment: Joi.string().trim().max(1000).allow("").messages({
    "string.max": "Comment cannot exceed 1000 characters.",
  }),
});
