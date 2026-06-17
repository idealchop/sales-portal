"use client";

import { PersonalSalesStrip } from "@/features/dashboard/components/personal-sales-strip";
import { PipelineStageStrip } from "@/features/dashboard/components/pipeline-stage-strip";
import { SalesKpiStrip } from "@/features/dashboard/components/sales-kpi-strip";
import { SalesPortalActionsJoinersSection } from "@/features/dashboard/components/sales-portal-actions-joiners-section";
import { SalesInsightsPanel } from "@/features/dashboard/components/sales-insights-panel";
import { AiInsightsCard } from "@/features/dashboard/components/ai-insights-card";
import { AppChartsGrid } from "@/features/dashboard/components/app-charts-grid";
import { DashboardInsightsForecastSection } from "@/features/dashboard/components/dashboard-insights-forecast-section";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  DashboardAnalyticsShell,
  useDashboardViewFilter,
} from "@/features/dashboard/components/dashboard-analytics-shell";
import { getDashboardApp } from "@/features/dashboard/config/dashboard-apps";
import type { DashboardViewContext } from "@/features/dashboard/components/dashboard-analytics-shell";

function SalesPortalDashboardContent({
  data,
  role,
  refresh,
}: DashboardViewContext) {
  const { globalFilter, setGlobalFilter } = useDashboardViewFilter();
  const app = getDashboardApp("sales-portal")!;
  const kpiCount = 6 + 6 + 4;

  return (
    <>
      <DashboardSection id="sales-portal-stats" title="KPIs" count={kpiCount}>
        <PersonalSalesStrip
          personalSales={data.personalSales!}
          analyticsScope={data.analyticsScope}
        />
        <SalesKpiStrip salesInsights={data.salesInsights} />
        <PipelineStageStrip proposalPipeline={data.proposalPipeline} />
        <SalesInsightsPanel
          salesInsights={data.salesInsights}
          proposalPipeline={data.proposalPipeline}
          embedded
          hideStatCards
        />
      </DashboardSection>

      <SalesPortalActionsJoinersSection
        data={data}
        role={role}
        refresh={refresh}
      />

      <AppChartsGrid
        appId="sales-portal"
        appLabel={app.shortLabel}
        data={data}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      <DashboardInsightsForecastSection
        appId="sales-portal"
        data={data}
        insights={<AiInsightsCard insights={data.aiSalesInsights} />}
      />
    </>
  );
}

export function SalesPortalDashboard() {
  return (
    <DashboardAnalyticsShell>
      {(ctx) => <SalesPortalDashboardContent {...ctx} />}
    </DashboardAnalyticsShell>
  );
}
