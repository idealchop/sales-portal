"use client";

import type { BreakdownRow } from "@/lib/dashboard/analytics";
import { ListPagination } from "@/components/list-pagination";
import { usePagination } from "@/hooks/use-pagination";

export function PaginatedBreakdownRows({
  rows,
  pageSize = 10,
  resetKey,
}: {
  rows: BreakdownRow[];
  pageSize?: number;
  resetKey?: string | number;
}) {
  const { paginatedItems, page, setPage, totalPages, totalItems } =
    usePagination(rows, pageSize, resetKey);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        No data in this period.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {paginatedItems.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="shrink-0 font-medium text-[var(--primary)]">
                {row.value}
              </span>
            </div>
            {row.detail && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {row.detail}
              </p>
            )}
          </div>
        ))}
      </div>
      <ListPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </>
  );
}
