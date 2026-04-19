import mongoose from "mongoose";
import { slugify } from "../common/utils/slugify.js";

const sizeVariantSchema = new mongoose.Schema(
  {
    size: {
      type: Number,
      required: [true, "Size is required"],
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [200, "Name must be at most 200 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Description must be at most 2000 characters"],
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
      maxlength: [100, "Brand must be at most 100 characters"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller is required"],
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Price cannot be negative"],
    },
    images: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Image",
      },
    ],
    sizeVariants: {
      type: [sizeVariantSchema],
      validate: {
        validator: (v) => v && v.length > 0,
        message: "At least one size variant is required",
      },
    },
    tags: {
      type: [String],
      validate: {
        validator: (v) => v.length <= 10,
        message: "At most 10 tags allowed",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ basePrice: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ "sizeVariants.size": 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ seller: 1, isActive: 1 });
productSchema.index({ name: "text", description: "text", brand: "text" });

productSchema.pre("validate", async function () {
  if (!this.isNew && !this.isModified("name")) return;

  const baseSlug = slugify(this.name);
  const existing = await mongoose
    .model("Product")
    .findOne({ slug: baseSlug, _id: { $ne: this._id } });

  if (existing) {
    const suffix = this._id.toString().slice(-6);
    this.slug = `${baseSlug}-${suffix}`;
  } else {
    this.slug = baseSlug;
  }
});

const Product = mongoose.model("Product", productSchema);

export default Product;
