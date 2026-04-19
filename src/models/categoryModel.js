import mongoose from "mongoose";
import { slugify } from "../common/utils/slugify.js";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
    },
  },
  { timestamps: true }
);

categorySchema.pre("validate", function () {
  if (this.isNew || this.isModified("name")) {
    this.slug = slugify(this.name);
  }
});

const Category = mongoose.model("Category", categorySchema);

export default Category;
