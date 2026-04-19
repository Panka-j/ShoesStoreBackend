import { Router } from "express";
import {
  placeOrder,
  listMyOrders,
  getMyOrder,
  cancelOrder,
  listSellerOrders,
  getSellerOrder,
  updateOrderStatus,
  adminListOrders,
  adminGetOrder,
  adminDeleteOrder,
} from "../controllers/orderControllers.js";
import { verifyAccessJWT } from "../middlewares/authMiddlewares.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddlewares.js";
import {
  placeOrderSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
} from "../common/utils/joiValidationSchemas.js";

const router = Router();

// ── Buyer ─────────────────────────────────────────────────────────────────────
router.post(
  "/",
  verifyAccessJWT,
  authorizeRoles("buyer"),
  validateRequest(placeOrderSchema),
  placeOrder
);
router.get("/my", verifyAccessJWT, authorizeRoles("buyer"), listMyOrders);
router.get(
  "/my/:orderId",
  verifyAccessJWT,
  authorizeRoles("buyer"),
  getMyOrder
);
router.patch(
  "/my/:orderId/cancel",
  verifyAccessJWT,
  authorizeRoles("buyer"),
  validateRequest(cancelOrderSchema),
  cancelOrder
);

// ── Seller ────────────────────────────────────────────────────────────────────
router.get(
  "/seller",
  verifyAccessJWT,
  authorizeRoles("seller"),
  listSellerOrders
);
router.get(
  "/seller/:orderId",
  verifyAccessJWT,
  authorizeRoles("seller"),
  getSellerOrder
);
router.patch(
  "/seller/:orderId/status",
  verifyAccessJWT,
  authorizeRoles("seller"),
  validateRequest(updateOrderStatusSchema),
  updateOrderStatus
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get("/admin", verifyAccessJWT, authorizeRoles("admin"), adminListOrders);
router.get(
  "/admin/:orderId",
  verifyAccessJWT,
  authorizeRoles("admin"),
  adminGetOrder
);
router.delete(
  "/admin/:orderId",
  verifyAccessJWT,
  authorizeRoles("admin"),
  adminDeleteOrder
);

export default router;
