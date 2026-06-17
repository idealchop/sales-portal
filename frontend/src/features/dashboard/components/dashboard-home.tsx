"use client";

import dynamic from "next/dynamic";
import { WorkspaceMapOwnersSection } from "@/features/dashboard/components/workspace-map-owners-section";
import { AppFeedbackPanel } from "@/features/dashboard/components/app-feedback-panel";
import { MetricCardsGrid } from "@/features/dashboard/components/metric-cards-grid";
import { SalesInsightsPanel } from "@/features/dashboard/components/sales-insights-panel";
import { AiInsightsCard } from "@/features/dashboard/components/ai-insights-card";
import { NewJoinersPanel } from "@/features/dashboard/components/new-joiners-panel";
import { SubscriptionApprovalQueue } from "@/features/dashboard/components/subscription-approval-queue";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import { useSalesProfile } from "@/hooks/use-sales-profile";

const GrowthChartsSection = dynamic(
  () =>
    import("@/features/dashboard/components/growth-charts-section").then(
      (mod) => mod.GrowthChartsSection,
    ),
  {
    loading: () => (
      <div className="h-[420px] animate-pulse rounded-xl bg-zinc-200" />
    ),
  },
);

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl bg-zinc-200" />
      ))}
    </div>
  );
}

export function DashboardHome() {
  const { profile } = useSalesProfile();
  const { data, isLoading, isRefreshing, error, refresh } = useDashboardAnalytics();

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-zinc-200" />
        <MetricsSkeleton />
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Platform Analytics
          </h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Welcome back, {profile?.displayName || "there"}. SmartRefill growth,
            sales signals, and active owners.
          </p>
        </div>
        {isRefreshing ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            Refreshing analytics…
          </p>
        ) : null}
      </div>

      <MetricCardsGrid
        title="Potential growth"
        description="Where SmartRefill can grow on the platform."
        metrics={growthSalesMetrics.growth}
      />

      <MetricCardsGrid
        title="Potential sales now"
        description="Accounts to call — risk, upsell, and activity."
        metrics={growthSalesMetrics.sales}
      />

      <AiInsightsCard insights={data.aiSalesInsights} />

      <NewJoinersPanel newJoiners={data.newJoiners} role={profile?.role} />

      <SalesInsightsPanel
        salesInsights={data.salesInsights}
        proposalPipeline={data.proposalPipeline}
      />

      <SubscriptionApprovalQueue
        owners={growthSalesMetrics.activeOwners}
        canApprove={profile?.role === "admin" || profile?.role === "manager"}
        onRefresh={refresh}
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
