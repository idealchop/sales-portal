"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLegacySmartRefillAnalytics } from "@/lib/dashboard/fetch-legacy-smartrefill-analytics";
import type { LegacySmartRefillAnalytics } from "@/lib/dashboard/legacy-smartrefill-analytics";

export function useLegacySmartRefillAnalytics() {
  const [data, setData] = useState<LegacySmartRefillAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const refresh = useCallback(async (options?: { force?: boolean; silent?: boolean }) => {
    if (!options?.silent) {
      setIsRefreshing(true);
    }
    try {
      const result = await fetchLegacySmartRefillAnalytics({
        refresh: options?.force,
      });
      setData(result.data);
      setComputedAt(result.computedAt);
      setError(null);
      hasDataRef.current = true;
    } catch {
      if (!hasDataRef.current) {
        setError("Unable to load SmartRefill (legacy) analytics.");
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
  }, [refresh]);

  return {
    data,
    setData,
    isLoading,
    isRefreshing,
    error,
    computedAt,
    refresh,
  };
}
