"use client";

import { WorkspaceMapOwnersSection } from "@/features/dashboard/components/workspace-map-owners-section";
import { AppFeedbackPanel } from "@/features/dashboard/components/app-feedback-panel";
import { GrowthChartsSection } from "@/features/dashboard/components/growth-charts-section";
import { MetricCardsGrid } from "@/features/dashboard/components/metric-cards-grid";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import { useSalesProfile } from "@/hooks/use-sales-profile";

export function DashboardHome() {
  const { profile } = useSalesProfile();
  const { data, isLoading, error, refresh } = useDashboardAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-zinc-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-zinc-200" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-[520px] animate-pulse rounded-xl bg-zinc-200" />
          <div className="h-[520px] animate-pulse rounded-xl bg-zinc-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-8 text-center text-sm text-red-800">
          {error || "Analytics unavailable."}
        </CardContent>
      </Card>
    );
  }

  const { growthSalesMetrics } = data;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          SmartRefill Analytics
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Welcome back, {profile?.displayName || "there"}. Growth, sales, and
          active owners.
        </p>
      </div>

      <MetricCardsGrid
        title="Potential growth"
        description="Where SmartRefill can grow."
        metrics={growthSalesMetrics.growth}
      />

      <MetricCardsGrid
        title="Potential sales now"
        description="Accounts to call — risk, upsell, and activity."
        metrics={growthSalesMetrics.sales}
      />

      <WorkspaceMapOwnersSection
        locations={data.businessLocations}
        owners={growthSalesMetrics.activeOwners}
        canApprove={profile?.role === "admin" || profile?.role === "manager"}
        onRefresh={refresh}
      />

      <AppFeedbackPanel appFeedback={data.appFeedback} />

      <GrowthChartsSection data={data} />
    </div>
  );
}
