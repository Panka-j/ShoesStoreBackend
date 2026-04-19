import { Router } from "express";
import {
  adminListUsers,
  adminGetUser,
  adminUpdateUser,
  adminDeleteUser,
  adminBlockUser,
  adminUnblockUser,
  adminChangeRole,
  getMyProfile,
  updateMyProfile,
  changePassword,
  deleteMyAccount,
  updateAvatar,
} from "../controllers/userControllers.js";
import { verifyAccessJWT } from "../middlewares/authMiddlewares.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddlewares.js";
import {
  updateProfileSchema,
  changePasswordSchema,
  adminUpdateUserSchema,
  changeRoleSchema,
} from "../common/utils/joiValidationSchemas.js";
import { upload } from "../middlewares/multerMiddleware.js";

const router = Router();

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get(
  "/admin/all",
  verifyAccessJWT,
  authorizeRoles("admin"),
  adminListUsers
);
router.get(
  "/admin/:userId",
  verifyAccessJWT,
  authorizeRoles("admin"),
  adminGetUser
);
router.patch(
  "/admin/:userId",
  verifyAccessJWT,
  authorizeRoles("admin"),
  validateRequest(adminUpdateUserSchema),
  adminUpdateUser
);
router.delete(
  "/admin/:userId",
  verifyAccessJWT,
  authorizeRoles("admin"),
  adminDeleteUser
);
router.patch(
  "/admin/:userId/block",
  verifyAccessJWT,
  authorizeRoles("admin"),
  adminBlockUser
);
router.patch(
  "/admin/:userId/unblock",
  verifyAccessJWT,
  authorizeRoles("admin"),
  adminUnblockUser
);
router.patch(
  "/admin/:userId/change-role",
  verifyAccessJWT,
  authorizeRoles("admin"),
  validateRequest(changeRoleSchema),
  adminChangeRole
);

// ── Own-profile routes ────────────────────────────────────────────────────────
router.get("/me", verifyAccessJWT, getMyProfile);
router.patch(
  "/me",
  verifyAccessJWT,
  validateRequest(updateProfileSchema),
  updateMyProfile
);
router.patch(
  "/me/change-password",
  verifyAccessJWT,
  validateRequest(changePasswordSchema),
  changePassword
);
router.delete("/me", verifyAccessJWT, deleteMyAccount);
router.patch(
  "/me/avatar",
  verifyAccessJWT,
  upload.single("avatar"),
  updateAvatar
);

export default router;
