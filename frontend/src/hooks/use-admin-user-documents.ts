"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export function useAdminUserDocuments(uid: string | null, enabled: boolean) {
  const [documents, setDocuments] = useState<UserFirestoreDocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!uid || !enabled) return;
    const silent = options?.silent === true && hasLoadedRef.current;
    if (!hasLoadedRef.current && !silent) setIsLoading(true);
    else setIsFetching(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        data: { documents: UserFirestoreDocumentRow[] };
      }>(`/admin/users/${uid}/documents`);
      startTransition(() => {
        setDocuments(response.data.documents);
      });
      hasLoadedRef.current = true;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load user documents.",
      );
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [uid, enabled]);

  useEffect(() => {
    if (!enabled || !uid) {
      hasLoadedRef.current = false;
      return;
    }
    void load();
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
    refresh: () => load({ silent: true }),
    isFetching,
    saveDocument,
    removeDocument,
  };
}
