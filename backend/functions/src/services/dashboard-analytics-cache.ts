import { logger } from "firebase-functions";
import {
  fetchDashboardAnalytics,
  type DashboardAnalytics,
} from "./dashboard-analytics-service";
import {
  readDashboardAnalyticsSnapshot,
  writeDashboardAnalyticsSnapshot,
} from "./dashboard-analytics-snapshot";

export type DashboardAnalyticsCacheMeta = {
  cached: boolean;
  stale: boolean;
  computedAt: string;
};

const STALE_AFTER_MS = 2 * 60 * 1000;

let refreshInFlight: Promise<DashboardAnalytics> | null = null;

function snapshotAgeMs(computedAt: string): number {
  const parsed = Date.parse(computedAt);
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
  return Date.now() - parsed;
}

async function computeAndPersist(): Promise<DashboardAnalytics> {
  const data = await fetchDashboardAnalytics();
  const computedAt = new Date().toISOString();
  await writeDashboardAnalyticsSnapshot(data, computedAt);
  return data;
}

function scheduleBackgroundRefresh(): void {
  if (refreshInFlight) return;

  refreshInFlight = computeAndPersist().finally(() => {
    refreshInFlight = null;
  });

  void refreshInFlight.catch((error) => {
    logger.warn("Background dashboard analytics refresh failed", { error });
  });
}

/** Returns a Firestore snapshot immediately when available; refreshes stale data in the background. */
export async function getDashboardAnalyticsCached(): Promise<{
  data: DashboardAnalytics;
  meta: DashboardAnalyticsCacheMeta;
}> {
  const snapshot = await readDashboardAnalyticsSnapshot();

  if (snapshot) {
    const stale = snapshotAgeMs(snapshot.computedAt) > STALE_AFTER_MS;
    if (stale) {
      scheduleBackgroundRefresh();
    }

    return {
      data: snapshot.data,
      meta: {
        cached: true,
        stale,
        computedAt: snapshot.computedAt,
      },
    };
  }

  if (refreshInFlight) {
    const data = await refreshInFlight;
    const latest = await readDashboardAnalyticsSnapshot();
    return {
      data,
      meta: {
        cached: true,
        stale: false,
        computedAt: latest?.computedAt ?? new Date().toISOString(),
      },
    };
  }

  const data = await computeAndPersist();
  return {
    data,
    meta: {
      cached: false,
      stale: false,
      computedAt: new Date().toISOString(),
    },
  };
}
