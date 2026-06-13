"use client";

import { Pencil, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  extractDocumentFields,
  formatProfileTimestamp,
} from "@/lib/admin/user-profile-display";
import {
  userDocumentTitle,
  type UserFirestoreDocumentRow,
} from "@/lib/admin/user-documents";

export function FirestoreDocumentDetailDialog({
  doc,
  sectionTitle,
  onClose,
  onEdit,
  onRemove,
  removeDisabled = false,
  removeDisabledTitle,
}: {
  doc: UserFirestoreDocumentRow;
  sectionTitle?: string;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
  removeDisabled?: boolean;
  removeDisabledTitle?: string;
}) {
  const fields = extractDocumentFields(doc.data);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            {sectionTitle && (
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {sectionTitle}
              </p>
            )}
            <h3 className="break-words text-lg font-semibold text-foreground">
              {userDocumentTitle(doc)}
            </h3>
            <p className="mt-1 break-all font-mono text-xs leading-relaxed text-zinc-500">
              {doc.path}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <dl className="divide-y divide-zinc-100">
            {fields.map((field) => {
              const value =
                field.kind === "timestamp" ?
                  formatProfileTimestamp(field.value)
                : String(field.value ?? "—");
              return (
                <div
                  key={field.key}
                  className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4"
                >
                  <dt className="text-sm font-medium text-zinc-500">
                    {field.label}
                  </dt>
                  <dd className="break-all text-sm text-foreground">{value}</dd>
                </div>
              );
            })}
          </dl>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            onClick={onRemove}
            disabled={removeDisabled}
            title={removeDisabled ? removeDisabledTitle : undefined}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
