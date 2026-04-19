import mongoose from "mongoose";
import Order, { ORDER_STATUSES } from "../models/orderModel.js";
import Product from "../models/productModel.js";
import ServerError from "../common/errors/ServerError.js";
import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";

// allowed seller status transitions
const SELLER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
};

// ─── Buyer ───────────────────────────────────────────────────────────────────

export const placeOrder = wrapAsync(async (req, res) => {
  const { productId, size, quantity } = req.body;
  const buyer = req.user;

  if (!buyer.address?.city || !buyer.address?.zipCode) {
    throw new ServerError(
      400,
      "Please add a shipping address to your profile before ordering."
    );
  }

  const product = await Product.findById(productId);
  if (!product) throw new ServerError(404, "Product not found.");
  if (!product.isActive)
    throw new ServerError(400, "Product is no longer available.");

  const variant = product.sizeVariants.find((v) => v.size === size);
  if (!variant)
    throw new ServerError(
      400,
      `Size ${size} is not available for this product.`
    );

  // atomic stock decrement — prevents overselling
  const updated = await Product.updateOne(
    {
      _id: productId,
      sizeVariants: {
        $elemMatch: { size, stock: { $gte: quantity } },
      },
    },
    { $inc: { "sizeVariants.$.stock": -quantity } }
  );

  if (updated.modifiedCount === 0) {
    throw new ServerError(
      400,
      "Insufficient stock for the requested quantity."
    );
  }

  const unitPrice = variant.price ?? product.basePrice;

  const order = await Order.create({
    buyer: buyer._id,
    seller: product.seller,
    product: productId,
    size,
    quantity,
    unitPrice,
    totalPrice: unitPrice * quantity,
    shippingAddress: buyer.address,
    status: "pending",
    statusHistory: [{ status: "pending", changedBy: buyer._id }],
  });

  const populated = await order.populate([
    { path: "product", select: "name brand images" },
    { path: "seller", select: "firstName lastName" },
  ]);

  return res
    .status(201)
    .json(new ServerResponse(201, populated, "Order placed successfully."));
});

export const listMyOrders = wrapAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { buyer: req.user._id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("product", "name brand images")
      .populate("seller", "firstName lastName")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ServerResponse(
      200,
      {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      "Orders fetched."
    )
  );
});

export const getMyOrder = wrapAsync(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    buyer: req.user._id,
  })
    .populate("product", "name brand images basePrice")
    .populate("seller", "firstName lastName email");

  if (!order) throw new ServerError(404, "Order not found.");
  return res.status(200).json(new ServerResponse(200, order, "Order fetched."));
});

export const cancelOrder = wrapAsync(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    buyer: req.user._id,
  });
  if (!order) throw new ServerError(404, "Order not found.");

  if (order.status !== "pending") {
    throw new ServerError(
      400,
      "Only pending orders can be cancelled by the buyer."
    );
  }

  // restore stock
  await Product.updateOne(
    { _id: order.product, "sizeVariants.size": order.size },
    { $inc: { "sizeVariants.$.stock": order.quantity } }
  );

  order.status = "cancelled";
  order.cancelReason = req.body.cancelReason || "";
  order.cancelledBy = "buyer";
  order.statusHistory.push({
    status: "cancelled",
    changedBy: req.user._id,
    note: req.body.cancelReason || "",
  });
  await order.save();

  return res
    .status(200)
    .json(new ServerResponse(200, order, "Order cancelled."));
});

// ─── Seller ──────────────────────────────────────────────────────────────────

export const listSellerOrders = wrapAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { seller: req.user._id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("product", "name brand images")
      .populate("buyer", "firstName lastName email")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ServerResponse(
      200,
      {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      "Orders fetched."
    )
  );
});

export const getSellerOrder = wrapAsync(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    seller: req.user._id,
  })
    .populate("product", "name brand images basePrice")
    .populate("buyer", "firstName lastName email");

  if (!order) throw new ServerError(404, "Order not found.");
  return res.status(200).json(new ServerResponse(200, order, "Order fetched."));
});

export const updateOrderStatus = wrapAsync(async (req, res) => {
  const { status, note } = req.body;

  const order = await Order.findOne({
    _id: req.params.orderId,
    seller: req.user._id,
  });
  if (!order) throw new ServerError(404, "Order not found.");

  const allowed = SELLER_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(status)) {
    throw new ServerError(
      400,
      `Cannot transition from "${order.status}" to "${status}".`
    );
  }

  if (status === "cancelled") {
    // restore stock on seller-cancel
    await Product.updateOne(
      { _id: order.product, "sizeVariants.size": order.size },
      { $inc: { "sizeVariants.$.stock": order.quantity } }
    );
    order.cancelledBy = "seller";
    order.cancelReason = note || "";
  }

  order.status = status;
  order.statusHistory.push({
    status,
    changedBy: req.user._id,
    note: note || "",
  });
  await order.save();

  return res
    .status(200)
    .json(new ServerResponse(200, order, "Order status updated."));
});

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminListOrders = wrapAsync(async (req, res) => {
  const { status, buyer, seller, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (buyer) filter.buyer = buyer;
  if (seller) filter.seller = seller;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("product", "name brand")
      .populate("buyer", "firstName lastName email")
      .populate("seller", "firstName lastName email")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ServerResponse(
      200,
      {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      "Orders fetched."
    )
  );
});

export const adminGetOrder = wrapAsync(async (req, res) => {
  const order = await Order.findById(req.params.orderId)
    .populate("product", "name brand images basePrice")
    .populate("buyer", "firstName lastName email")
    .populate("seller", "firstName lastName email");

  if (!order) throw new ServerError(404, "Order not found.");
  return res.status(200).json(new ServerResponse(200, order, "Order fetched."));
});

export const adminDeleteOrder = wrapAsync(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.orderId);
  if (!order) throw new ServerError(404, "Order not found.");
  return res.status(200).json(new ServerResponse(200, null, "Order deleted."));
});
