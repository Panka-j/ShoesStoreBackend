import { Router } from "express";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryControllers.js";
import { verifyAccessJWT } from "../middlewares/authMiddlewares.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddlewares.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../common/utils/joiValidationSchemas.js";

const router = Router();

router.get("/", listCategories);
router.get("/:slugOrId", getCategory);
router.post(
  "/",
  verifyAccessJWT,
  authorizeRoles("admin"),
  validateRequest(createCategorySchema),
  createCategory
);
router.patch(
  "/:categoryId",
  verifyAccessJWT,
  authorizeRoles("admin"),
  validateRequest(updateCategorySchema),
  updateCategory
);
router.delete(
  "/:categoryId",
  verifyAccessJWT,
  authorizeRoles("admin"),
  deleteCategory
);

export default router;
