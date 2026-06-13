import express from "express";
import {
  completeOnboarding,
  getOnboardingManagers,
  uploadOnboardingAvatar,
} from "../handlers/onboarding-handler";
import {
  requireSalesPortalAccess,
  validateFirebaseIdToken,
} from "../middleware/auth-middleware";

const router = express.Router();

router.get(
  "/managers",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  getOnboardingManagers,
);
router.post(
  "/avatar",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  uploadOnboardingAvatar,
);
router.post(
  "/complete",
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  completeOnboarding,
);

export default router;
