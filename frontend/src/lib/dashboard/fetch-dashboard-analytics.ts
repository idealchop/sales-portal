import { apiClient } from "@/lib/api-client";
import {
  normalizeDashboardAnalytics,
  type DashboardAnalytics,
} from "@/lib/dashboard/analytics";
import {
  readDashboardAnalyticsCache,
  writeDashboardAnalyticsCache,
} from "@/lib/dashboard/analytics-cache";

type DashboardAnalyticsResponse = {
  data: DashboardAnalytics;
  meta?: {
    computedAt?: string;
    cached?: boolean;
    stale?: boolean;
  };
};

export type DashboardAnalyticsFetchResult = {
  data: DashboardAnalytics;
  fromCache: boolean;
  computedAt: string;
};

let inFlight: Promise<DashboardAnalyticsFetchResult> | null = null;

async function requestDashboardAnalytics(): Promise<DashboardAnalyticsFetchResult> {
  const response = await apiClient.get<DashboardAnalyticsResponse>(
    "/dashboard/analytics",
  );
  const data = normalizeDashboardAnalytics(response.data);
  const computedAt = response.meta?.computedAt ?? new Date().toISOString();
  writeDashboardAnalyticsCache(data, computedAt);
  return { data, fromCache: false, computedAt };
}

export async function fetchDashboardAnalytics(options?: {
  force?: boolean;
}): Promise<DashboardAnalyticsFetchResult> {
  if (!options?.force) {
    const cached = readDashboardAnalyticsCache();
    if (cached?.isFresh) {
      return {
        data: cached.data,
        fromCache: true,
        computedAt: cached.computedAt,
      };
    }

    if (cached?.isStale) {
      if (!inFlight) {
        inFlight = requestDashboardAnalytics().finally(() => {
          inFlight = null;
        });
      }
      void inFlight;
      return {
        data: cached.data,
        fromCache: true,
        computedAt: cached.computedAt,
      };
    }
  }

  if (!inFlight) {
    inFlight = requestDashboardAnalytics().finally(() => {
      inFlight = null;
    });
  }

  return inFlight;
}

export function prefetchDashboardAnalytics(): void {
  void fetchDashboardAnalytics().catch(() => {
    // Prefetch failures are handled when the dashboard hook loads.
  });
}
