"use client";

import { Building2, Package, Receipt, UserCheck, UserRound, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { resolvePlatformKpiSummary } from "@/features/dashboard/lib/resolve-platform-kpi-breakdowns";

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
  data,
  topBusinessesByCustomers,
}: {
  data: Pick<
    DashboardAnalytics,
    "summary" | "growthSalesMetrics" | "chartBusinessContext"
  >;
  topBusinessesByCustomers: DashboardAnalytics["topBusinessesByCustomers"];
}) {
  const s = resolvePlatformKpiSummary(data);
  const virtualStaffTotal = s.virtualStaffCounts.admins + s.virtualStaffCounts.riders;
  const containerTotal =
    s.inventoryBreakdown.container.shell +
    s.inventoryBreakdown.container.round +
    s.inventoryBreakdown.container.slim;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SnapshotStat
          label="Customers"
          value={s.totalCustomers.toLocaleString()}
          hint={`${s.customerBreakdown.active.toLocaleString()} active · ${s.customerBreakdown.deactivated.toLocaleString()} deactivated`}
          icon={<UserCheck className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Users"
          value={s.smartRefillUsers.toLocaleString()}
          hint={`${s.userRoleCounts.owners.toLocaleString()} owners · ${s.userRoleCounts.admins.toLocaleString()} staff-admin · ${s.userRoleCounts.riders.toLocaleString()} staff-rider`}
          icon={<Users className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Staff records"
          value={virtualStaffTotal.toLocaleString()}
          hint={`${s.virtualStaffCounts.admins.toLocaleString()} staff-admin · ${s.virtualStaffCounts.riders.toLocaleString()} staff-rider · no login`}
          icon={<UserRound className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Businesses"
          value={s.totalBusinesses.toLocaleString()}
          hint={`${s.businessTierCounts.scale.toLocaleString()} scale · ${s.businessTierCounts.grow.toLocaleString()} grow · ${s.businessTierCounts.starter.toLocaleString()} starter · ${s.businessTierCounts.free.toLocaleString()} free`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Transactions"
          value={s.totalTransactions.toLocaleString()}
          hint={`${s.transactionBreakdown.walkIn.toLocaleString()} walk-in · ${s.transactionBreakdown.directSale.toLocaleString()} direct sale · ${s.transactionBreakdown.orders.toLocaleString()} orders`}
          icon={<Receipt className="h-4 w-4" />}
        />
        <SnapshotStat
          label="Inventory"
          value={s.totalInventory.toLocaleString()}
          hint={`${s.inventoryBreakdown.generalStock.toLocaleString()} general stock · ${s.inventoryBreakdown.kit.toLocaleString()} kit · ${containerTotal.toLocaleString()} container (${s.inventoryBreakdown.container.shell.toLocaleString()} shell · ${s.inventoryBreakdown.container.round.toLocaleString()} round · ${s.inventoryBreakdown.container.slim.toLocaleString()} slim)`}
          icon={<Package className="h-4 w-4" />}
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
