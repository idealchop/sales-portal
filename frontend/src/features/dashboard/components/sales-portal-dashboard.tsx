"use client";

import Link from "next/link";
import { SalesMarketPositionSection } from "@/features/dashboard/components/sales-market-position-section";
import { SalesProactiveScoreboard } from "@/features/dashboard/components/sales-market-position-section";
import { PersonalSalesStrip } from "@/features/dashboard/components/personal-sales-strip";
import { PipelineStageStrip } from "@/features/dashboard/components/pipeline-stage-strip";
import { SalesInsightsPanel } from "@/features/dashboard/components/sales-insights-panel";
import { AppChartsGrid } from "@/features/dashboard/components/app-charts-grid";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  DashboardAnalyticsShell,
  useDashboardViewFilter,
} from "@/features/dashboard/components/dashboard-analytics-shell";
import { buildSalesMarketReport } from "@/features/dashboard/lib/build-sales-market-report";
import type { DashboardViewContext } from "@/features/dashboard/components/dashboard-analytics-shell";

function SalesPortalDashboardContent({ data }: DashboardViewContext) {
  const { globalFilter, setGlobalFilter } = useDashboardViewFilter();
  const report = buildSalesMarketReport(data, globalFilter);

  return (
    <>
      <DashboardSection
        id="sales-market-position"
        title="App market position"
        description="Where Smart Refill stands in the installed base — share, health, traction, and growth. Each KPI shows trend vs the ideal for the selected date filter."
        action={
          <Link
            href="/dashboard/smartrefill"
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            Open SmartRefill detail →
          </Link>
        }
      >
        <SalesMarketPositionSection
          metrics={report.marketPosition}
          planMix={report.planMix}
          rangeLabel={report.rangeLabel}
        />
      </DashboardSection>

      <DashboardSection
        id="sales-proactive"
        title="Proactive sales outlook"
        description="Forward-looking value: projected wins, expansion upside, and coverage — not just open tickets."
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/proposals"
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Proposals →
            </Link>
            <Link
              href="/dashboard/commissions"
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Commissions →
            </Link>
          </div>
        }
      >
        <SalesProactiveScoreboard metrics={report.proactive} />
      </DashboardSection>

      <DashboardSection
        id="sales-scorecard"
        title="Sales scorecard"
        description="Your pipeline stages and earnings — the numbers that feed weekly sales reports."
      >
        <div className="space-y-3">
          <PersonalSalesStrip
            personalSales={data.personalSales!}
            analyticsScope={data.analyticsScope}
          />
          <PipelineStageStrip proposalPipeline={data.proposalPipeline} />
        </div>
      </DashboardSection>

      <AppChartsGrid
        appId="sales-portal"
        title="Sales reports"
        description="MRR by plan, plan mix, revenue trend, pipeline, and health — ready for status updates."
        data={data}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      <DashboardSection
        id="sales-account-signals"
        title="Account signals"
        description="Optional detail when you need names behind the upgrade and health numbers."
        count={data.salesInsights.salesActions.length}
      >
        <SalesInsightsPanel
          salesInsights={data.salesInsights}
          proposalPipeline={data.proposalPipeline}
          embedded
          hideStatCards
        />
      </DashboardSection>
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
