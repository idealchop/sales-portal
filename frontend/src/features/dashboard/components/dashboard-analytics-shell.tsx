"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { DashboardAppNav } from "@/features/dashboard/components/dashboard-app-nav";
import {
  DashboardDateFilterProvider,
  useDashboardDateFilter,
} from "@/features/dashboard/components/dashboard-date-filter-context";
import { DashboardGlobalDateFilter } from "@/features/dashboard/components/dashboard-global-date-filter";
import { useDashboardAnalyticsContext } from "@/features/dashboard/components/dashboard-analytics-context";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import type { DashboardAnalyticsRefresh } from "@/hooks/use-dashboard-analytics";
import type { SalesPortalRole } from "@/lib/auth-status";

export type DashboardViewContext = {
  data: DashboardAnalytics;
  role: SalesPortalRole | undefined;
  refresh: DashboardAnalyticsRefresh;
  isRefreshing: boolean;
  computedAt: string | null;
};

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl bg-zinc-200" />
      ))}
    </div>
  );
}

function DashboardAnalyticsShellContent({
  children,
}: {
  children: (ctx: DashboardViewContext) => ReactNode;
}) {
  const { profile } = useSalesProfile();
  const { data, isLoading, isRefreshing, isStale, error, computedAt, refresh } =
    useDashboardAnalyticsContext();

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <MetricsSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-8 text-center text-sm text-red-800">
          {error || "Analytics unavailable."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DashboardAppNav />

      {(isStale || isRefreshing) && (
        <p className="text-xs text-zinc-500">
          {isRefreshing ?
            "Refreshing platform analytics…"
          : "Showing cached analytics — fetching latest…"}
        </p>
      )}

      <DashboardGlobalDateFilter />

      {children({
        data,
        role: profile?.role,
        refresh,
        isRefreshing,
        computedAt,
      })}
    </div>
  );
}

export function DashboardAnalyticsShell({
  children,
}: {
  children: (ctx: DashboardViewContext) => ReactNode;
}) {
  return (
    <DashboardDateFilterProvider>
      <DashboardAnalyticsShellContent>{children}</DashboardAnalyticsShellContent>
    </DashboardDateFilterProvider>
  );
}

export function useDashboardViewFilter() {
  return useDashboardDateFilter();
}
