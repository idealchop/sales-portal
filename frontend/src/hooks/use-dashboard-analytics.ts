"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  normalizeDashboardAnalytics,
  type DashboardAnalytics,
} from "@/lib/dashboard/analytics";

export function useDashboardAnalytics() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      await Promise.resolve();
      setIsLoading(true);
      setError(null);
    }
    try {
      const response = await apiClient.get<{ data: DashboardAnalytics }>(
        "/dashboard/analytics",
      );
      setData(normalizeDashboardAnalytics(response.data));
      if (!options?.silent) setError(null);
    } catch {
      if (!options?.silent) {
        setError("Unable to load SmartRefill analytics.");
        setData(null);
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  return { data, isLoading, error, refresh: load };
}

export type DashboardAnalyticsRefresh = (options?: { silent?: boolean }) => Promise<void>;
