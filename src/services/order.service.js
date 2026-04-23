import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import ServerError from "../common/errors/ServerError.js";

// ─── Delivery estimation ──────────────────────────────────────────────────────

const addBusinessDays = (fromDate, days) => {
  const date = new Date(fromDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return date;
};

const statusDate = (history, targetStatus) =>
  history?.find((h) => h.status === targetStatus)?.changedAt ?? null;

const fmt = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const estimateDelivery = (order) => {
  const { status, statusHistory = [], createdAt } = order;

  if (status === "cancelled") return null;

  if (status === "delivered") {
    const d = statusDate(statusHistory, "delivered");
    return d ? `Delivered on ${fmt(d)}` : "Delivered";
  }

  if (status === "out_for_delivery") {
    return `Out for delivery today — ${fmt(new Date())}`;
  }

  // Anchor to the most meaningful status date and add a range of business days
  let ref,
    [dMin, dMax] = [0, 0];
  if (status === "shipped") {
    ref = statusDate(statusHistory, "shipped") ?? createdAt;
    [dMin, dMax] = [3, 5];
  } else if (status === "processing") {
    ref = statusDate(statusHistory, "processing") ?? createdAt;
    [dMin, dMax] = [4, 7];
  } else if (status === "confirmed") {
    ref = statusDate(statusHistory, "confirmed") ?? createdAt;
    [dMin, dMax] = [6, 9];
  } else {
    ref = createdAt;
    [dMin, dMax] = [8, 12];
  }

  return `${fmt(addBusinessDays(ref, dMin))} to ${fmt(addBusinessDays(ref, dMax))}`;
};

const withDeliveryEstimate = (order) => {
  const obj = order.toObject ? order.toObject() : order;
  obj.estimatedDelivery = estimateDelivery(obj);
  return obj;
};

// ─── Seller transitions ───────────────────────────────────────────────────────

const SELLER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
};

const paginate = (page, limit) => ({
  skip: (Number(page) - 1) * Number(limit),
  limit: Number(limit),
  page: Number(page),
});

// ─── Buyer ────────────────────────────────────────────────────────────────────

export const placeOrder = async (buyer, { productId, size, quantity }) => {
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

  const updated = await Product.updateOne(
    {
      _id: productId,
      sizeVariants: { $elemMatch: { size, stock: { $gte: quantity } } },
    },
    { $inc: { "sizeVariants.$.stock": -quantity } }
  );
  if (updated.modifiedCount === 0)
    throw new ServerError(
      400,
      "Insufficient stock for the requested quantity."
    );

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

  return order.populate([
    { path: "product", select: "name brand images" },
    { path: "seller", select: "firstName lastName" },
  ]);
};

export const listMyOrders = async (
  userId,
  { status, page = 1, limit = 20 } = {}
) => {
  const filter = { buyer: userId };
  if (status) filter.status = status;
  const { skip, limit: lim, page: pg } = paginate(page, limit);

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("product", "name brand images")
      .populate("seller", "firstName lastName")
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  return {
    items: items.map(withDeliveryEstimate),
    total,
    page: pg,
    limit: lim,
    totalPages: Math.ceil(total / lim),
  };
};

export const getMyOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, buyer: userId })
    .populate("product", "name brand images basePrice")
    .populate("seller", "firstName lastName email");
  if (!order) throw new ServerError(404, "Order not found.");
  return withDeliveryEstimate(order);
};

export const cancelOrder = async (userId, orderId, cancelReason = "") => {
  const order = await Order.findOne({ _id: orderId, buyer: userId });
  if (!order) throw new ServerError(404, "Order not found.");
  if (order.status !== "pending")
    throw new ServerError(
      400,
      "Only pending orders can be cancelled by the buyer."
    );

  await Product.updateOne(
    { _id: order.product, "sizeVariants.size": order.size },
    { $inc: { "sizeVariants.$.stock": order.quantity } }
  );

  order.status = "cancelled";
  order.cancelReason = cancelReason;
  order.cancelledBy = "buyer";
  order.statusHistory.push({
    status: "cancelled",
    changedBy: userId,
    note: cancelReason,
  });
  await order.save();
  return order;
};

// ─── Seller ───────────────────────────────────────────────────────────────────

export const listSellerOrders = async (
  sellerId,
  { status, page = 1, limit = 20 } = {}
) => {
  const filter = { seller: sellerId };
  if (status) filter.status = status;
  const { skip, limit: lim, page: pg } = paginate(page, limit);

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("product", "name brand images")
      .populate("buyer", "firstName lastName email")
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: pg,
    limit: lim,
    totalPages: Math.ceil(total / lim),
  };
};

export const getSellerOrder = async (sellerId, orderId) => {
  const order = await Order.findOne({ _id: orderId, seller: sellerId })
    .populate("product", "name brand images basePrice")
    .populate("buyer", "firstName lastName email");
  if (!order) throw new ServerError(404, "Order not found.");
  return order;
};

export const updateOrderStatus = async (
  sellerId,
  orderId,
  { status, note = "" }
) => {
  const order = await Order.findOne({ _id: orderId, seller: sellerId });
  if (!order) throw new ServerError(404, "Order not found.");

  const allowed = SELLER_TRANSITIONS[order.status];
  if (!allowed?.includes(status))
    throw new ServerError(
      400,
      `Cannot transition from "${order.status}" to "${status}".`
    );

  if (status === "cancelled") {
    await Product.updateOne(
      { _id: order.product, "sizeVariants.size": order.size },
      { $inc: { "sizeVariants.$.stock": order.quantity } }
    );
    order.cancelledBy = "seller";
    order.cancelReason = note;
  }

  order.status = status;
  order.statusHistory.push({ status, changedBy: sellerId, note });
  await order.save();
  return order;
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminListOrders = async ({
  status,
  buyer,
  seller,
  page = 1,
  limit = 20,
} = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (buyer) filter.buyer = buyer;
  if (seller) filter.seller = seller;
  const { skip, limit: lim, page: pg } = paginate(page, limit);

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("product", "name brand")
      .populate("buyer", "firstName lastName email")
      .populate("seller", "firstName lastName email")
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: pg,
    limit: lim,
    totalPages: Math.ceil(total / lim),
  };
};

export const adminGetOrder = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate("product", "name brand images basePrice")
    .populate("buyer", "firstName lastName email")
    .populate("seller", "firstName lastName email");
  if (!order) throw new ServerError(404, "Order not found.");
  return order;
};

export const adminDeleteOrder = async (orderId) => {
  const order = await Order.findByIdAndDelete(orderId);
  if (!order) throw new ServerError(404, "Order not found.");
};
