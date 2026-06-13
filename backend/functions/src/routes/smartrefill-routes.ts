import express from "express";
import { proxySmartrefillRequest } from "../handlers/smartrefill-proxy-handler";
import {
  requireSalesPortalAccess,
  validateFirebaseIdToken,
} from "../middleware/auth-middleware";

const router = express.Router();

router.use(validateFirebaseIdToken, requireSalesPortalAccess);
router.all("/*", proxySmartrefillRequest);

export default router;
