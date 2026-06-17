"use client";

import { DateRangeFilter } from "@/features/dashboard/components/date-range-filter";
import { useDashboardDateFilter } from "@/features/dashboard/components/dashboard-date-filter-context";

export function DashboardGlobalDateFilter() {
  const { globalFilter, setGlobalFilter, rangeLabel } = useDashboardDateFilter();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        Period · {rangeLabel}
      </p>
      <div className="min-w-0 sm:max-w-xl">
        <DateRangeFilter
          variant="global"
          value={globalFilter}
          onChange={setGlobalFilter}
        />
      </div>
    </div>
  );
}
