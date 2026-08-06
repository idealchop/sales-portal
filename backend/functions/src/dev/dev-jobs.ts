/**
 * Dev-tier schedulers (riverdb-dev).
 *
 * Deploy only with `ENV=dev DEPLOY_DEV_JOBS=1 ./deploy.sh`.
 * Runtime no-ops when SALES_PORTAL_DEV_JOBS_ENABLED=false.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { SALES_PORTAL_FUNCTION_SECRETS } from "../config/function-secrets";
import { isDevJobsEnabled } from "../config/dev-tier";
import { runEventsTrainingPromotionDelivery } from "../services/events-training/events-training-delivery-service";

async function runGated(name: string, fn: () => Promise<void>): Promise<void> {
  if (!isDevJobsEnabled()) {
    logger.info(`[${name}] skipped — SALES_PORTAL_DEV_JOBS_ENABLED is not true`);
    return;
  }
  await fn();
}

export const eventsTrainingPromotionDeliveryDev = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Manila",
    region: "asia-southeast1",
    memory: "256MiB",
    timeoutSeconds: 180,
    secrets: [...SALES_PORTAL_FUNCTION_SECRETS],
  },
  () =>
    runGated("eventsTrainingPromotionDeliveryDev", async () => {
      const result = await runEventsTrainingPromotionDelivery();
      if (result.schedules.fired > 0 || result.schedules.errors > 0) {
        logger.info("eventsTrainingPromotionDeliveryDev complete", result);
      }
    }),
);
