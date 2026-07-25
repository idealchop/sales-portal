"use client";

import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import type { DashboardAnalyticsRefresh } from "@/hooks/use-dashboard-analytics";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

type DashboardAnalyticsContextValue = {
  data: DashboardAnalytics | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  error: string | null;
  computedAt: string | null;
  refresh: DashboardAnalyticsRefresh;
  setData: Dispatch<SetStateAction<DashboardAnalytics | null>>;
};

const DashboardAnalyticsContext =
  createContext<DashboardAnalyticsContextValue | null>(null);

export function DashboardAnalyticsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useDashboardAnalytics();
  return (
    <DashboardAnalyticsContext.Provider value={value}>
      {children}
    </DashboardAnalyticsContext.Provider>
  );
}

export function useDashboardAnalyticsContext(): DashboardAnalyticsContextValue {
  const value = useContext(DashboardAnalyticsContext);
  if (!value) {
    throw new Error(
      "useDashboardAnalyticsContext must be used within DashboardAnalyticsProvider",
    );
  }
  return value;
}

export function useOptionalDashboardAnalyticsContext() {
  return useContext(DashboardAnalyticsContext);
}
