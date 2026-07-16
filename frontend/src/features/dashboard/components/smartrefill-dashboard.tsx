"use client";

import { WorkspaceMapOwnersSection } from "@/features/dashboard/components/workspace-map-owners-section";
import { AppFeedbackPanel } from "@/features/dashboard/components/app-feedback-panel";
import { AiInsightsCard } from "@/features/dashboard/components/ai-insights-card";
import { PlatformSnapshotStrip } from "@/features/dashboard/components/platform-snapshot-strip";
import { PlatformAlertsList } from "@/features/dashboard/components/platform-alerts-list";
import { UserSubscriptionsList } from "@/features/dashboard/components/user-subscriptions-list";
import { CommunityDispatchQueue } from "@/features/dashboard/components/community-dispatch-queue";
import { CommunityDispatchMetricsStrip } from "@/features/dashboard/components/community-dispatch-metrics-strip";
import { CommunityChannelUsageStrip } from "@/features/dashboard/components/community-channel-usage-strip";
import { AppChartsGrid } from "@/features/dashboard/components/app-charts-grid";
import { DashboardInsightsForecastSection } from "@/features/dashboard/components/dashboard-insights-forecast-section";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  DashboardAnalyticsShell,
  useDashboardViewFilter,
} from "@/features/dashboard/components/dashboard-analytics-shell";
import { getDashboardApp } from "@/features/dashboard/config/dashboard-apps";
import { buildUserSubscriptionsList } from "@/features/dashboard/lib/build-user-subscriptions-list";
import type { DashboardViewContext } from "@/features/dashboard/components/dashboard-analytics-shell";

function SmartRefillDashboardContent({
  data,
  role,
  refresh,
}: DashboardViewContext) {
  const { globalFilter, setGlobalFilter } = useDashboardViewFilter();
  const canManageApprovals = role === "admin" || role === "manager";
  const showProductFeedback = role === "admin";
  const { growthSalesMetrics } = data;
  const app = getDashboardApp("smartrefill")!;
  const kpiCount = 6;
  const subscriptionItems = buildUserSubscriptionsList(
    growthSalesMetrics.activeOwners,
  );

  return (
    <>
      <DashboardSection id="smartrefill-stats" title="KPIs" count={kpiCount}>
        <PlatformSnapshotStrip
          data={data}
          topBusinessesByCustomers={data.topBusinessesByCustomers}
        />
      </DashboardSection>

      <DashboardSection
        id="smartrefill-alerts"
        title="Alerts"
        count={data.platformAlerts.items.length}
      >
        <PlatformAlertsList
          items={data.platformAlerts.items}
          counts={data.platformAlerts.counts}
        />
      </DashboardSection>

      <DashboardSection
        id="smartrefill-subscriptions"
        title="User subscriptions"
        count={subscriptionItems.length}
      >
        <UserSubscriptionsList
          owners={growthSalesMetrics.activeOwners}
          canApprove={canManageApprovals}
          onRefresh={refresh}
        />
      </DashboardSection>

      <DashboardSection id="smartrefill-map" title="Map & actions">
        {canManageApprovals ?
          <>
            <CommunityDispatchMetricsStrip metrics={data.communityDispatchMetrics} />
            <CommunityChannelUsageStrip usage={data.communityChannelUsage} />
            <CommunityDispatchQueue
              communityStations={data.businessLocations}
              onRefresh={refresh}
            />
          </>
        : null}
        <WorkspaceMapOwnersSection
          locations={data.businessLocations}
          owners={growthSalesMetrics.activeOwners}
          canApprove={canManageApprovals}
          onRefresh={refresh}
        />
      </DashboardSection>

      <AppChartsGrid
        appId="smartrefill"
        appLabel={app.shortLabel}
        data={data}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      <DashboardInsightsForecastSection
        appId="smartrefill"
        data={data}
        insights={
          <>
            <AiInsightsCard insights={data.aiSalesInsights} />
            {showProductFeedback ?
              <AppFeedbackPanel appFeedback={data.appFeedback} />
            : null}
          </>
        }
      />
    </>
  );
}

export function SmartRefillDashboard() {
  return (
    <DashboardAnalyticsShell>
      {(ctx) => <SmartRefillDashboardContent {...ctx} />}
    </DashboardAnalyticsShell>
  );
}
