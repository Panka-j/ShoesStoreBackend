import { Router } from "express";
import {
  handleMessage,
  clearUserSession,
} from "../controllers/chatbotControllers.js";

const router = Router();

// No verifyAccessJWT here — controller extracts token manually so guest mode works too
router.post("/message", handleMessage);
router.post("/clear-session", clearUserSession);

export default router;
