import express from "express";
import { getDashboardAnalytics, getDashboardSalesHome } from "../handlers/dashboard-handler";
import {
  getLegacySmartRefillAnalyticsHandler,
  getLegacySmartRefillStationDetailHandler,
  postLegacySmartRefillStationIgnoreHandler,
  postLegacySmartRefillStationContactHandler,
  postLegacySmartRefillStationRestoreHandler,
  deleteLegacySmartRefillStationHandler,
  postLegacySmartRefillStationsBulkDeleteHandler,
  postLegacySmartRefillStationsBulkIgnoreHandler,
  postLegacySmartRefillStationsBulkContactHandler,
} from "../handlers/legacy-smartrefill-analytics-handler";
import { requireManagerOrAdminRole } from "../middleware/require-admin";
import { patchPlatformAlertContactHandler } from "../handlers/platform-alert-contact-handler";
import { patchInactiveOwnerContactHandler } from "../handlers/inactive-owner-contact-handler";
import { postOutreachSendHandler } from "../handlers/outreach-send-handler";
import {
  getSubscriptionOfficialReceipt,
  getSubscriptionStatement,
  postApproveSubscription,
} from "../handlers/subscription-approval-handler";
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

router.get(
  "/smartrefill-old/analytics",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getLegacySmartRefillAnalyticsHandler,
);

router.post(
  "/smartrefill-old/stations/bulk-delete",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  requireManagerOrAdminRole,
  postLegacySmartRefillStationsBulkDeleteHandler,
);

router.post(
  "/smartrefill-old/stations/bulk-ignore",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postLegacySmartRefillStationsBulkIgnoreHandler,
);

router.post(
  "/smartrefill-old/stations/bulk-contact",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postLegacySmartRefillStationsBulkContactHandler,
);

router.get(
  "/smartrefill-old/stations/:stationId",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getLegacySmartRefillStationDetailHandler,
);

router.post(
  "/smartrefill-old/stations/:stationId/ignore",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postLegacySmartRefillStationIgnoreHandler,
);

router.post(
  "/smartrefill-old/stations/:stationId/contact",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postLegacySmartRefillStationContactHandler,
);

router.post(
  "/smartrefill-old/stations/:stationId/restore",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postLegacySmartRefillStationRestoreHandler,
);

router.delete(
  "/smartrefill-old/stations/:stationId",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  requireManagerOrAdminRole,
  deleteLegacySmartRefillStationHandler,
);

router.patch(
  "/platform-alerts/:alertId/contact",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  patchPlatformAlertContactHandler,
);

router.patch(
  "/inactive-owners/:businessId/contact",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  patchInactiveOwnerContactHandler,
);

router.post(
  "/outreach/send",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postOutreachSendHandler,
);

router.post(
  "/subscriptions/:businessId/:subscriptionId/approve",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  postApproveSubscription,
);

router.get(
  "/subscriptions/:businessId/statement",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getSubscriptionStatement,
);

router.get(
  "/subscriptions/:businessId/:subscriptionId/official-receipt",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getSubscriptionOfficialReceipt,
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
