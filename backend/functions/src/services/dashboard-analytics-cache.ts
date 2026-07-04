import {
  fetchDashboardAnalytics,
  type DashboardAnalytics,
} from "./dashboard-analytics-service";

export type DashboardAnalyticsCacheMeta = {
  cached: boolean;
  stale: boolean;
  computedAt: string;
};

/** Always computes fresh analytics — no server-side cache. */
export async function getDashboardAnalyticsCached(): Promise<{
  data: DashboardAnalytics;
  meta: DashboardAnalyticsCacheMeta;
}> {
  const data = await fetchDashboardAnalytics();
  return {
    data,
    meta: {
      cached: false,
      stale: false,
      computedAt: new Date().toISOString(),
    },
  };
}
