"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export function useAdminUserDocuments(uid: string | null, enabled: boolean) {
  const [documents, setDocuments] = useState<UserFirestoreDocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid || !enabled) return;
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        data: { documents: UserFirestoreDocumentRow[] };
      }>(`/admin/users/${uid}/documents`);
      setDocuments(response.data.documents);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load user documents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [uid, enabled]);

  useEffect(() => {
    if (!enabled || !uid) return;
    void (async () => {
      await load();
    })();
  }, [enabled, uid, load]);

  const saveDocument = useCallback(
    async (path: string, data: Record<string, unknown>) => {
      if (!uid) throw new Error("User id is required.");
      const response = await apiClient.put<{
        data: { document: UserFirestoreDocumentRow };
      }>(`/admin/users/${uid}/documents`, { path, data });
      setDocuments((current) =>
        current.map((row) =>
          row.path === path ? response.data.document : row,
        ),
      );
      return response.data.document;
    },
    [uid],
  );

  const removeDocument = useCallback(
    async (path: string) => {
      if (!uid) throw new Error("User id is required.");
      await apiClient.delete<{ data: { deleted: boolean; path: string } }>(
        `/admin/users/${uid}/documents`,
        { path },
      );
      setDocuments((current) => current.filter((row) => row.path !== path));
    },
    [uid],
  );

  return {
    documents: enabled && uid ? documents : [],
    isLoading: enabled && uid ? isLoading : false,
    error: enabled && uid ? error : null,
    refresh: load,
    saveDocument,
    removeDocument,
  };
}
