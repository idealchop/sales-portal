"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
import { usePagination } from "@/hooks/use-pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartBreakdownDialog } from "@/features/dashboard/components/chart-breakdown-dialog";
import { DateRangeFilter } from "@/features/dashboard/components/date-range-filter";
import { AccessibleChartFrame } from "@/components/charts/chart-accessible-frame";
import {
  BrowserMixChart,
  CustomerScaleChart,
  DeviceMixChart,
  FeatureRadarChart,
  HealthPieChart,
  LoginEngagementChart,
  MrrDonutChart,
  OwnerSignupAreaChart,
  PaymentRadialChart,
  ProposalPipelineChart,
  RevenueTrendChart,
  TransactionMixedChart,
  UsageGoalsChart,
  WorkspaceLineChart,
} from "@/features/dashboard/components/growth-chart-views";
import {
  buildGrowthChartInsights,
  type ChartInsight,
} from "@/features/dashboard/lib/build-growth-chart-insights";
import {
  DEFAULT_GLOBAL_FILTER,
  resolveGlobalDateRange,
  type DateRangeFilterState,
} from "@/features/dashboard/lib/date-range";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

const CHARTS_PAGE_SIZE = 6;

const CHART_TYPE_LABELS: Record<ChartInsight["kind"], string> = {
  "owner-growth": "Area",
  "workspace-growth": "Line",
  "login-activity": "Area + line",
  "transaction-volume": "Bar + line",
  "mrr-by-plan": "Donut",
  "feature-adoption": "Radar",
  "workspace-health": "Pie",
  "payment-status": "Radial",
  "device-mix": "Horizontal bar",
  "browser-mix": "Horizontal bar",
  "usage-goals": "Bar",
  "proposal-pipeline": "Stacked bar",
  "customer-scale": "Horizontal bar",
  "plan-distribution": "Pie",
  "adoption-gaps": "Radar",
  "revenue-trend": "Line",
  "login-sales-cadence": "Area + line",
  "new-logo-pipeline": "Line",
};

function ChartRenderer({ insight }: { insight: ChartInsight }) {
  switch (insight.kind) {
    case "owner-growth":
      return (
        <OwnerSignupAreaChart
          data={insight.chartData as { month?: string; date?: string; count: number }[]}
        />
      );
    case "workspace-growth":
      return (
        <WorkspaceLineChart
          data={insight.chartData as { month?: string; date?: string; count: number }[]}
        />
      );
    case "login-activity":
      return (
        <LoginEngagementChart
          data={
            insight.chartData as {
              date: string;
              sessions: number;
              uniqueUsers: number;
            }[]
          }
        />
      );
    case "transaction-volume":
      return (
        <TransactionMixedChart
          data={
            insight.chartData as {
              month?: string;
              date?: string;
              count: number;
              amount: number;
            }[]
          }
        />
      );
    case "mrr-by-plan":
      return (
        <MrrDonutChart
          data={
            insight.chartData as {
              name: string;
              count: number;
              mrr: number;
            }[]
          }
        />
      );
    case "feature-adoption":
      return (
        <FeatureRadarChart
          data={insight.chartData as { feature: string; rate: number }[]}
        />
      );
    case "workspace-health":
      return (
        <HealthPieChart
          data={insight.chartData as { name: string; count: number }[]}
        />
      );
    case "payment-status":
      return (
        <PaymentRadialChart
          data={insight.chartData as { name: string; count: number }[]}
        />
      );
    case "device-mix":
      return (
        <DeviceMixChart
          data={insight.chartData as { name: string; sessions: number }[]}
        />
      );
    case "browser-mix":
      return (
        <BrowserMixChart
          data={insight.chartData as { name: string; sessions: number }[]}
        />
      );
    case "usage-goals":
      return (
        <UsageGoalsChart
          data={insight.chartData as { goal: string; count: number }[]}
        />
      );
    case "proposal-pipeline":
      return (
        <ProposalPipelineChart
          data={
            insight.chartData as {
              status: string;
              count: number;
              value: number;
            }[]
          }
        />
      );
    case "customer-scale":
      return (
        <CustomerScaleChart
          data={insight.chartData as { name: string; customers: number }[]}
        />
      );
    case "plan-distribution":
      return (
        <HealthPieChart
          data={insight.chartData as { name: string; count: number }[]}
        />
      );
    case "adoption-gaps":
      return (
        <FeatureRadarChart
          data={insight.chartData as { feature: string; rate: number }[]}
        />
      );
    case "revenue-trend":
      return (
        <RevenueTrendChart
          data={insight.chartData as { date: string; amount: number }[]}
        />
      );
    case "login-sales-cadence":
      return (
        <LoginEngagementChart
          data={
            insight.chartData as {
              date: string;
              sessions: number;
              uniqueUsers: number;
            }[]
          }
        />
      );
    case "new-logo-pipeline":
      return (
        <WorkspaceLineChart
          data={insight.chartData as { month?: string; date?: string; count: number }[]}
        />
      );
    default:
      return null;
  }
}

