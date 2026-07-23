"use client";

import {
  AlertTriangle,
  ArrowUpCircle,
  CircleDollarSign,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { HorizontalBarChart } from "@/components/charts/distribution-chart";
import { PaginatedList } from "@/components/paginated-list";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrevoOutreachButton } from "@/features/dashboard/components/brevo-outreach-button";
import type {
  DashboardAnalytics,
  SalesAction,
  SalesActionType,
} from "@/lib/dashboard/analytics";
import {
  WORKSPACE_HEALTH_LABELS,
} from "@/lib/dashboard/workspace-health";
import { formatPhp } from "@/lib/format";

const ACTION_PAGE_SIZE = 8;
const LIST_PAGE_SIZE = 8;

const ACTION_LABELS: Record<SalesActionType, string> = {
  payment_pending: "Payment",
  upgrade_opportunity: "Upsell",
  low_engagement: "Adoption",
  inactive: "Inactive",
  onboarding_incomplete: "Onboarding",
};

const PRIORITY_STYLES: Record<SalesAction["priority"], string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-zinc-100 text-zinc-700",
};

function SalesStatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-[var(--border)] bg-gradient-to-br from-white to-teal-50/40">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              {title}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</p>
            <p className="mt-1 text-xs tabular-nums text-[var(--muted-foreground)]">
              {subtitle}
            </p>
          </div>
          <div className="rounded-lg bg-white p-2 text-[var(--primary)] shadow-sm">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesInsightsPanel({
  salesInsights,
  proposalPipeline,
  embedded = false,
  hideStatCards = false,
}: {
  salesInsights: DashboardAnalytics["salesInsights"];
  proposalPipeline: DashboardAnalytics["proposalPipeline"];
  embedded?: boolean;
  hideStatCards?: boolean;
}) {
  const healthTotal = salesInsights.workspaceHealth.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  return (
    <div className="space-y-4">
      {!embedded ?
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Platform sales
        </h3>
      : null}

      {!hideStatCards ?
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SalesStatCard
            title="MRR"
            value={formatPhp(salesInsights.estimatedMrr)}
            subtitle={`${salesInsights.pendingPayments} pending`}
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
          <SalesStatCard
            title="Follow-ups"
            value={salesInsights.salesActions.length.toLocaleString()}
            subtitle={`${salesInsights.atRiskWorkspaces} at-risk`}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <SalesStatCard
            title="Upsell"
            value={salesInsights.upgradeOpportunities.toLocaleString()}
            subtitle="high-usage Starter"
            icon={<ArrowUpCircle className="h-5 w-5" />}
          />
          <SalesStatCard
            title="New MTD"
            value={`+${salesInsights.newWorkspacesThisMonth}`}
            subtitle={`+${salesInsights.newSmartRefillUsersThisMonth} users`}
            icon={<UserPlus className="h-5 w-5" />}
          />
        </div>
      : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">
              Action queue · {salesInsights.salesActions.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesInsights.salesActions.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                0 actions
              </p>
            ) : (
              <PaginatedList
                items={salesInsights.salesActions}
                pageSize={ACTION_PAGE_SIZE}
                className="space-y-3"
                renderItem={(action) => (
                  <div
                    key={action.id}
                    className="rounded-lg border border-[var(--border)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {action.businessName}
                          </p>
                          <Badge className={PRIORITY_STYLES[action.priority]}>
                            {action.priority}
                          </Badge>
                          <Badge>
                            {ACTION_LABELS[action.actionType]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm font-medium text-[var(--primary)]">
                          {action.headline}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {action.detail}
                        </p>
                        {action.ownerEmail && (
                          <BrevoOutreachButton
                            toEmail={action.ownerEmail}
                            businessName={action.businessName}
                            subtitle={action.headline}
                            label={`Email ${action.ownerEmail}`}
                            className="mt-2"
                          />
                        )}
                      </div>
                      <div className="text-right text-xs text-[var(--muted-foreground)]">
                        {action.planName && <p>{action.planName}</p>}
                        {action.customers !== undefined && (
                          <p>{action.customers} customers</p>
                        )}
                        {action.transactionsLast30Days !== undefined && (
                          <p>{action.transactionsLast30Days} tx / 30d</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                Health · {healthTotal}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {salesInsights.workspaceHealth.map((row) => {
                const pct =
                  healthTotal > 0 ?
                    Math.round((row.count / healthTotal) * 100)
                  : 0;
                return (
                  <div key={row.tier}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">
                        {WORKSPACE_HEALTH_LABELS[row.tier]}
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        {row.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full ${
                          row.tier === "high" ?
                            "bg-emerald-500"
                          : row.tier === "medium" ?
                            "bg-amber-400"
                          : "bg-red-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs tabular-nums text-[var(--muted-foreground)]">
                {salesInsights.inactiveWorkspaces} inactive · 30d
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                MRR by plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {salesInsights.mrrByPlan.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No paid subscriptions yet.
                </p>
              ) : (
                <PaginatedList
                  items={salesInsights.mrrByPlan}
                  pageSize={LIST_PAGE_SIZE}
                  className="space-y-3"
                  renderItem={(row) => (
                    <div
                      key={row.plan}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{row.plan}</span>
                      <span className="text-[var(--muted-foreground)]">
                        {formatPhp(row.mrr)} · {row.workspaces} workspaces
                      </span>
                    </div>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">
              Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesInsights.paymentStatusBreakdown.length > 0 ? (
              <HorizontalBarChart
                data={salesInsights.paymentStatusBreakdown.map((row) => ({
                  status: row.status.replaceAll("_", " "),
                  count: row.count,
                }))}
                labelKey="status"
                valueKey="count"
              />
            ) : (
              <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
                No subscription payment data.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">
              Pipeline · {proposalPipeline.totalProposals}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-zinc-50 p-3 text-center">
                <p className="text-lg font-bold">
                  {proposalPipeline.totalProposals}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Proposals
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 text-center">
                <p className="text-lg font-bold">
                  {proposalPipeline.totalClients}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Clients
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 text-center">
                <p className="text-lg font-bold">
                  {proposalPipeline.winRate}%
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Win rate
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 text-center">
                <p className="text-lg font-bold">
                  {formatPhp(proposalPipeline.pipelineValue)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Pipeline
                </p>
              </div>
            </div>

            {proposalPipeline.byStatus.length > 0 ? (
              <PaginatedList
                items={proposalPipeline.byStatus}
                pageSize={LIST_PAGE_SIZE}
                className="space-y-2"
                renderItem={(row) => (
                  <div
                    key={row.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{row.status}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {row.count} · {formatPhp(row.value)}
                    </span>
                  </div>
                )}
              />
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">0 proposals</p>
            )}

            {proposalPipeline.clientsByType.length > 0 && (
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <p className="mb-2 text-sm font-medium">Segments</p>
                <div className="flex flex-wrap gap-2">
                  {proposalPipeline.clientsByType.map((row) => (
                    <Badge key={row.type}>
                      {row.type}: {row.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {proposalPipeline.acceptedValue > 0 && (
              <p className="mt-4 flex items-center gap-1 text-sm text-emerald-700">
                <TrendingUp className="h-4 w-4" />
                {formatPhp(proposalPipeline.acceptedValue)} closed won
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
