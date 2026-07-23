"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SalesInsights } from "@/lib/dashboard/analytics";
import { cn } from "@/lib/utils";

const HEALTH_STYLES: Record<"high" | "medium" | "low", string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-400",
  low: "bg-red-500",
};

function formatPaymentLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function SmartRefillMaintenanceSignals({
  salesInsights,
}: {
  salesInsights: SalesInsights;
}) {
  const healthTotal = salesInsights.workspaceHealth.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const paymentTotal = salesInsights.paymentStatusBreakdown.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Workspace health</CardTitle>
          <CardDescription>
            Product health mix — prioritize low-health stations for support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthTotal === 0 ?
            <p className="text-sm text-[var(--muted-foreground)]">No health data</p>
          : <>
              <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100">
                {salesInsights.workspaceHealth.map((row) => {
                  const width =
                    healthTotal > 0 ? (row.count / healthTotal) * 100 : 0;
                  if (width <= 0) return null;
                  return (
                    <div
                      key={row.tier}
                      className={cn(HEALTH_STYLES[row.tier])}
                      style={{ width: `${width}%` }}
                      title={`${row.tier}: ${row.count}`}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {salesInsights.workspaceHealth.map((row) => (
                  <div
                    key={row.tier}
                    className="rounded-lg border border-[var(--border)] bg-zinc-50/80 px-2.5 py-2"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {row.tier}
                    </p>
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {row.count}
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {healthTotal > 0 ?
                        `${Math.round((row.count / healthTotal) * 100)}%`
                      : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Payment status</CardTitle>
          <CardDescription>
            Billing health — catch pending or failed payments early.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentTotal === 0 ?
            <p className="text-sm text-[var(--muted-foreground)]">
              No payment breakdown
            </p>
          : <ul className="space-y-2">
              {salesInsights.paymentStatusBreakdown.map((row) => {
                const pct =
                  paymentTotal > 0 ?
                    Math.round((row.count / paymentTotal) * 100)
                  : 0;
                return (
                  <li key={row.status} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="capitalize text-foreground">
                        {formatPaymentLabel(row.status)}
                      </span>
                      <span className="tabular-nums text-[var(--muted-foreground)]">
                        {row.count} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-teal-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          }
        </CardContent>
      </Card>
    </div>
  );
}
