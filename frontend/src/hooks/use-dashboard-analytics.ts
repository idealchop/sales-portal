"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDashboardAnalytics } from "@/lib/dashboard/fetch-dashboard-analytics";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

const POLL_INTERVAL_MS = 30_000;

export function useDashboardAnalytics() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computedAt, setComputedAt] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsRefreshing(true);
    }

    try {
      const result = await fetchDashboardAnalytics();
      setData(result.data);
      setComputedAt(result.computedAt);
      setError(null);
    } catch {
      if (!options?.silent) {
        setError("Unable to load platform analytics.");
        setData(null);
      }
    } finally {
      setIsLoading(false);
      if (!options?.silent) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      void refresh({ silent: true });
    }, POLL_INTERVAL_MS);

    const onFocus = () => {
      void refresh({ silent: true });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

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
