"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import {
  chartKindsForApp,
} from "@/features/dashboard/lib/app-chart-groups";
import type { DashboardAppId } from "@/features/dashboard/config/dashboard-apps";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import type { DateRangeFilterState } from "@/features/dashboard/lib/date-range";
import type { ChartInsight } from "@/features/dashboard/lib/build-growth-chart-insights";

const GrowthChartsSection = dynamic(
  () =>
    import("@/features/dashboard/components/growth-charts-section").then(
      (mod) => mod.GrowthChartsSection,
    ),
  { loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-zinc-200" /> },
);

export function AppChartsGrid({
  appId,
  appLabel,
  data,
  globalFilter,
  onGlobalFilterChange,
}: {
  appId: DashboardAppId;
  appLabel?: string;
  data: DashboardAnalytics;
  globalFilter: DateRangeFilterState;
  onGlobalFilterChange?: (value: DateRangeFilterState) => void;
}) {
  const kinds = chartKindsForApp(appId);

  const insightFilter = useCallback(
    (insights: ChartInsight[]) => {
      const allowed = new Set(kinds);
      return insights.filter((insight) => allowed.has(insight.kind));
    },
    [kinds],
  );

  if (kinds.length === 0) return null;

  const sectionTitle = appLabel ? `${appLabel} charts` : "Charts";

  return (
    <DashboardSection
      id={`${appId}-charts`}
      title={sectionTitle}
      count={kinds.length}
    >
      <GrowthChartsSection
        data={data}
        globalFilter={globalFilter}
        onGlobalFilterChange={onGlobalFilterChange}
        insightFilter={insightFilter}
        title=""
        description=""
        pageSize={6}
        hideDateFilter
        hideSectionHeader
      />
    </DashboardSection>
  );
}
