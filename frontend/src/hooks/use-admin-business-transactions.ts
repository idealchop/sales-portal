"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export function useAdminBusinessTransactions(
  businessId: string | null,
  types: string[],
  enabled: boolean,
) {
  const [transactions, setTransactions] = useState<UserFirestoreDocumentRow[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typesKey = types.join(",");

  const load = useCallback(async () => {
    if (!businessId || !enabled || types.length === 0) return;
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        data: { documents: UserFirestoreDocumentRow[] };
      }>(
        `/admin/businesses/${businessId}/transactions?types=${encodeURIComponent(typesKey)}`,
      );
      setTransactions(response.data.documents);
    } catch (err) {
      setError(
        err instanceof ApiError ?
          err.message
        : "Unable to load transactions.",
      );
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, enabled, types.length, typesKey]);

  const isActive = enabled && Boolean(businessId) && types.length > 0;

  useEffect(() => {
    if (!isActive) return;
    void (async () => {
      await load();
    })();
  }, [isActive, load]);

  return {
    transactions: isActive ? transactions : [],
    isLoading: isActive ? isLoading : false,
    error: isActive ? error : null,
    refresh: load,
  };
}
