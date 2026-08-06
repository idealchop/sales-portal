import { onRequest } from "firebase-functions/v2/https";
import { SALES_PORTAL_FUNCTION_SECRETS } from "./config/function-secrets";
import { api, app } from "./index-api";

export { app };

export const salesPortalApi = onRequest(
  {
    region: "asia-southeast1",
    cors: true,
    timeoutSeconds: 540,
    memory: "1GiB",
    secrets: [...SALES_PORTAL_FUNCTION_SECRETS],
  },
  api,
);

/** Dev tier HTTP API (riverdb-dev). Additive — does not replace salesPortalApi. */
export { salesPortalApiDev } from "./dev/sales-portal-api-dev";

export { eventsTrainingPromotionDelivery } from "./jobs/events-training-promotion-delivery";

/** Dev schedulers — stub unless DEPLOY_DEV_JOBS=1 swaps enabled exports. */
export * from "./dev/dev-jobs-exports";
