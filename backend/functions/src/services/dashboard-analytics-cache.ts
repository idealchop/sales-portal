import { logger } from "firebase-functions";
import {
  fetchDashboardAnalytics,
  type DashboardAnalytics,
} from "./dashboard-analytics-service";
import {
  readDashboardAnalyticsSnapshot,
  writeDashboardAnalyticsSnapshot,
} from "./dashboard-analytics-snapshot";
import { trackSalesFirestoreOperation } from "./observability/firestore-op-tracker";

export type DashboardAnalyticsCacheMeta = {
  cached: boolean;
  stale: boolean;
  computedAt: string;
  /** Always false — dashboard Gemini path removed; insights are rules-only. */
  aiEnabled?: boolean;
};

/**
 * Rules/metrics refresh interval for Sales Portal dashboard analytics.
 *
 * LOCKED at 30 minutes for Firestore cost control — full platform scans +
 * per-business fan-out run on recompute. Do not shorten without a Monitoring
 * cost review (see river-firestore-compute-oversight).
 * Never calls Gemini.
 */
export const DASHBOARD_ANALYTICS_STALE_AFTER_MS = 30 * 60 * 1000;

let refreshInFlight: Promise<DashboardAnalytics> | null = null;

function snapshotAgeMs(computedAt: string): number {
  const parsed = Date.parse(computedAt);
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
  return Date.now() - parsed;
}

async function computeAndPersistRulesOnly(): Promise<DashboardAnalytics> {
  const fresh = await fetchDashboardAnalytics();
  const computedAt = new Date().toISOString();
  await writeDashboardAnalyticsSnapshot(fresh, computedAt);
  trackSalesFirestoreOperation({
    operation: "dashboard.analytics.recompute",
    writes: 1,
    extra: {
      staleAfterMs: DASHBOARD_ANALYTICS_STALE_AFTER_MS,
      remark: "full_platform_scan",
    },
  });
  return fresh;
}

function scheduleBackgroundRefresh(): void {
  if (refreshInFlight) return;

  refreshInFlight = computeAndPersistRulesOnly().finally(() => {
    refreshInFlight = null;
  });

  void refreshInFlight.catch((error) => {
    logger.warn("Background dashboard analytics refresh failed", { error });
  });
}

function cacheMetaFrom(
  computedAt: string,
  cached: boolean,
  stale: boolean,
): DashboardAnalyticsCacheMeta {
  return {
    cached,
    stale,
    computedAt,
    aiEnabled: false,
  };
}

/** Returns a Firestore snapshot immediately; refreshes stale rules/metrics only. */
export async function getDashboardAnalyticsCached(): Promise<{
  data: DashboardAnalytics;
  meta: DashboardAnalyticsCacheMeta;
}> {
  const snapshot = await readDashboardAnalyticsSnapshot();

  if (snapshot) {
    const stale = snapshotAgeMs(snapshot.computedAt) > DASHBOARD_ANALYTICS_STALE_AFTER_MS;
    if (stale) {
      scheduleBackgroundRefresh();
    }

    return {
      data: snapshot.data,
      meta: cacheMetaFrom(snapshot.computedAt, true, stale),
    };
  }

  if (refreshInFlight) {
    const data = await refreshInFlight;
    const latest = await readDashboardAnalyticsSnapshot();
    const computedAt = latest?.computedAt ?? new Date().toISOString();
    return {
      data,
      meta: cacheMetaFrom(computedAt, true, false),
    };
  }

  const data = await computeAndPersistRulesOnly();
  return {
    data,
    meta: cacheMetaFrom(new Date().toISOString(), false, false),
  };
}
