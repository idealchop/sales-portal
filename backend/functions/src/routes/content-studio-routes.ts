import express from "express";
import { rateLimit } from "express-rate-limit";
import { postGenerateSocialPost } from "../handlers/content-studio-handler";
import {
  requireSalesPortalAccess,
  validateFirebaseIdToken,
} from "../middleware/auth-middleware";

const router = express.Router();

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => !!process.env.FUNCTIONS_EMULATOR,
  message: "Too many generation requests. Please try again later.",
});

router.post(
  "/generate",
  generateLimiter,
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postGenerateSocialPost,
);

export default router;
