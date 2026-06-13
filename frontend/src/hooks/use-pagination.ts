"use client";

import { useMemo, useState } from "react";

export function usePagination<T>(
  items: T[],
  pageSize: number,
  resetKey?: string | number,
) {
  const resetToken = `${resetKey ?? ""}:${items.length}`;
  const [pageState, setPageState] = useState({ token: resetToken, page: 1 });

  if (pageState.token !== resetToken) {
    setPageState({ token: resetToken, page: 1 });
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(pageState.page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const setPage = (nextPage: number) => {
    setPageState((prev) => ({
      token: prev.token,
      page: nextPage,
    }));
  };

  return {
    page: currentPage,
    setPage,
    totalPages,
    paginatedItems,
    totalItems: items.length,
    pageSize,
    hasPagination: items.length > pageSize,
  };
}
