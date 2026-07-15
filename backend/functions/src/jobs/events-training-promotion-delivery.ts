import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { SALES_PORTAL_FUNCTION_SECRETS } from "../config/function-secrets";
import { runEventsTrainingPromotionDelivery } from "../services/events-training/events-training-delivery-service";

/**
 * Every 5 minutes: fire due webinar promotion schedules, then publish
 * queued Meta community Page posts.
 */
export const eventsTrainingPromotionDelivery = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Manila",
    region: "asia-southeast1",
    memory: "256MiB",
    timeoutSeconds: 180,
    secrets: [...SALES_PORTAL_FUNCTION_SECRETS],
  },
  async () => {
    const result = await runEventsTrainingPromotionDelivery();
    if (
      result.schedules.fired > 0 ||
      result.meta.posted > 0 ||
      result.meta.failed > 0 ||
      result.schedules.errors > 0
    ) {
      logger.info("eventsTrainingPromotionDelivery complete", result);
    }
  },
);
