"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  MarketPositionMetric,
  MarketTrend,
  PlanMixRow,
} from "@/features/dashboard/lib/build-sales-market-report";
import { formatPhp } from "@/lib/format";
import { cn } from "@/lib/utils";

function TrendBadge({ trend }: { trend: MarketTrend }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        <TrendingUp className="h-3 w-3" />
        Up
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
        <TrendingDown className="h-3 w-3" />
        Down
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
      <Minus className="h-3 w-3" />
      Neutral
    </span>
  );
}

function MetricTile({
  metric,
  accent,
}: {
  metric: MarketPositionMetric;
  accent?: "teal" | "violet" | "amber";
}) {
  const accentClass =
    accent === "violet" ?
      "from-violet-50/70 to-white"
    : accent === "amber" ?
      "from-amber-50/70 to-white"
    : "from-teal-50/70 to-white";

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-gradient-to-br p-4",
        accentClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          {metric.label}
        </p>
        <TrendBadge trend={metric.trend} />
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
        {metric.value}
      </p>
      <p className="mt-1 text-xs leading-snug text-[var(--muted-foreground)]">
        {metric.hint}
      </p>
      <div className="mt-3 border-t border-zinc-100 pt-2">
        <p className="text-[11px] font-medium text-foreground">
          {metric.idealLabel}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[11px] tabular-nums",
            metric.trend === "up" ?
              "text-emerald-700"
            : metric.trend === "down" ?
              "text-red-700"
            : "text-[var(--muted-foreground)]",
          )}
        >
          {metric.comparisonLabel}
        </p>
      </div>
    </div>
  );
}

function PlanMixBars({ rows }: { rows: PlanMixRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
        No plan mix data yet.
      </p>
    );
  }

  const barClass: Record<PlanMixRow["tone"], string> = {
    win: "bg-teal-600",
    mid: "bg-amber-500",
    risk: "bg-zinc-400",
  };

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.plan}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">{row.plan}</span>
            <span className="tabular-nums text-[var(--muted-foreground)]">
              {row.sharePercent}% · {row.workspaces} station
              {row.workspaces === 1 ? "" : "s"}
              {row.mrr > 0 ? ` · ${formatPhp(row.mrr)}` : " · ₱0"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={cn("h-full rounded-full", barClass[row.tone])}
              style={{
                width: `${Math.max(row.sharePercent, row.workspaces > 0 ? 2 : 0)}%`,
              }}
            />
          </div>
        </div>
      ))}
      <p className="pt-1 text-[11px] text-[var(--muted-foreground)]">
        Teal = paid wins (Scale/Grow) · Amber = paid Starter · Grey = Free /
        trial (not paying).
      </p>
    </div>
  );
}

export function SalesMarketPositionSection({
  metrics,
  planMix,
  rangeLabel,
}: {
  metrics: MarketPositionMetric[];
  planMix: PlanMixRow[];
  rangeLabel?: string;
}) {
  return (
    <div className="space-y-4">
      {rangeLabel ?
        <p className="text-xs text-[var(--muted-foreground)]">
          Trends vs ideal targets for <span className="font-medium text-foreground">{rangeLabel}</span>
          . Change the date filter above to recalibrate ideals.
        </p>
      : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricTile key={metric.id} metric={metric} />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">
            Plan mix — market position
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            Full installed base: paid Scale / Grow vs Free / trial. Stations on
            a plan name with ₱0 or billingCycle trial count as free — not wins.
          </p>
        </CardHeader>
        <CardContent>
          <PlanMixBars rows={planMix} />
        </CardContent>
      </Card>
    </div>
  );
}

export function SalesProactiveScoreboard({
  metrics,
}: {
  metrics: MarketPositionMetric[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric, index) => (
        <MetricTile
          key={metric.id}
          metric={metric}
          accent={index < 2 ? "violet" : index < 4 ? "amber" : "teal"}
        />
      ))}
    </div>
  );
}
