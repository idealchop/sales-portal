"use client";

import { ChevronDown, FileJson, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { useAdminUserDocuments } from "@/hooks/use-admin-user-documents";
import {
  userDocumentPreview,
  userDocumentTitle,
  type UserFirestoreDocumentRow,
} from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

function FirestoreDocCard({
  doc,
  onEdit,
  onDelete,
  variant = "default",
}: {
  doc: UserFirestoreDocumentRow;
  onEdit: () => void;
  onDelete: () => void;
  variant?: "default" | "profile";
}) {
  const [open, setOpen] = useState(variant === "profile");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-white",
        variant === "profile" ?
          "border-zinc-100 shadow-sm"
        : "border-zinc-200",
      )}
    >
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <FileJson className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-700">
            {userDocumentTitle(doc)}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-zinc-400 transition",
              open && "rotate-180",
            )}
          />
        </button>
        <FirestoreActionsMenu
          onEdit={onEdit}
          onRemove={onDelete}
          removeDisabled={doc.isRoot}
          removeDisabledTitle="Root user document cannot be deleted"
        />
      </div>
      {open && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800">
          {userDocumentPreview(doc)}
        </pre>
      )}
    </div>
  );
}

export function UserFirestoreDocumentsPanel({
  uid,
  enabled,
  compact = false,
  variant = "default",
}: {
  uid: string;
  enabled: boolean;
  compact?: boolean;
  variant?: "default" | "profile";
}) {
  const {
    documents,
    isLoading,
    error,
    refresh,
    saveDocument,
    removeDocument,
  } = useAdminUserDocuments(uid, enabled);
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );

  if (!enabled) return null;

  return (
    <div className={cn(!compact && "mt-4 space-y-3 border-t border-zinc-100 pt-4", "space-y-3")}>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">User collection</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Firestore documents under <code className="rounded bg-zinc-100 px-1">users/{uid}</code>
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className={cn("mr-1 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      )}
      {compact && variant !== "profile" && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className={cn("mr-1 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      )}
      {variant === "profile" && (
        <div className="mb-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className={cn("mr-1 h-4 w-4", isLoading && "animate-spin")} />
            Refresh documents
          </Button>
        </div>
      )}

      {isLoading && documents.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">Loading documents…</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!isLoading && documents.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
          No Firestore documents found for this user.
        </div>
      )}

      <div className="space-y-3">
        {documents.map((doc) => (
          <FirestoreDocCard
            key={doc.path}
            doc={doc}
            variant={variant}
            onEdit={() => setEditDoc(doc)}
            onDelete={() => setDeleteDoc(doc)}
          />
        ))}
      </div>

      {editDoc && (
        <EditFirestoreDocDialog
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={async (data) => {
            await saveDocument(editDoc.path, data);
          }}
        />
      )}

      {deleteDoc && (
        <DeleteFirestoreDocDialog
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={async () => {
            await removeDocument(deleteDoc.path);
          }}
        />
      )}
    </div>
  );
}
