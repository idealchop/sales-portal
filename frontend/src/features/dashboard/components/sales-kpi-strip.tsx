"use client";

import {
  AlertTriangle,
  ArrowUpCircle,
  CircleDollarSign,
  UserMinus,
  UserPlus,
  Zap,
} from "lucide-react";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { formatPhp } from "@/lib/format";

function KpiTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{value}</p>
          {hint ?
            <p className="mt-0.5 text-[11px] tabular-nums text-[var(--muted-foreground)]">{hint}</p>
          : null}
        </div>
        <div className="rounded-md bg-teal-50 p-1.5 text-teal-700">{icon}</div>
      </div>
    </div>
  );
}

export function SalesKpiStrip({
  salesInsights,
}: {
  salesInsights: DashboardAnalytics["salesInsights"];
}) {
  const healthHigh =
    salesInsights.workspaceHealth.find((row) => row.tier === "high")?.count ?? 0;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KpiTile
        label="Est. monthly revenue"
        value={formatPhp(salesInsights.estimatedMrr)}
        hint={`${salesInsights.pendingPayments} pending payments`}
        icon={<CircleDollarSign className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Owners to contact"
        value={salesInsights.salesActions.length.toLocaleString()}
        hint={`${salesInsights.atRiskWorkspaces} at-risk`}
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Upgrade-ready"
        value={salesInsights.upgradeOpportunities.toLocaleString()}
        hint="high-usage Starter plans"
        icon={<ArrowUpCircle className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="New stations MTD"
        value={`+${salesInsights.newWorkspacesThisMonth}`}
        hint={`+${salesInsights.newSmartRefillUsersThisMonth} users`}
        icon={<UserPlus className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Quiet stations"
        value={salesInsights.inactiveWorkspaces.toLocaleString()}
        hint={`${healthHigh} healthy`}
        icon={<UserMinus className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Paying stations"
        value={salesInsights.mrrByPlan
          .reduce((sum, row) => sum + row.workspaces, 0)
          .toLocaleString()}
        hint={`${salesInsights.mrrByPlan.length} plan tiers`}
        icon={<Zap className="h-3.5 w-3.5" />}
      />
    </div>
  );
}
