"use client";

import { useState } from "react";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import { DashboardSegmentTabs } from "@/features/dashboard/components/dashboard-segment-tabs";
import { DashboardForecastPanel } from "@/features/dashboard/components/dashboard-forecast-panel";
import { TodaysWorkInbox } from "@/features/dashboard/components/todays-work-inbox";
import { SubscriptionApprovalQueue } from "@/features/dashboard/components/subscription-approval-queue";
import { forecastsForApp } from "@/features/dashboard/lib/forecast-items";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import type { DashboardAnalyticsRefresh } from "@/hooks/use-dashboard-analytics";

export function DashboardActionsForecastSection({
  data,
  refresh,
  showApprovals,
}: {
  data: DashboardAnalytics;
  refresh: DashboardAnalyticsRefresh;
  showApprovals: boolean;
}) {
  const [tab, setTab] = useState<"actions" | "forecast">("actions");
  const workCount = data.todaysWork?.length ?? 0;
  const forecasts = forecastsForApp(data.dashboardForecasts, "platform");
  const hasActions = workCount > 0 || showApprovals;

  if (!hasActions && forecasts.length === 0) return null;

  return (
    <DashboardSection id="platform-actions" title="Actions & forecast">
      <DashboardSegmentTabs
        activeId={tab}
        onChange={(id) => setTab(id as "actions" | "forecast")}
        tabs={[
          { id: "actions", label: "Actions", count: workCount },
          { id: "forecast", label: "Forecast", count: forecasts.length },
        ]}
      />
      {tab === "actions" ?
        <div className="space-y-3">
          <TodaysWorkInbox items={data.todaysWork ?? []} />
          {showApprovals ?
            <SubscriptionApprovalQueue
              owners={data.growthSalesMetrics.activeOwners}
              canApprove
              onRefresh={refresh}
            />
          : null}
          {!hasActions ?
            <p className="text-center text-sm text-[var(--muted-foreground)]">0</p>
          : null}
        </div>
      : <DashboardForecastPanel
          items={forecasts}
          aiEnabled={data.dashboardForecasts?.aiEnabled}
        />
      }
    </DashboardSection>
  );
}
