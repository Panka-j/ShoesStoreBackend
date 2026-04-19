import { Router } from "express";
import wrapAsync from "../common/utils/wrapAsync.js";
import { getImageById } from "../controllers/imageControllers.js";

const router = Router();

router.get("/:i_id", wrapAsync(getImageById));

export default router;
