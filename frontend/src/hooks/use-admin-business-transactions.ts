"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
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
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typesKey = types.join(",");
  const hasLoadedRef = useRef(false);
  const isActive = enabled && Boolean(businessId) && types.length > 0;

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!businessId || !enabled || types.length === 0) return;
      const silent = options?.silent === true && hasLoadedRef.current;
      if (!hasLoadedRef.current && !silent) setIsLoading(true);
      else setIsFetching(true);
      setError(null);
      try {
        const response = await apiClient.get<{
          data: { documents: UserFirestoreDocumentRow[] };
        }>(
          `/admin/businesses/${businessId}/transactions?types=${encodeURIComponent(typesKey)}`,
        );
        startTransition(() => {
          setTransactions(response.data.documents);
        });
        hasLoadedRef.current = true;
      } catch (err) {
        setError(
          err instanceof ApiError ?
            err.message
          : "Unable to load transactions.",
        );
        if (!hasLoadedRef.current) setTransactions([]);
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [businessId, enabled, types.length, typesKey],
  );

  useEffect(() => {
    if (!isActive) {
      hasLoadedRef.current = false;
      return;
    }
    void load();
  }, [isActive, load]);

  return {
    transactions: isActive ? transactions : [],
    setTransactions,
    isLoading: isActive ? isLoading : false,
    isFetching: isActive ? isFetching : false,
    error: isActive ? error : null,
    refresh: () => load({ silent: true }),
  };
}
