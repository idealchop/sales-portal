"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
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

export function CommissionsPage() {
  const { commissions, isLoading, error } = useCommissions();
  const payouts = useMemo(() => groupCommissionsByMonth(commissions), [commissions]);

  const totals = useMemo(() => {
    const pending = commissions
      .filter((row) => row.status === "pending")
      .reduce((sum, row) => sum + row.amount, 0);
    const paid = commissions
      .filter((row) => row.status === "paid")
      .reduce((sum, row) => sum + row.amount, 0);
    return { pending, paid, total: pending + paid };
  }, [commissions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Track pending and paid commission earnings by payout month.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total earned</CardDescription>
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
      </div>

      {isLoading ?
        <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
      : error ?
        <p className="text-sm text-red-600">{error}</p>
      : payouts.length === 0 ?
        <Card>
          <CardContent className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            No commissions recorded yet.
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
