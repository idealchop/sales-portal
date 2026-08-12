"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";

/**
 * Loads a business subcollection when opened. Uses initialDocuments when the
 * overview already included them; otherwise fetches the full collection.
 */
export function useAdminBusinessSubcollection(
  businessId: string | null | undefined,
  collectionId: string,
  enabled: boolean,
  initialDocuments: BusinessFirestoreDocumentRow[],
  expectedTotalCount?: number,
) {
  const initialRef = useRef(initialDocuments);
  initialRef.current = initialDocuments;

  const [documents, setDocuments] = useState<BusinessFirestoreDocumentRow[]>(
    () => initialDocuments,
  );
  const [totalCount, setTotalCount] = useState(
    () => expectedTotalCount ?? initialDocuments.length,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId || !enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        data: {
          documents: BusinessFirestoreDocumentRow[];
          totalCount: number;
        };
      }>(`/admin/businesses/${businessId}/collections/${collectionId}`);
      setDocuments(response.data.documents);
      setTotalCount(response.data.totalCount);
    } catch (err) {
      setError(
        err instanceof ApiError ?
          err.message
        : "Unable to load subcollection documents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, collectionId, enabled]);

  useEffect(() => {
    if (!enabled || !businessId) return;

    const seeded = initialRef.current;
    const expected = expectedTotalCount ?? 0;
    if (seeded.length > 0 && (expected === 0 || seeded.length >= expected)) {
      setDocuments(seeded);
      setTotalCount(expected || seeded.length);
      setIsLoading(false);
      setError(null);
      return;
    }

    void load();
  }, [businessId, collectionId, enabled, expectedTotalCount, load]);

  return {
    documents,
    totalCount,
    isLoading,
    error,
    refresh: load,
    setDocuments,
  };
}
