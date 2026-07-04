import { apiClient } from "@/lib/api-client";
import {
  normalizeDashboardAnalytics,
  type DashboardAnalytics,
} from "@/lib/dashboard/analytics";

type DashboardAnalyticsResponse = {
  data: DashboardAnalytics;
  meta?: {
    computedAt?: string;
  };
};

export type DashboardAnalyticsFetchResult = {
  data: DashboardAnalytics;
  computedAt: string;
};

let inFlight: Promise<DashboardAnalyticsFetchResult> | null = null;

async function requestDashboardAnalytics(): Promise<DashboardAnalyticsFetchResult> {
  const response = await apiClient.get<DashboardAnalyticsResponse>(
    "/dashboard/analytics",
  );
  const data = normalizeDashboardAnalytics(response.data);
  const computedAt = response.meta?.computedAt ?? new Date().toISOString();
  return { data, computedAt };
}

export async function fetchDashboardAnalytics(): Promise<DashboardAnalyticsFetchResult> {
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
