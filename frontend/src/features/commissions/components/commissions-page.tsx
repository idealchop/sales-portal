"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCommissions } from "@/hooks/use-commissions";
import { formatPhp } from "@/lib/format";
import type { Commission } from "@/lib/definitions";

type MonthlyPayout = {
  month: string;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  commissions: Commission[];
};

type StatusFilter = "all" | "pending" | "paid";

function monthKey(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  if (key === "Unknown") return key;
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-PH",
    { month: "long", year: "numeric" },
  );
}

function groupCommissionsByMonth(commissions: Commission[]): MonthlyPayout[] {
  const grouped = new Map<string, Commission[]>();

  for (const commission of commissions) {
    const key = monthKey(commission.createdAt);
    const bucket = grouped.get(key) ?? [];
    bucket.push(commission);
    grouped.set(key, bucket);
  }

  return Array.from(grouped.entries())
    .map(([month, rows]) => {
      const pendingAmount = rows
        .filter((row) => row.status === "pending")
        .reduce((sum, row) => sum + row.amount, 0);
      const paidAmount = rows
        .filter((row) => row.status === "paid")
        .reduce((sum, row) => sum + row.amount, 0);

      return {
        month,
        totalAmount: pendingAmount + paidAmount,
        pendingAmount,
        paidAmount,
        commissions: rows.sort((a, b) =>
          String(b.createdAt).localeCompare(String(a.createdAt)),
        ),
      };
    })
    .sort((a, b) => b.month.localeCompare(a.month));
}

function exportCommissionsCsv(commissions: Commission[]) {
  const header = ["date", "description", "type", "status", "amount"];
  const rows = commissions.map((row) => [
    row.createdAt.slice(0, 10),
    `"${row.description.replaceAll('"', '""')}"`,
    row.type,
    row.status,
    String(row.amount),
  ]);
  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CommissionsPage() {
  const { commissions, isLoading, error } = useCommissions();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return commissions;
    return commissions.filter((row) => row.status === statusFilter);
  }, [commissions, statusFilter]);

  const payouts = useMemo(
    () => groupCommissionsByMonth(filtered),
    [filtered],
  );

  const totals = useMemo(() => {
    const pending = filtered
      .filter((row) => row.status === "pending")
      .reduce((sum, row) => sum + row.amount, 0);
    const paid = filtered
      .filter((row) => row.status === "paid")
      .reduce((sum, row) => sum + row.amount, 0);
    return { pending, paid, total: pending + paid };
  }, [filtered]);

  const forecastPending = totals.pending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Filter by status, export records, and track payout forecast.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={commissions.length === 0}
          onClick={() => exportCommissionsCsv(filtered)}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "paid"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={statusFilter === value ? "primary" : "outline"}
            onClick={() => setStatusFilter(value)}
          >
            {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total (filtered)</CardDescription>
            <CardTitle>{formatPhp(totals.total)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending payout</CardDescription>
            <CardTitle>{formatPhp(totals.pending)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid out</CardDescription>
            <CardTitle>{formatPhp(totals.paid)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-teal-100 bg-teal-50/40">
          <CardHeader className="pb-2">
            <CardDescription>Forecast (pending)</CardDescription>
            <CardTitle>{formatPhp(forecastPending)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {isLoading ?
        <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
      : error ?
        <p className="text-sm text-red-600">{error}</p>
      : payouts.length === 0 ?
        <Card>
          <CardContent className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            No commissions match this filter.
          </CardContent>
        </Card>
      : payouts.map((payout) => (
          <Card key={payout.month}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>{monthLabel(payout.month)}</CardTitle>
                <CardDescription>
                  {payout.commissions.length} line item
                  {payout.commissions.length === 1 ? "" : "s"}
                </CardDescription>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-foreground">
                  {formatPhp(payout.totalAmount)}
                </p>
                <p className="text-[var(--muted-foreground)]">
                  {formatPhp(payout.pendingAmount)} pending
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {payout.commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {commission.description}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {commission.type} · {commission.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">
                      {formatPhp(commission.amount)}
                    </span>
                    <Badge
                      className={
                        commission.status === "paid" ?
                          "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                      }
                    >
                      {commission.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      }
    </div>
  );
}
