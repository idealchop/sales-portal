import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { fetchDashboardAnalytics } from "../services/dashboard-analytics-service";
import { logger } from "firebase-functions";

export const getDashboardAnalytics = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const data = await fetchDashboardAnalytics();
    res.json({ data });
  } catch (error) {
    logger.error("Failed to load dashboard analytics", { error });
    res.status(500).json({ error: "Failed to load dashboard analytics." });
  }
};
