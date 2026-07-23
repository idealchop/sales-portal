"use client";

import { useEffect, useMemo, useState } from "react";
import { WorkspaceMapOwnersSection } from "@/features/dashboard/components/workspace-map-owners-section";
import { ActiveOwnersPanel } from "@/features/dashboard/components/active-owners-panel";
import { PlatformSnapshotStrip } from "@/features/dashboard/components/platform-snapshot-strip";
import { PlatformAlertsList } from "@/features/dashboard/components/platform-alerts-list";
import { UserSubscriptionsList } from "@/features/dashboard/components/user-subscriptions-list";
import { CommunityDispatchQueue } from "@/features/dashboard/components/community-dispatch-queue";
import { CommunityDispatchMetricsStrip } from "@/features/dashboard/components/community-dispatch-metrics-strip";
import { CommunityChannelUsageStrip } from "@/features/dashboard/components/community-channel-usage-strip";
import { AppChartsGrid } from "@/features/dashboard/components/app-charts-grid";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  DashboardSegmentTabs,
  type DashboardSegmentTab,
} from "@/features/dashboard/components/dashboard-segment-tabs";
import { ProductSignalsStrip } from "@/features/dashboard/components/product-signals-strip";
import { SmartRefillOpsHealthStrip } from "@/features/dashboard/components/smartrefill-ops-health-strip";
import { SmartRefillMaintenanceSignals } from "@/features/dashboard/components/smartrefill-maintenance-signals";
import {
  DashboardAnalyticsShell,
  useDashboardViewFilter,
} from "@/features/dashboard/components/dashboard-analytics-shell";
import { getDashboardApp } from "@/features/dashboard/config/dashboard-apps";
import { buildUserSubscriptionsList } from "@/features/dashboard/lib/build-user-subscriptions-list";
import { filterInactiveOwners } from "@/features/dashboard/lib/sort-active-owners";
import type { DashboardViewContext } from "@/features/dashboard/components/dashboard-analytics-shell";

type SmartRefillTab = "attention" | "subscriptions" | "field" | "analytics";

function SmartRefillDashboardContent({
  data,
  role,
  refresh,
}: DashboardViewContext) {
  const { globalFilter, setGlobalFilter } = useDashboardViewFilter();
  const canManageApprovals = role === "admin" || role === "manager";
  const { growthSalesMetrics } = data;
  const app = getDashboardApp("smartrefill")!;

  const [tab, setTab] = useState<SmartRefillTab>("attention");
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);

  const subscriptionItems = buildUserSubscriptionsList(
    growthSalesMetrics.activeOwners,
  );
  const inactiveOwnerCount = filterInactiveOwners(
    growthSalesMetrics.activeOwners,
  ).length;
  const pendingApprovals = growthSalesMetrics.activeOwners.reduce(
    (sum, owner) => sum + (owner.pendingApprovals ?? 0),
    0,
  );
  const attentionCount =
    data.platformAlerts.items.length + inactiveOwnerCount;

  const tabs: DashboardSegmentTab[] = useMemo(
    () => [
      { id: "attention", label: "Attention", count: attentionCount },
      {
        id: "subscriptions",
        label: "Subscriptions",
        count: subscriptionItems.length,
      },
      {
        id: "field",
        label: "Field ops",
        count: data.businessLocations.length,
      },
      { id: "analytics", label: "Analytics", count: 6 },
    ],
    [
      attentionCount,
      subscriptionItems.length,
      data.businessLocations.length,
    ],
  );

  useEffect(() => {
    if (!pendingAnchor) return;
    const node = document.getElementById(pendingAnchor);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingAnchor(null);
    }
  }, [tab, pendingAnchor]);

  function jumpTo(nextTab: string, anchorId?: string) {
    setTab(nextTab as SmartRefillTab);
    if (anchorId) setPendingAnchor(anchorId);
  }

  return (
    <>
      <div className="sticky top-0 z-10 -mx-1 space-y-3 bg-[var(--background)]/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            SmartRefill ops
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Support queues, subscriptions, field coverage, and product health —
            organized for day-to-day admin work.
          </p>
        </div>
        <DashboardSegmentTabs
          tabs={tabs}
          activeId={tab}
          onChange={(id) => setTab(id as SmartRefillTab)}
        />
      </div>

      {tab === "attention" ?
        <div className="space-y-6">
          <DashboardSection
            id="smartrefill-ops-health"
            title="Ops health"
            description="What needs a human touch today."
            count={attentionCount}
          >
            <SmartRefillOpsHealthStrip data={data} onJump={jumpTo} />
          </DashboardSection>

          <DashboardSection
            id="smartrefill-alerts"
            title="Alerts"
            description="Demo inquiries, new registrations, and subscription risk."
            count={data.platformAlerts.items.length}
          >
            <PlatformAlertsList
              items={data.platformAlerts.items}
              counts={data.platformAlerts.counts}
            />
          </DashboardSection>

          <DashboardSection
            id="smartrefill-inactive"
            title="Inactive owners"
            description="Re-engage stations with no login in 7+ days."
            count={inactiveOwnerCount}
          >
            <ActiveOwnersPanel
              owners={growthSalesMetrics.activeOwners}
              canApprove={canManageApprovals}
              onRefresh={refresh}
            />
          </DashboardSection>

          {pendingApprovals > 0 ?
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {pendingApprovals} subscription
              {pendingApprovals === 1 ? "" : "s"} waiting for approval — open the{" "}
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => jumpTo("subscriptions")}
              >
                Subscriptions
              </button>{" "}
              tab.
            </p>
          : null}
        </div>
      : null}

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

      {tab === "field" ?
        <div className="space-y-6">
          {canManageApprovals ?
            <DashboardSection
              id="smartrefill-community"
              title="Community dispatch"
              description="Queue and channel usage for on-ground support."
            >
              <div className="space-y-3">
                <CommunityDispatchMetricsStrip
                  metrics={data.communityDispatchMetrics}
                />
                <CommunityChannelUsageStrip usage={data.communityChannelUsage} />
                <CommunityDispatchQueue
                  communityStations={data.businessLocations}
                  onRefresh={refresh}
                />
              </div>
            </DashboardSection>
          : null}

          <DashboardSection
            id="smartrefill-map"
            title="Station map"
            description="Geographic footprint for outreach and coverage."
            count={data.businessLocations.length}
          >
            <WorkspaceMapOwnersSection
              locations={data.businessLocations}
              owners={growthSalesMetrics.activeOwners}
              canApprove={canManageApprovals}
              onRefresh={refresh}
              showOwnersPanel={false}
            />
          </DashboardSection>
        </div>
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

          <DashboardSection
            id="smartrefill-product-signals"
            title="Product signals"
            description="Onboarding, engagement, and feature adoption at a glance."
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
    </>
  );
}

export function SmartRefillDashboard() {
  return (
    <DashboardAnalyticsShell>
      {(ctx) => <SmartRefillDashboardContent {...ctx} />}
    </DashboardAnalyticsShell>
  );
}
