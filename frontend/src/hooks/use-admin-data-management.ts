"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { DataManagementOverview } from "@/lib/admin/data-management";

export function useAdminDataManagement() {
  const [overview, setOverview] = useState<DataManagementOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: DataManagementOverview }>(
        "/admin/data-management",
      );
      setOverview(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load data management.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  return {
    overview,
    isLoading,
    error,
    refresh: load,
  };
}
