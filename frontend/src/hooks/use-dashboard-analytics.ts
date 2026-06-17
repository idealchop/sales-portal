"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDashboardAnalytics } from "@/lib/dashboard/fetch-dashboard-analytics";
import { readDashboardAnalyticsCache } from "@/lib/dashboard/analytics-cache";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

export function useDashboardAnalytics() {
  const [data, setData] = useState<DashboardAnalytics | null>(() =>
    readDashboardAnalyticsCache()?.data ?? null,
  );
  const [isLoading, setIsLoading] = useState(
    () => !readDashboardAnalyticsCache(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computedAt, setComputedAt] = useState<string | null>(
    () => readDashboardAnalyticsCache()?.computedAt ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    void fetchDashboardAnalytics()
      .then((result) => {
        if (cancelled) return;
        setData(result.data);
        setComputedAt(result.computedAt);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (!readDashboardAnalyticsCache()) {
          setError("Unable to load platform analytics.");
          setData(null);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsRefreshing(true);
    }

    try {
      const result = await fetchDashboardAnalytics({ force: true });
      setData(result.data);
      setComputedAt(result.computedAt);
      setError(null);
    } catch {
      if (!options?.silent && !readDashboardAnalyticsCache()) {
        setError("Unable to load platform analytics.");
        setData(null);
      }
    } finally {
      if (!options?.silent) {
        setIsRefreshing(false);
      }
    }
  }, []);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    computedAt,
    refresh,
  };
}

export type DashboardAnalyticsRefresh = (options?: {
  silent?: boolean;
}) => Promise<void>;
