import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
} from "../controllers/authControllers.js";
import { verifyAccessJWT } from "../middlewares/authMiddlewares.js";
import { validateRequest } from "../middlewares/validationMiddlewares.js";
import {
  registerSchema,
  loginSchema,
} from "../common/utils/joiValidationSchemas.js";

const router = Router();

router.post("/register", validateRequest(registerSchema), register);
router.post("/login", validateRequest(loginSchema), login);
router.post("/logout", verifyAccessJWT, logout);
router.post("/refresh-token", refreshToken);
router.get("/get-me", verifyAccessJWT, getMe);

export default router;
