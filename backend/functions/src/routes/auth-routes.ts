import express from "express";
import { getAuthStatus, recordLoginEvent } from "../handlers/auth-handler";
import {
  requireSalesPortalAccess,
  validateFirebaseIdToken,
} from "../middleware/auth-middleware";

const router = express.Router();

router.get(
  "/status",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getAuthStatus,
);
router.post("/login", validateFirebaseIdToken, recordLoginEvent);

export default router;
