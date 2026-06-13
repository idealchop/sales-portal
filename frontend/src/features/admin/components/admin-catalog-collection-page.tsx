"use client";

import { Loader2, Plus, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CatalogDocumentFormDialog } from "@/features/admin/components/catalog-document-form-dialog";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { FirestoreDocumentDetailDialog } from "@/features/admin/components/firestore-document-detail-dialog";
import { useAdminCatalogCollection } from "@/hooks/use-admin-catalog-collection";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  ADMIN_CATALOG_COLLECTIONS,
  catalogDocumentActive,
  catalogDocumentDisplayName,
  catalogDocumentSubtitle,
  type AdminCatalogCollectionId,
} from "@/lib/admin/catalog-collections";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

export function AdminCatalogCollectionPage({
  collectionId,
}: {
  collectionId: AdminCatalogCollectionId;
}) {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const meta = ADMIN_CATALOG_COLLECTIONS[collectionId];
  const enabled = profile?.role === "admin";
  const { documents, isLoading, error, refresh, saveDocument, removeDocument } =
    useAdminCatalogCollection(collectionId, enabled);

  const [query, setQuery] = useState("");
  const [viewDoc, setViewDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [profile?.role, profileLoading, router]);

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return documents;
    return documents.filter((doc) => {
      const haystack = [
        doc.documentId,
        catalogDocumentDisplayName(doc.data, doc.documentId),
        catalogDocumentSubtitle(doc.data),
        JSON.stringify(doc.data),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [documents, query]);

  if (profileLoading || profile?.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Subscriptions · {collectionId}
          </p>
          <h1 className="text-2xl font-bold text-foreground">{meta.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
            {meta.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, code, or id…"
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-9 text-sm outline-none ring-[var(--primary)] focus:ring-2"
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {isLoading && documents.length === 0 ?
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading documents…
          </div>
        : filteredDocuments.length === 0 ?
          <div className="px-6 py-16 text-center text-sm text-zinc-500">
            {documents.length === 0 ?
              "No documents in this collection yet."
            : "No documents match your search."}
          </div>
        : <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Document ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredDocuments.map((doc) => {
                  const active = catalogDocumentActive(doc.data);
                  const subtitle = catalogDocumentSubtitle(doc.data);
                  return (
                    <tr
                      key={doc.path}
                      onClick={() => setViewDoc(doc)}
                      className="cursor-pointer hover:bg-zinc-50/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {catalogDocumentDisplayName(doc.data, doc.documentId)}
                        </p>
                        {subtitle && (
                          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                        {doc.documentId}
                      </td>
                      <td className="px-4 py-3">
                        {active === undefined ?
                          <span className="text-zinc-400">—</span>
                        : <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              active ?
                                "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-600",
                            )}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        }
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <FirestoreActionsMenu
                          onView={() => setViewDoc(doc)}
                          onEdit={() => setEditDoc(doc)}
                          onRemove={() => setDeleteDoc(doc)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }
      </div>

      {viewDoc && (
        <FirestoreDocumentDetailDialog
          doc={viewDoc}
          sectionTitle={meta.title}
          onClose={() => setViewDoc(null)}
          onEdit={() => {
            setEditDoc(viewDoc);
            setViewDoc(null);
          }}
          onRemove={() => {
            setDeleteDoc(viewDoc);
            setViewDoc(null);
          }}
        />
      )}

      {editDoc && (
        <CatalogDocumentFormDialog
          mode="edit"
          collectionId={collectionId}
          existingDocumentIds={documents.map((doc) => doc.documentId)}
          initialDocumentId={editDoc.documentId}
          initialData={editDoc.data}
          onClose={() => setEditDoc(null)}
          onSave={async (documentId, data) => {
            await saveDocument(documentId, data);
          }}
        />
      )}

      {deleteDoc && (
        <DeleteFirestoreDocDialog
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={async () => {
            await removeDocument(deleteDoc.documentId);
          }}
        />
      )}

      {createOpen && (
        <CatalogDocumentFormDialog
          mode="create"
          collectionId={collectionId}
          existingDocumentIds={documents.map((doc) => doc.documentId)}
          onClose={() => setCreateOpen(false)}
          onSave={async (documentId, data) => {
            await saveDocument(documentId, data);
          }}
        />
      )}
    </div>
  );
}
