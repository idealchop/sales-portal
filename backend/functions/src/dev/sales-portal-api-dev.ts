import { onRequest } from "firebase-functions/v2/https";
import { SALES_PORTAL_DEV_FUNCTION_SECRETS } from "../config/function-secrets";
import { api } from "../index-api";

/**
 * Dev HTTP gateway — same Express app as Prod.
 * Uses riverdb-dev via function-name Dev-tier detection (see config/dev-tier.ts).
 * Legacy SmartRefill analytics still use prod-smartrefill.
 * Does not replace salesPortalApi.
 */
export const salesPortalApiDev = onRequest(
  {
    region: "asia-southeast1",
    cors: true,
    timeoutSeconds: 540,
    memory: "1GiB",
    secrets: [...SALES_PORTAL_DEV_FUNCTION_SECRETS],
  },
  api,
);
