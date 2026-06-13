import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { getDashboardAnalyticsCached } from "../services/dashboard-analytics-cache";
import { logger } from "firebase-functions";

export const getDashboardAnalytics = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { data, meta } = await getDashboardAnalyticsCached();
    res.set(
      "Cache-Control",
      "private, max-age=60, stale-while-revalidate=300",
    );
    res.json({ data, meta });
  } catch (error) {
    logger.error("Failed to load dashboard analytics", { error });
    res.status(500).json({ error: "Failed to load dashboard analytics." });
  }
};
