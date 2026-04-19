import mongoose from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, "Note must be at most 300 characters"],
    },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer is required"],
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller is required"],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    size: {
      type: Number,
      required: [true, "Size is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      max: [20, "Quantity cannot exceed 20"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Price cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Price cannot be negative"],
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, "Shipping address is required"],
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
    },
    statusHistory: [statusHistorySchema],
    cancelReason: {
      type: String,
      trim: true,
      maxlength: [500, "Cancel reason must be at most 500 characters"],
    },
    cancelledBy: {
      type: String,
      enum: ["buyer", "seller", "admin"],
    },
  },
  { timestamps: true }
);

orderSchema.index({ buyer: 1 });
orderSchema.index({ seller: 1 });
orderSchema.index({ product: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
