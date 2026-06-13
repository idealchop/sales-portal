import express from "express";
import { getDashboardAnalytics } from "../handlers/dashboard-handler";
import { postApproveSubscription } from "../handlers/subscription-approval-handler";
import {
  requireSalesPortalAccess,
  validateFirebaseIdToken,
} from "../middleware/auth-middleware";

const router = express.Router();

router.get(
  "/analytics",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getDashboardAnalytics,
);

router.post(
  "/subscriptions/:businessId/:subscriptionId/approve",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postApproveSubscription,
);

export default router;
