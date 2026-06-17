"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  DEFAULT_GLOBAL_FILTER,
  formatDateRangeLabel,
  resolveGlobalDateRange,
  type DateRangeFilterState,
} from "@/features/dashboard/lib/date-range";

type DashboardDateFilterContextValue = {
  globalFilter: DateRangeFilterState;
  setGlobalFilter: (value: DateRangeFilterState) => void;
  rangeLabel: string;
};

const DashboardDateFilterContext =
  createContext<DashboardDateFilterContextValue | null>(null);

export function DashboardDateFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [globalFilter, setGlobalFilter] =
    useState<DateRangeFilterState>(DEFAULT_GLOBAL_FILTER);

  const rangeLabel = useMemo(() => {
    return formatDateRangeLabel(resolveGlobalDateRange(globalFilter));
  }, [globalFilter]);

  return (
    <DashboardDateFilterContext.Provider
      value={{ globalFilter, setGlobalFilter, rangeLabel }}
    >
      {children}
    </DashboardDateFilterContext.Provider>
  );
}

export function useDashboardDateFilter() {
  const value = useContext(DashboardDateFilterContext);
  if (!value) {
    throw new Error("useDashboardDateFilter must be used within provider");
  }
  return value;
}
