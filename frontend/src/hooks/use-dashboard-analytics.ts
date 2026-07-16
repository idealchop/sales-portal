"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { fetchDashboardAnalytics } from "@/lib/dashboard/fetch-dashboard-analytics";
import {
  DASHBOARD_ANALYTICS_SNAPSHOT_PATH,
  parseDashboardAnalyticsSnapshot,
} from "@/lib/dashboard/fetch-dashboard-analytics-snapshot";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { firestore } from "@/lib/firebase/firestore";

const POLL_INTERVAL_MS = 30_000;

export function useDashboardAnalytics() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const hasDataRef = useRef(false);
  const lastApiComputedAtRef = useRef<string | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsRefreshing(true);
    }

    try {
      const result = await fetchDashboardAnalytics();
      lastApiComputedAtRef.current = result.computedAt;
      setData(result.data);
      setComputedAt(result.computedAt);
      setIsStale(false);
      setError(null);
      hasDataRef.current = true;
    } catch {
      if (!options?.silent && !hasDataRef.current) {
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
    const snapshotRef = doc(
      firestore,
      DASHBOARD_ANALYTICS_SNAPSHOT_PATH[0],
      DASHBOARD_ANALYTICS_SNAPSHOT_PATH[1],
    );

    const unsubSnapshot = onSnapshot(
      snapshotRef,
      (snap) => {
        if (!snap.exists()) return;

        const parsed = parseDashboardAnalyticsSnapshot(snap.data());
        if (!parsed) return;

        const apiAt = lastApiComputedAtRef.current;
        if (apiAt && parsed.computedAt <= apiAt) return;

        setData(parsed.data);
        setComputedAt(parsed.computedAt);
        setIsLoading(false);
        setIsStale(!apiAt);
        setError(null);
        hasDataRef.current = true;
      },
      () => {
        // Permission or network errors fall back to the API refresh below.
      },
    );

    void refresh({ silent: true });

    const interval = window.setInterval(() => {
      void refresh({ silent: true });
    }, POLL_INTERVAL_MS);

    const onFocus = () => {
      void refresh({ silent: true });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      unsubSnapshot();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return {
    data,
    isLoading,
    isRefreshing,
    isStale,
    error,
    computedAt,
    refresh,
  };
}

export type DashboardAnalyticsRefresh = (options?: {
  silent?: boolean;
}) => Promise<void>;
