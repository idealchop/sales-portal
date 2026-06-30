import express from "express";
import { getDashboardAnalytics, getDashboardSalesHome } from "../handlers/dashboard-handler";
import { postApproveSubscription } from "../handlers/subscription-approval-handler";
import {
  getCommunityDispatchRequestById,
  getCommunityDispatchRequests,
  postAssignCommunityDispatchRequest,
  postCancelCommunityDispatchRequest,
} from "../handlers/community-dispatch-handler";
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

router.get(
  "/sales-home",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getDashboardSalesHome,
);

router.post(
  "/subscriptions/:businessId/:subscriptionId/approve",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postApproveSubscription,
);

router.get(
  "/community-dispatch/requests",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getCommunityDispatchRequests,
);

router.get(
  "/community-dispatch/requests/:requestId",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getCommunityDispatchRequestById,
);

router.post(
  "/community-dispatch/requests/:requestId/cancel",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postCancelCommunityDispatchRequest,
);

router.post(
  "/community-dispatch/requests/:requestId/assign",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postAssignCommunityDispatchRequest,
);

export default router;
