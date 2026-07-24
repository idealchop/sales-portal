"use client";

import { CombinedAppsMapSection } from "@/features/dashboard/components/combined-apps-map-section";
import { PlatformAppsOverview } from "@/features/dashboard/components/platform-apps-overview";
import {
  buildHubAppStats,
  countHubLiveStats,
} from "@/features/dashboard/lib/build-hub-app-stats";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import { DashboardAnalyticsShell } from "@/features/dashboard/components/dashboard-analytics-shell";

function PlatformHubContent({
  data,
}: {
  data: import("@/lib/dashboard/analytics").DashboardAnalytics;
}) {
  const kpiCount = countHubLiveStats(buildHubAppStats(data));

  return (
    <DashboardSection
      id="platform-stats"
      title="How apps are performing"
      description="All-app KPIs and a short read on performance. Open an app for deeper sales work."
      count={kpiCount}
    >
      <PlatformAppsOverview data={data} />
    </DashboardSection>
  );
}

export function PlatformHubDashboard() {
  return (
    <DashboardAnalyticsShell>
      {(ctx) => <PlatformHubContent data={ctx.data} />}
    </DashboardAnalyticsShell>
  );
}
