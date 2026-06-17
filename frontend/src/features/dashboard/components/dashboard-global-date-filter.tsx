"use client";

import { DateRangeFilter } from "@/features/dashboard/components/date-range-filter";
import { useDashboardDateFilter } from "@/features/dashboard/components/dashboard-date-filter-context";

export function DashboardGlobalDateFilter() {
  const { globalFilter, setGlobalFilter, rangeLabel } = useDashboardDateFilter();

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Reporting period</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Charts and period-scoped views use {rangeLabel}.
          </p>
        </div>
        <div className="min-w-0 lg:max-w-xl">
          <DateRangeFilter
            variant="global"
            value={globalFilter}
            onChange={setGlobalFilter}
          />
        </div>
      </div>
    </div>
  );
}
