import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { SALES_PORTAL_FUNCTION_SECRETS } from "../config/function-secrets";
import {
  runScheduledLeadGather,
  SCHEDULED_LEAD_GATHER_CRON,
  SCHEDULED_LEAD_GATHER_TIME_ZONE,
} from "../services/gather-leads-service";

/**
 * Every midnight Asia/Manila: full gather of SmartRefill, legacy, and content
 * emails into `leads`. CRM fields stay untouched. Incremental is the UI button.
 */
export const leadPipelineGather = onSchedule(
  {
    schedule: SCHEDULED_LEAD_GATHER_CRON,
    timeZone: SCHEDULED_LEAD_GATHER_TIME_ZONE,
    region: "asia-southeast1",
    memory: "1GiB",
    timeoutSeconds: 540,
    secrets: [...SALES_PORTAL_FUNCTION_SECRETS],
  },
  async () => {
    const result = await runScheduledLeadGather();
    logger.info("leadPipelineGather complete", result);
  },
);
