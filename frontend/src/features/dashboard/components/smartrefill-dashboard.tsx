"use client";

import { WorkspaceMapOwnersSection } from "@/features/dashboard/components/workspace-map-owners-section";
import { AppFeedbackPanel } from "@/features/dashboard/components/app-feedback-panel";
import { MetricCardsGrid } from "@/features/dashboard/components/metric-cards-grid";
import { AiInsightsCard } from "@/features/dashboard/components/ai-insights-card";
import { ProductSignalsStrip } from "@/features/dashboard/components/product-signals-strip";
import { PlatformSnapshotStrip } from "@/features/dashboard/components/platform-snapshot-strip";
import { SubscriptionApprovalQueue } from "@/features/dashboard/components/subscription-approval-queue";
import { AppChartsGrid } from "@/features/dashboard/components/app-charts-grid";
import { DashboardInsightsForecastSection } from "@/features/dashboard/components/dashboard-insights-forecast-section";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  DashboardAnalyticsShell,
  useDashboardViewFilter,
} from "@/features/dashboard/components/dashboard-analytics-shell";
import { getDashboardApp } from "@/features/dashboard/config/dashboard-apps";
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
  const isLead = role === "admin" || role === "manager";
  const kpiCount =
    9 +
    (isLead ? 4 : 0) +
    growthSalesMetrics.growth.length +
    growthSalesMetrics.sales.length;

  return (
    <>
      <DashboardSection id="smartrefill-stats" title="KPIs" count={kpiCount}>
        <PlatformSnapshotStrip
          summary={data.summary}
          salesInsights={data.salesInsights}
          topBusinessesByCustomers={data.topBusinessesByCustomers}
        />
        {isLead ?
          <ProductSignalsStrip data={data} />
        : null}
        <MetricCardsGrid metrics={growthSalesMetrics.growth} compact />
        <MetricCardsGrid metrics={growthSalesMetrics.sales} compact />
      </DashboardSection>

      <DashboardSection id="smartrefill-map" title="Map & actions">
        {canManageApprovals ?
          <SubscriptionApprovalQueue
            owners={growthSalesMetrics.activeOwners}
            canApprove
            onRefresh={refresh}
          />
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
