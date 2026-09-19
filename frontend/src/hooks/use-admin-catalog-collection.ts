"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { AdminCatalogCollectionId } from "@/lib/admin/catalog-collections";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type CatalogAuditEntry = {
  id: string;
  action: string;
  actorUid: string;
  actorEmail: string | null;
  actorRole: string | null;
  createdAt: string | null;
};

const catalogPath = (collectionId: AdminCatalogCollectionId) =>
  `/dashboard/catalog-collections/${collectionId}`;

export function useAdminCatalogCollection(
  collectionId: AdminCatalogCollectionId,
  enabled: boolean,
) {
  const [documents, setDocuments] = useState<UserFirestoreDocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{
        data: { documents: UserFirestoreDocumentRow[] };
      }>(catalogPath(collectionId));
      setDocuments(response.data.documents);
    } catch (err) {
      setError(
        err instanceof ApiError ?
          err.message
        : "Unable to load catalog documents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [collectionId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    void (async () => {
      await load();
    })();
  }, [enabled, load]);

  const upsertLocal = useCallback((saved: UserFirestoreDocumentRow) => {
    setDocuments((current) => {
      const index = current.findIndex(
        (row) => row.documentId === saved.documentId,
      );
      if (index === -1) {
        return [...current, saved].sort((a, b) =>
          String(a.data.name || a.documentId).localeCompare(
            String(b.data.name || b.documentId),
            undefined,
            { sensitivity: "base" },
          ),
        );
      }
      return current.map((row) =>
        row.documentId === saved.documentId ? saved : row,
      );
    });
  }, []);

  const saveDocument = useCallback(
    async (documentId: string, data: Record<string, unknown>) => {
      const response = await apiClient.put<{
        data: { document: UserFirestoreDocumentRow };
      }>(`${catalogPath(collectionId)}/documents`, {
        documentId,
        data,
      });
      const saved = response.data.document;
      upsertLocal(saved);
      return saved;
    },
    [collectionId, upsertLocal],
  );

  const publishDocument = useCallback(
    async (documentId: string, effectiveAt?: string) => {
      const response = await apiClient.post<{
        data: { document: UserFirestoreDocumentRow };
      }>(`${catalogPath(collectionId)}/documents/publish`, {
        documentId,
        effectiveAt: effectiveAt || null,
      });
      const saved = response.data.document;
      upsertLocal(saved);
      return saved;
    },
    [collectionId, upsertLocal],
  );

  const deactivateDocument = useCallback(
    async (documentId: string) => {
      const response = await apiClient.post<{
        data: { document: UserFirestoreDocumentRow };
      }>(`${catalogPath(collectionId)}/documents/deactivate`, {
        documentId,
      });
      const saved = response.data.document;
      upsertLocal(saved);
      return saved;
    },
    [collectionId, upsertLocal],
  );

  const listAudit = useCallback(
    async (documentId: string) => {
      const response = await apiClient.get<{
        data: { entries: CatalogAuditEntry[] };
      }>(
        `${catalogPath(collectionId)}/audit?documentId=${encodeURIComponent(documentId)}`,
      );
      return response.data.entries;
    },
    [collectionId],
  );

  const removeDocument = useCallback(
    async (documentId: string) => {
      await apiClient.delete<{ data: { deleted: boolean; path: string } }>(
        `${catalogPath(collectionId)}/documents`,
        { documentId },
      );
      setDocuments((current) =>
        current.filter((row) => row.documentId !== documentId),
      );
    },
    [collectionId],
  );

  return {
    documents: enabled ? documents : [],
    isLoading: enabled ? isLoading : false,
    error: enabled ? error : null,
    refresh: load,
    saveDocument,
    publishDocument,
    deactivateDocument,
    listAudit,
    removeDocument,
  };
}
