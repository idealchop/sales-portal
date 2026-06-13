"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildChartBreakdown,
  type ChartInsight,
} from "@/features/dashboard/lib/build-growth-chart-insights";
import { DateRangeFilter } from "@/features/dashboard/components/date-range-filter";
import { PaginatedBreakdownRows } from "@/features/dashboard/components/paginated-breakdown-rows";
import {
  DEFAULT_BREAKDOWN_FILTER,
  formatDateRangeLabel,
  resolveBreakdownDateRange,
  type BreakdownFilterState,
} from "@/features/dashboard/lib/date-range";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

export function ChartBreakdownDialog({
  insight,
  data,
  onClose,
}: {
  insight: ChartInsight | null;
  data: DashboardAnalytics;
  onClose: () => void;
}) {
  const [breakdownFilter, setBreakdownFilter] =
    useState<BreakdownFilterState>(DEFAULT_BREAKDOWN_FILTER);
  const [filterInsightId, setFilterInsightId] = useState(insight?.id ?? null);
  if (filterInsightId !== (insight?.id ?? null)) {
    setFilterInsightId(insight?.id ?? null);
    setBreakdownFilter(DEFAULT_BREAKDOWN_FILTER);
  }

  useEffect(() => {
    if (!insight) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [insight, onClose]);

  const breakdownRange = useMemo(
    () => resolveBreakdownDateRange(breakdownFilter),
    [breakdownFilter],
  );

  const { breakdown, breakdownGroups } = useMemo(() => {
    if (!insight) return { breakdown: [], breakdownGroups: undefined };
    return buildChartBreakdown(insight, data, breakdownRange);
  }, [insight, data, breakdownRange]);

  if (!insight) return null;

  const groups =
    breakdownGroups && breakdownGroups.length > 0 ?
      breakdownGroups
    : [{ title: "Breakdown", rows: breakdown }];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close breakdown"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-breakdown-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
              Breakdown
            </p>
            <h3 id="chart-breakdown-title" className="text-lg font-semibold text-foreground">
              {insight.title}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              {insight.subtitle}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b border-zinc-100 px-5 py-3">
          <p className="mb-2 text-xs font-medium text-zinc-500">
            Period · {formatDateRangeLabel(breakdownRange)}
          </p>
          <DateRangeFilter
            variant="breakdown"
            value={breakdownFilter}
            onChange={setBreakdownFilter}
          />
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {group.title}
              </p>
              <PaginatedBreakdownRows
                rows={group.rows}
                resetKey={`${insight.id}-${group.title}-${formatDateRangeLabel(breakdownRange)}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
