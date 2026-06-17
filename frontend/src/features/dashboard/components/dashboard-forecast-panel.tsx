"use client";

import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/list-pagination";
import { usePagination } from "@/hooks/use-pagination";
import type { DashboardForecastItem } from "@/lib/dashboard/analytics";

const PAGE_SIZE = 5;

const PRIORITY_STYLES: Record<DashboardForecastItem["priority"], string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-zinc-100 text-zinc-700",
};

function ForecastRow({ item }: { item: DashboardForecastItem }) {
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{item.metric}</p>
          <Badge className="bg-zinc-100 text-[10px] uppercase text-zinc-600">
            {item.horizon}
          </Badge>
          <Badge className={PRIORITY_STYLES[item.priority]}>{item.priority}</Badge>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm tabular-nums">
          <span className="text-[var(--muted-foreground)]">{item.current}</span>
          <span className="text-foreground">→</span>
          <span className="font-bold text-teal-800">{item.projected}</span>
          <span className="font-medium text-violet-700">{item.delta}</span>
        </div>
        <p className="text-xs tabular-nums text-[var(--muted-foreground)]">
          ROI {item.roiImpact} · {item.action}
        </p>
      </div>
    </div>
  );
}

export function DashboardForecastPanel({
  items,
  aiEnabled,
  pageSize = PAGE_SIZE,
}: {
  items: DashboardForecastItem[];
  aiEnabled?: boolean;
  pageSize?: number;
}) {
  const {
    paginatedItems,
    page,
    setPage,
    totalPages,
    totalItems,
  } = usePagination(items, pageSize, `forecast-${items.length}`);

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
        No forecasts yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs tabular-nums text-[var(--muted-foreground)]">
          {totalItems} projections
        </p>
        <Badge className="bg-zinc-100 text-[10px] uppercase text-zinc-600">
          {aiEnabled ? "AI" : "Model"}
        </Badge>
      </div>
      <div className="space-y-2">
        {paginatedItems.map((item) => (
          <ForecastRow key={item.id} item={item} />
        ))}
      </div>
      <ListPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
