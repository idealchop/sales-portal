"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  describeUserDocumentDelete,
  userDocumentPreview,
  type UserFirestoreDocumentRow,
} from "@/lib/admin/user-documents";

export function DeleteFirestoreDocDialog({
  doc,
  onClose,
  onConfirm,
}: {
  doc: UserFirestoreDocumentRow;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const impact = describeUserDocumentDelete(doc);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [deleting, onClose]);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete document.");
    } finally {
      setDeleting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => {
          if (!deleting) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Delete document
              </p>
              <h3 className="break-words text-lg font-semibold text-foreground">
                {impact.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {impact.summary}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            onClick={onClose}
            disabled={deleting}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto px-5 py-4">
          {impact.items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-red-100 bg-red-50/40 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-red-900">{item.label}</p>
              {item.detail && (
                <p className="mt-0.5 break-all text-sm text-red-800/80">{item.detail}</p>
              )}
            </div>
          ))}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Document preview
            </p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-zinc-700">
              {userDocumentPreview(doc)}
            </pre>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => void handleConfirm()}
            disabled={deleting || doc.isRoot}
          >
            {deleting ?
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Deleting…
              </>
            : "Delete document"}
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
