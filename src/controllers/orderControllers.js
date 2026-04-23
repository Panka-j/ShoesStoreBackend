import ServerResponse from "../common/utils/ServerResponse.js";
import wrapAsync from "../common/utils/wrapAsync.js";
import * as orderService from "../services/order.service.js";

// ─── Buyer ───────────────────────────────────────────────────────────────────

export const placeOrder = wrapAsync(async (req, res) => {
  const order = await orderService.placeOrder(req.user, req.body);
  res
    .status(201)
    .json(new ServerResponse(201, order, "Order placed successfully."));
});

export const listMyOrders = wrapAsync(async (req, res) => {
  const { status, page, limit } = req.query;
  const data = await orderService.listMyOrders(req.user._id, {
    status,
    page,
    limit,
  });
  res.status(200).json(new ServerResponse(200, data, "Orders fetched."));
});

export const getMyOrder = wrapAsync(async (req, res) => {
  const order = await orderService.getMyOrder(req.user._id, req.params.orderId);
  res.status(200).json(new ServerResponse(200, order, "Order fetched."));
});

export const cancelOrder = wrapAsync(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.user._id,
    req.params.orderId,
    req.body.cancelReason
  );
  res.status(200).json(new ServerResponse(200, order, "Order cancelled."));
});

// ─── Seller ──────────────────────────────────────────────────────────────────

export const listSellerOrders = wrapAsync(async (req, res) => {
  const { status, page, limit } = req.query;
  const data = await orderService.listSellerOrders(req.user._id, {
    status,
    page,
    limit,
  });
  res.status(200).json(new ServerResponse(200, data, "Orders fetched."));
});

export const getSellerOrder = wrapAsync(async (req, res) => {
  const order = await orderService.getSellerOrder(
    req.user._id,
    req.params.orderId
  );
  res.status(200).json(new ServerResponse(200, order, "Order fetched."));
});

export const updateOrderStatus = wrapAsync(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.user._id,
    req.params.orderId,
    req.body
  );
  res.status(200).json(new ServerResponse(200, order, "Order status updated."));
});

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminListOrders = wrapAsync(async (req, res) => {
  const { status, buyer, seller, page, limit } = req.query;
  const data = await orderService.adminListOrders({
    status,
    buyer,
    seller,
    page,
    limit,
  });
  res.status(200).json(new ServerResponse(200, data, "Orders fetched."));
});

export const adminGetOrder = wrapAsync(async (req, res) => {
  const order = await orderService.adminGetOrder(req.params.orderId);
  res.status(200).json(new ServerResponse(200, order, "Order fetched."));
});

export const adminDeleteOrder = wrapAsync(async (req, res) => {
  await orderService.adminDeleteOrder(req.params.orderId);
  res.status(200).json(new ServerResponse(200, null, "Order deleted."));
});
