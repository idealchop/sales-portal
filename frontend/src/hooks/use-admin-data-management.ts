"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { DataManagementOverview } from "@/lib/admin/data-management";

export function useAdminDataManagement() {
  const [overview, setOverview] = useState<DataManagementOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true && hasLoadedRef.current;
    if (!hasLoadedRef.current && !silent) setIsLoading(true);
    else setIsFetching(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: DataManagementOverview }>(
        "/admin/data-management",
      );
      startTransition(() => {
        setOverview(response.data);
      });
      hasLoadedRef.current = true;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load data management.",
      );
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    overview,
    isLoading,
    isFetching,
    error,
    refresh: () => load({ silent: true }),
  };
}
