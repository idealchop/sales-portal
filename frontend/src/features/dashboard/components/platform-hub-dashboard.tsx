"use client";

import { CombinedAppsMapSection } from "@/features/dashboard/components/combined-apps-map-section";
import { HubAppStatsSection } from "@/features/dashboard/components/hub-app-stats-section";
import {
  buildHubAppStats,
  countHubLiveStats,
} from "@/features/dashboard/lib/build-hub-app-stats";
import { AppChartsGrid } from "@/features/dashboard/components/app-charts-grid";
import { RoiInsightsSection } from "@/features/dashboard/components/roi-insights-section";
import { DashboardActionsForecastSection } from "@/features/dashboard/components/dashboard-actions-forecast-section";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  DashboardAnalyticsShell,
  useDashboardViewFilter,
} from "@/features/dashboard/components/dashboard-analytics-shell";
import { getDashboardApp } from "@/features/dashboard/config/dashboard-apps";

function PlatformHubContent({
  data,
  role,
  refresh,
  isRefreshing,
}: {
  data: import("@/lib/dashboard/analytics").DashboardAnalytics;
  role: import("@/lib/auth-status").SalesPortalRole | undefined;
  refresh: import("@/hooks/use-dashboard-analytics").DashboardAnalyticsRefresh;
  isRefreshing: boolean;
}) {
  const { globalFilter, setGlobalFilter } = useDashboardViewFilter();
  const canManageApprovals = role === "admin" || role === "manager";
  const smartrefill = getDashboardApp("smartrefill")!;
  const salesPortal = getDashboardApp("sales-portal")!;
  const kpiCount = countHubLiveStats(buildHubAppStats(data));

  return (
    <>
      <DashboardSection id="platform-stats" title="KPIs" count={kpiCount}>
        <HubAppStatsSection data={data} />
      </DashboardSection>

      <DashboardActionsForecastSection
        data={data}
        refresh={refresh}
        showApprovals={canManageApprovals}
      />

      <CombinedAppsMapSection
        data={data}
        onRefresh={() => void refresh()}
        isRefreshing={isRefreshing}
      />

      <AppChartsGrid
        appId="smartrefill"
        appLabel={smartrefill.shortLabel}
        data={data}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      <AppChartsGrid
        appId="sales-portal"
        appLabel={salesPortal.shortLabel}
        data={data}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      <RoiInsightsSection data={data} />
    </>
  );
}

export function PlatformHubDashboard() {
  return (
    <DashboardAnalyticsShell>
      {(ctx) => <PlatformHubContent {...ctx} />}
    </DashboardAnalyticsShell>
  );
}
