"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export function useAdminCustomerTransactions(
  businessId: string | null,
  customerId: string | null,
  enabled: boolean,
) {
  const [transactions, setTransactions] = useState<UserFirestoreDocumentRow[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId || !customerId || !enabled) return;
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        data: { documents: UserFirestoreDocumentRow[] };
      }>(
        `/admin/businesses/${businessId}/customers/${customerId}/transactions`,
      );
      setTransactions(response.data.documents);
    } catch (err) {
      setError(
        err instanceof ApiError ?
          err.message
        : "Unable to load customer transactions.",
      );
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, customerId, enabled]);

  const isActive = enabled && Boolean(businessId) && Boolean(customerId);

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
