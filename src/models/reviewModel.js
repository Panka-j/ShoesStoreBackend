import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer",
      },
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, "Comment must be at most 1000 characters"],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// one review per buyer per product
reviewSchema.index({ product: 1, buyer: 1 }, { unique: true });
reviewSchema.index({ product: 1 });
reviewSchema.index({ buyer: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
