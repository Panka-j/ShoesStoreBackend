import { Router } from "express";
import {
  getMyReviews,
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/reviewControllers.js";
import { verifyAccessJWT } from "../middlewares/authMiddlewares.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddlewares.js";
import {
  createReviewSchema,
  updateReviewSchema,
} from "../validators/reviewValidators.js";

const router = Router();

router.get("/my", verifyAccessJWT, authorizeRoles("buyer"), getMyReviews);
router.get("/product/:productId", getProductReviews);
router.post(
  "/product/:productId",
  verifyAccessJWT,
  authorizeRoles("buyer"),
  validateRequest(createReviewSchema),
  createReview
);
router.patch(
  "/:reviewId",
  verifyAccessJWT,
  authorizeRoles("buyer"),
  validateRequest(updateReviewSchema),
  updateReview
);
router.delete(
  "/:reviewId",
  verifyAccessJWT,
  authorizeRoles("buyer", "admin"),
  deleteReview
);

export default router;
