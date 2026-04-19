import { Router } from "express";
import {
  listProducts,
  getProduct,
  listMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productControllers.js";
import { verifyAccessJWT } from "../middlewares/authMiddlewares.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddlewares.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../common/utils/joiValidationSchemas.js";
import { upload } from "../middlewares/multerMiddleware.js";

const router = Router();

// public
router.get("/", listProducts);

// seller — must be before /:slugOrId to avoid route collision
router.get(
  "/seller/my-products",
  verifyAccessJWT,
  authorizeRoles("seller"),
  listMyProducts
);

router.get("/:slugOrId", getProduct);

router.post(
  "/",
  verifyAccessJWT,
  authorizeRoles("seller"),
  upload.array("images", 10),
  validateRequest(createProductSchema),
  createProduct
);
router.patch(
  "/:productId",
  verifyAccessJWT,
  authorizeRoles("seller", "admin"),
  upload.array("images", 10),
  validateRequest(updateProductSchema),
  updateProduct
);
router.delete(
  "/:productId",
  verifyAccessJWT,
  authorizeRoles("seller", "admin"),
  deleteProduct
);

export default router;
