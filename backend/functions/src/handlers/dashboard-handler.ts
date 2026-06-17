import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { getDashboardAnalyticsCached } from "../services/dashboard-analytics-cache";
import { filterNewJoinersForActor } from "../services/filter-new-joiners-for-actor";
import type { SalesPortalRole } from "../services/sales-portal-access";
import { logger } from "firebase-functions";

export const getDashboardAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { data, meta } = await getDashboardAnalyticsCached();
    const uid = req.user?.uid;
    const role = req.user?.role as SalesPortalRole | undefined;

    const payload =
      uid && role ?
        {
          ...data,
          newJoiners: await filterNewJoinersForActor(data.newJoiners, {
            uid,
            role,
          }),
        }
      : data;

    res.set(
      "Cache-Control",
      "private, max-age=60, stale-while-revalidate=300",
    );
    res.json({ data: payload, meta });
  } catch (error) {
    logger.error("Failed to load dashboard analytics", { error });
    res.status(500).json({ error: "Failed to load dashboard analytics." });
  }
};
