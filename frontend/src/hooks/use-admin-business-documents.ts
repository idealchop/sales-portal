"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";

export function useAdminBusinessDocuments(
  businessId: string | null,
  enabled: boolean,
) {
  const [documents, setDocuments] = useState<BusinessFirestoreDocumentRow[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId || !enabled) return;
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        data: { documents: BusinessFirestoreDocumentRow[] };
      }>(`/admin/businesses/${businessId}/documents`);
      setDocuments(response.data.documents);
    } catch (err) {
      setError(
        err instanceof ApiError ?
          err.message
        : "Unable to load business documents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [businessId, enabled]);

  useEffect(() => {
    if (!enabled || !businessId) return;
    void (async () => {
      await load();
    })();
  }, [enabled, businessId, load]);

  const saveDocument = useCallback(
    async (path: string, data: Record<string, unknown>) => {
      if (!businessId) throw new Error("Business id is required.");
      const response = await apiClient.put<{
        data: { document: BusinessFirestoreDocumentRow };
      }>(`/admin/businesses/${businessId}/documents`, { path, data });
      setDocuments((current) =>
        current.map((row) =>
          row.path === path ? response.data.document : row,
        ),
      );
      return response.data.document;
    },
    [businessId],
  );

  const removeDocument = useCallback(
    async (path: string) => {
      if (!businessId) throw new Error("Business id is required.");
      await apiClient.delete<{ data: { deleted: boolean; path: string } }>(
        `/admin/businesses/${businessId}/documents`,
        { path },
      );
      setDocuments((current) => current.filter((row) => row.path !== path));
    },
    [businessId],
  );

  const removeBusinessTree = useCallback(async () => {
    if (!businessId) throw new Error("Business id is required.");
    const response = await apiClient.delete<{
      data: { deletedPaths: string[] };
    }>(`/admin/businesses/${businessId}/firestore-tree`);
    setDocuments([]);
    return response.data.deletedPaths;
  }, [businessId]);

  return {
    documents: enabled && businessId ? documents : [],
    isLoading: enabled && businessId ? isLoading : false,
    error: enabled && businessId ? error : null,
    refresh: load,
    saveDocument,
    removeDocument,
    removeBusinessTree,
  };
}
