"use client";

import { File } from "lucide-react";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parseFileListRow } from "@/lib/admin/file-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export function BusinessFileListRow({
  doc,
  onView,
  onEdit,
  onRemove,
}: {
  doc: UserFirestoreDocumentRow;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const row = parseFileListRow(doc);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 transition hover:border-zinc-300 hover:bg-zinc-50/40">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onView}
          className="flex min-w-0 flex-1 cursor-pointer gap-4 text-left"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500">
            <File className="h-5 w-5" aria-hidden />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="break-all text-sm font-semibold text-zinc-900">
              {row.filePath}
            </p>
            <p className="mt-0.5 text-sm text-zinc-500">{row.categoryLabel}</p>
            <p className="mt-1 text-xs text-zinc-400">{row.metaLabel}</p>
          </div>
        </button>

        <FirestoreActionsMenu
          onView={onView}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
