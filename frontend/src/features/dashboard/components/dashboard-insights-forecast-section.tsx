"use client";

import { useState, type ReactNode } from "react";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import { DashboardSegmentTabs } from "@/features/dashboard/components/dashboard-segment-tabs";
import { DashboardForecastPanel } from "@/features/dashboard/components/dashboard-forecast-panel";
import { forecastsForApp } from "@/features/dashboard/lib/forecast-items";
import type { DashboardAppId } from "@/features/dashboard/config/dashboard-apps";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

export function DashboardInsightsForecastSection({
  appId,
  data,
  insights,
  insightCount,
}: {
  appId: DashboardAppId;
  data: DashboardAnalytics;
  insights: ReactNode;
  insightCount?: number;
}) {
  const [tab, setTab] = useState<"insights" | "forecast">("insights");
  const forecasts = forecastsForApp(data.dashboardForecasts, appId);
  const accounts =
    insightCount ??
    data.aiSalesInsights.priorityActions.length +
      data.aiSalesInsights.growthOpportunities.length;

  return (
    <DashboardSection id={`${appId}-insights`} title="Insights & forecast">
      <DashboardSegmentTabs
        activeId={tab}
        onChange={(id) => setTab(id as "insights" | "forecast")}
        tabs={[
          { id: "insights", label: "Insights", count: accounts },
          { id: "forecast", label: "Forecast", count: forecasts.length },
        ]}
      />
      {tab === "insights" ?
        <div className="space-y-3">{insights}</div>
      : <DashboardForecastPanel
          items={forecasts}
          aiEnabled={data.dashboardForecasts?.aiEnabled}
        />
      }
    </DashboardSection>
  );
}
