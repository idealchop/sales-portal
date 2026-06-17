import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { getDashboardAnalyticsCached } from "../services/dashboard-analytics-cache";
import { filterDashboardAnalyticsForActor } from "../services/filter-dashboard-analytics-for-actor";
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
        await filterDashboardAnalyticsForActor(
          {
            ...data,
            newJoiners: await filterNewJoinersForActor(data.newJoiners, {
              uid,
              role,
            }),
          },
          { uid, role },
        ) :
        data;

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

export const getDashboardSalesHome = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const uid = req.user?.uid;
    const role = req.user?.role as SalesPortalRole | undefined;

    if (!uid || !role) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { data, meta } = await getDashboardAnalyticsCached();
    const scoped = await filterDashboardAnalyticsForActor(
      {
        ...data,
        newJoiners: await filterNewJoinersForActor(data.newJoiners, {
          uid,
          role,
        }),
      },
      { uid, role },
    );

    res.set(
      "Cache-Control",
      "private, max-age=60, stale-while-revalidate=300",
    );
    res.json({
      data: {
        personalSales: scoped.personalSales,
        todaysWork: scoped.todaysWork,
        proposalPipeline: scoped.proposalPipeline,
        newJoiners: scoped.newJoiners,
        analyticsScope: scoped.analyticsScope,
        salesInsights: {
          salesActions: scoped.salesInsights.salesActions,
          estimatedMrr: scoped.salesInsights.estimatedMrr,
        },
      },
      meta,
    });
  } catch (error) {
    logger.error("Failed to load dashboard sales home", { error });
    res.status(500).json({ error: "Failed to load sales home." });
  }
};
