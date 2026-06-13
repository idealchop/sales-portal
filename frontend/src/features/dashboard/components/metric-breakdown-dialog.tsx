"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginatedBreakdownRows } from "@/features/dashboard/components/paginated-breakdown-rows";
import type { DashboardMetric } from "@/lib/dashboard/analytics";

export function MetricBreakdownDialog({
  metric,
  onClose,
}: {
  metric: DashboardMetric | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!metric) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [metric, onClose]);

  if (!metric) return null;

  const groups =
    metric.breakdownGroups && metric.breakdownGroups.length > 0 ?
      metric.breakdownGroups
    : [{ title: "Breakdown", rows: metric.breakdown }];

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
        aria-labelledby="metric-breakdown-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
              Breakdown
            </p>
            <h3 id="metric-breakdown-title" className="text-lg font-semibold text-foreground">
              {metric.title}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              {metric.subtitle}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {group.title}
              </p>
              <PaginatedBreakdownRows
                rows={group.rows}
                resetKey={`${metric.id}-${group.title}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
