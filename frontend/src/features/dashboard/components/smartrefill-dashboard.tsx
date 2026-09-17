"use client";

import { useMemo, useState } from "react";
import { PlatformSnapshotStrip } from "@/features/dashboard/components/platform-snapshot-strip";
import { UserSubscriptionsList } from "@/features/dashboard/components/user-subscriptions-list";
import { AppChartsGrid } from "@/features/dashboard/components/app-charts-grid";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  DashboardSegmentTabs,
  type DashboardSegmentTab,
} from "@/features/dashboard/components/dashboard-segment-tabs";
import { ProductSignalsStrip } from "@/features/dashboard/components/product-signals-strip";
import { SmartRefillMaintenanceSignals } from "@/features/dashboard/components/smartrefill-maintenance-signals";
import { SmartRefillConfigPanel } from "@/features/dashboard/components/smartrefill-config-panel";
import {
  DashboardAnalyticsShell,
  useDashboardViewFilter,
} from "@/features/dashboard/components/dashboard-analytics-shell";
import { DashboardGlobalDateFilter } from "@/features/dashboard/components/dashboard-global-date-filter";
import { getDashboardApp } from "@/features/dashboard/config/dashboard-apps";
import { buildUserSubscriptionsList } from "@/features/dashboard/lib/build-user-subscriptions-list";
import { chartKindsForApp } from "@/features/dashboard/lib/app-chart-groups";
import type { DashboardViewContext } from "@/features/dashboard/components/dashboard-analytics-shell";

type SmartRefillTab = "subscriptions" | "analytics" | "config";

function SmartRefillDashboardContent({
  data,
  role,
  refresh,
}: DashboardViewContext) {
  const { globalFilter, setGlobalFilter } = useDashboardViewFilter();
  const canManageApprovals = role === "admin" || role === "manager";
  const canManageConfig = role === "admin";
  const { growthSalesMetrics } = data;
  const app = getDashboardApp("smartrefill")!;
  const chartCount = chartKindsForApp("smartrefill").length;

  const [tab, setTab] = useState<SmartRefillTab>("analytics");

  const subscriptionItems = buildUserSubscriptionsList(
    growthSalesMetrics.activeOwners,
  );

  const tabs: DashboardSegmentTab[] = useMemo(
    () => [
      { id: "analytics", label: "Analytics", count: 3 + chartCount },
      {
        id: "subscriptions",
        label: "Subscriptions",
        count: subscriptionItems.length,
      },
      ...(canManageConfig ?
        [{ id: "config", label: "Config" }]
      : []),
    ],
    [subscriptionItems.length, canManageConfig, chartCount],
  );

  return (
    <>
      <div className="sticky top-0 z-10 -mx-1 space-y-3 bg-[var(--background)]/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            SmartRefill ops
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Subscriptions, product health, and admin configuration.
          </p>
        </div>
        <DashboardSegmentTabs
          tabs={tabs}
          activeId={tab}
          onChange={(id) => setTab(id as SmartRefillTab)}
        />
      </div>

      {tab === "subscriptions" ?
        <DashboardSection
          id="smartrefill-subscriptions"
          title="User subscriptions"
          description="Approve plans, print receipts, and review billing status."
          count={subscriptionItems.length}
        >
          <UserSubscriptionsList
            owners={growthSalesMetrics.activeOwners}
            canApprove={canManageApprovals}
            onRefresh={refresh}
          />
        </DashboardSection>
      : null}

      {tab === "analytics" ?
        <div className="space-y-6">
          <DashboardSection
            id="smartrefill-stats"
            title="Platform KPIs"
            description="Core SmartRefill scale and inventory."
            count={6}
          >
            <PlatformSnapshotStrip
              data={data}
              topBusinessesByCustomers={data.topBusinessesByCustomers}
            />
          </DashboardSection>

          <DashboardGlobalDateFilter />

          <DashboardSection
            id="smartrefill-product-signals"
            title="Product signals"
            description="Setup depth, engagement, and 30-day user retention."
          >
            <ProductSignalsStrip data={data} />
          </DashboardSection>

          <DashboardSection
            id="smartrefill-maintenance"
            title="Maintenance signals"
            description="Health and payment mix for proactive support."
          >
            <SmartRefillMaintenanceSignals salesInsights={data.salesInsights} />
          </DashboardSection>

          <AppChartsGrid
            appId="smartrefill"
            appLabel={app.shortLabel}
            data={data}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
          />
        </div>
      : null}

      {tab === "config" && canManageConfig ?
        <DashboardSection
          id="smartrefill-config"
          title="Configuration"
          description="SmartRefill app settings for admins."
        >
          <SmartRefillConfigPanel />
        </DashboardSection>
      : null}
    </>
  );
}

export function SmartRefillDashboard() {
  return (
    <DashboardAnalyticsShell showGlobalDateFilter={false}>
      {(ctx) => <SmartRefillDashboardContent {...ctx} />}
    </DashboardAnalyticsShell>
  );
}