function breakdownToAccessibleTable(
  breakdown: ChartInsight["breakdown"],
): { headers: string[]; rows: string[][] } {
  return {
    headers: ["Metric", "Value"],
    rows: breakdown.map((row) => [
      row.label,
      row.detail ? `${row.value} (${row.detail})` : row.value,
    ]),
  };
}

function ChartInsightCard({
  insight,
  onBreakdown,
}: {
  insight: ChartInsight;
  onBreakdown: (insight: ChartInsight) => void;
}) {
  return (
    <Card className="flex flex-col border-[var(--border)]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
            {insight.title}
          </CardTitle>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {CHART_TYPE_LABELS[insight.kind]}
          </span>
        </div>
        <CardDescription className="text-xs leading-relaxed">
          {insight.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pb-4">
        <AccessibleChartFrame
          title={insight.title}
          summary={`${insight.title}. ${insight.subtitle}`}
          {...breakdownToAccessibleTable(insight.breakdown)}
        >
          <ChartRenderer insight={insight} />
        </AccessibleChartFrame>
        <Button
          variant="ghost"
          size="sm"
          className="mt-auto h-8 w-full text-[var(--primary)]"
          onClick={() => onBreakdown(insight)}
        >
          View breakdown
        </Button>
      </CardContent>
    </Card>
  );
}

export function GrowthChartsSection({
  data,
  globalFilter: externalFilter,
  onGlobalFilterChange,
  insightFilter,
  title = "Growth & sales charts",
  description = "Area, line, mixed, donut, radar, pie, and bar views — all charts follow the global period filter.",
  pageSize = CHARTS_PAGE_SIZE,
  hideDateFilter = false,
  hideSectionHeader = false,
}: {
  data: DashboardAnalytics;
  globalFilter?: DateRangeFilterState;
  onGlobalFilterChange?: (value: DateRangeFilterState) => void;
  insightFilter?: (insights: ChartInsight[]) => ChartInsight[];
  title?: string;
  description?: string;
  pageSize?: number;
  hideDateFilter?: boolean;
  hideSectionHeader?: boolean;
}) {
  const [internalFilter, setInternalFilter] =
    useState<DateRangeFilterState>(DEFAULT_GLOBAL_FILTER);
  const globalFilter = externalFilter ?? internalFilter;
  const setGlobalFilter = onGlobalFilterChange ?? setInternalFilter;
  const [activeInsight, setActiveInsight] = useState<ChartInsight | null>(null);

  const globalRange = useMemo(
    () => resolveGlobalDateRange(globalFilter),
    [globalFilter],
  );

  const insights = useMemo(() => {
    const built = buildGrowthChartInsights(data, globalRange);
    return insightFilter ? insightFilter(built) : built;
  }, [data, globalRange, insightFilter]);

  const {
    paginatedItems: paginatedInsights,
    page: chartsPage,
    setPage: setChartsPage,
    totalPages: chartsTotalPages,
    totalItems: chartsTotalItems,
  } = usePagination(
    insights,
    pageSize,
    `${globalFilter.preset}-${insights.length}-${pageSize}`,
  );

  return (
    <>
      <section className="space-y-4">
        {!hideSectionHeader ?
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {title}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {description}
              </p>
            </div>
            <div className="min-w-0 lg:max-w-xl">
              {!externalFilter && !hideDateFilter ?
                <DateRangeFilter
                  variant="global"
                  value={globalFilter}
                  onChange={setGlobalFilter}
                />
              : null}
            </div>
          </div>
        : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginatedInsights.map((insight) => (
            <ChartInsightCard
              key={insight.id}
              insight={insight}
              onBreakdown={setActiveInsight}
            />
          ))}
        </div>
        <ListPagination
          page={chartsPage}
          totalPages={chartsTotalPages}
          totalItems={chartsTotalItems}
          pageSize={pageSize}
          onPageChange={setChartsPage}
        />
      </section>

      <ChartBreakdownDialog
        insight={activeInsight}
        data={data}
        onClose={() => setActiveInsight(null)}
      />
    </>
  );
}
