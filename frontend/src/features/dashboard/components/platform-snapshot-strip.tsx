"use client";

import {
  Building2,
  Droplets,
  Receipt,
  UserCheck,
  Users,
  Wallet,
  AlertTriangle,
  UserPlus,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { formatPhp } from "@/lib/format";

function SnapshotStat({
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
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
          {hint ?
            <p className="mt-1 text-xs tabular-nums text-[var(--muted-foreground)]">{hint}</p>
          : null}
        </div>
        <div className="rounded-lg bg-teal-50 p-2 text-teal-700">{icon}</div>
      </div>
    </div>
  );
}

export function PlatformSnapshotStrip({
  summary,
  salesInsights,
  topBusinessesByCustomers,
}: {
  summary: DashboardAnalytics["summary"];
  salesInsights: DashboardAnalytics["salesInsights"];
  topBusinessesByCustomers: DashboardAnalytics["topBusinessesByCustomers"];
}) {
  const refillPerTx =
    summary.transactionsLast30Days > 0 ?
      Math.round(summary.refillVolumeLast30Days / summary.transactionsLast30Days)
    : 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SnapshotStat
          label="Users"
          value={summary.smartRefillUsers.toLocaleString()}
          hint={`${summary.activeLoginUsers.toLocaleString()} active · 30d`}
          icon={<Users className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Workspaces"
          value={summary.totalBusinesses.toLocaleString()}
          hint={`${summary.onboardedBusinesses.toLocaleString()} onboarded`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Customers"
          value={summary.totalCustomers.toLocaleString()}
          hint={`${summary.loginSessionsLast30Days.toLocaleString()} sessions`}
          icon={<UserCheck className="h-4 w-4" />}
        />
        <SnapshotStat
          label="MRR"
          value={formatPhp(salesInsights.estimatedMrr)}
          hint={`${salesInsights.pendingPayments} pending`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Transactions"
          value={summary.transactionsLast30Days.toLocaleString()}
          hint="30d"
          icon={<Receipt className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Refill vol."
          value={summary.refillVolumeLast30Days.toLocaleString()}
          hint={refillPerTx > 0 ? `~${refillPerTx}/tx` : "30d"}
          icon={<Droplets className="h-4 w-4" />}
        />
        <SnapshotStat
          label="New MTD"
          value={`+${salesInsights.newSmartRefillUsersThisMonth}`}
          hint={`+${salesInsights.newWorkspacesThisMonth} workspaces`}
          icon={<UserPlus className="h-4 w-4" />}
        />
        <SnapshotStat
          label="At-risk"
          value={salesInsights.atRiskWorkspaces.toLocaleString()}
          hint={`${salesInsights.inactiveWorkspaces} inactive`}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Sessions"
          value={summary.loginSessionsLast30Days.toLocaleString()}
          hint={`${summary.topDevice} · ${summary.topBrowser}`}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {topBusinessesByCustomers.length > 0 ?
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">
              Top workspaces · customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {topBusinessesByCustomers.map((business, index) => (
                <li
                  key={business.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    <span className="mr-2 text-xs text-[var(--muted-foreground)]">
                      #{index + 1}
                    </span>
                    {business.name}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-teal-800">
                    {business.customers.toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      : null}
    </div>
  );
}
