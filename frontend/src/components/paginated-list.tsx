"use client";

import type { ReactNode } from "react";
import { ListPagination } from "@/components/list-pagination";
import { usePagination } from "@/hooks/use-pagination";

export function PaginatedList<T>({
  items,
  pageSize,
  resetKey,
  className,
  emptyMessage,
  renderItem,
}: {
  items: T[];
  pageSize: number;
  resetKey?: string | number;
  className?: string;
  emptyMessage?: string;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const { paginatedItems, page, setPage, totalPages, totalItems } =
    usePagination(items, pageSize, resetKey);

  if (items.length === 0 && emptyMessage) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={className}>
      {paginatedItems.map((item, index) => renderItem(item, index))}
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
