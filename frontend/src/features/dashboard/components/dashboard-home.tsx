"use client";

import dynamic from "next/dynamic";
import { WorkspaceMapOwnersSection } from "@/features/dashboard/components/workspace-map-owners-section";
import { AppFeedbackPanel } from "@/features/dashboard/components/app-feedback-panel";
import { MetricCardsGrid } from "@/features/dashboard/components/metric-cards-grid";
import { SalesInsightsPanel } from "@/features/dashboard/components/sales-insights-panel";
import { AiInsightsCard } from "@/features/dashboard/components/ai-insights-card";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import {
  DashboardDateFilterProvider,
  useDashboardDateFilter,
} from "@/features/dashboard/components/dashboard-date-filter-context";
import { DashboardGlobalDateFilter } from "@/features/dashboard/components/dashboard-global-date-filter";
import { NewJoinersPanel } from "@/features/dashboard/components/new-joiners-panel";
import { PersonalSalesStrip } from "@/features/dashboard/components/personal-sales-strip";
import { PlatformSnapshotStrip } from "@/features/dashboard/components/platform-snapshot-strip";
import { TodaysWorkInbox } from "@/features/dashboard/components/todays-work-inbox";
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
  return (
    <DashboardDateFilterProvider>
      <DashboardHomeContent />
    </DashboardDateFilterProvider>
  );
}

function DashboardHomeContent() {
  const { globalFilter, setGlobalFilter } = useDashboardDateFilter();
  const { profile } = useSalesProfile();
  const { data, isLoading, isRefreshing, error, computedAt, refresh } =
    useDashboardAnalytics();

  const role = profile?.role;
  const canManageApprovals = role === "admin" || role === "manager";
  const showProductFeedback = role === "admin";

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
      <DashboardHeader
        displayName={profile?.displayName}
        role={role}
        computedAt={computedAt}
        isRefreshing={isRefreshing}
        onRefresh={() => void refresh()}
      />

      <DashboardGlobalDateFilter />

      <PersonalSalesStrip
        personalSales={data.personalSales!}
        analyticsScope={data.analyticsScope}
      />

      <TodaysWorkInbox items={data.todaysWork ?? []} />

      {role === "admin" || role === "manager" ?
        <PlatformSnapshotStrip
          summary={data.summary}
          salesInsights={data.salesInsights}
          topBusinessesByCustomers={data.topBusinessesByCustomers}
        />
      : null}

      {canManageApprovals ?
        <SubscriptionApprovalQueue
          owners={growthSalesMetrics.activeOwners}
          canApprove
          onRefresh={refresh}
        />
      : null}

      <SalesInsightsPanel
        salesInsights={data.salesInsights}
        proposalPipeline={data.proposalPipeline}
      />

      <AiInsightsCard insights={data.aiSalesInsights} />

      <MetricCardsGrid
        title="Growth opportunities"
        description="Where SmartRefill can expand — users, devices, conversion, and team upside. Rolling 30-day signals."
        metrics={growthSalesMetrics.growth}
      />

      <MetricCardsGrid
        title="Accounts to work now"
        description="Revenue risk, upsell potential, re-engagement, and ranked call list. Rolling 30-day signals."
        metrics={growthSalesMetrics.sales}
      />

      <NewJoinersPanel
        newJoiners={data.newJoiners}
        role={role}
        onRevoked={refresh}
      />

      <WorkspaceMapOwnersSection
        locations={data.businessLocations}
        owners={growthSalesMetrics.activeOwners}
        canApprove={canManageApprovals}
        onRefresh={refresh}
      />

      {showProductFeedback ?
        <AppFeedbackPanel appFeedback={data.appFeedback} />
      : null}

      <GrowthChartsSection
        data={data}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}
