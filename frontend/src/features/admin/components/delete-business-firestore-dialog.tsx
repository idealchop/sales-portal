"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export function DeleteBusinessFirestoreDialog({
  businessName,
  businessId,
  subcollectionCount,
  onClose,
  onConfirm,
}: {
  businessName: string;
  businessId: string;
  subcollectionCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(
        err instanceof Error ? err.message : "Could not delete business workspace.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
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
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Delete workspace
              </p>
              <h3 className="text-lg font-semibold text-foreground">
                Remove {businessName}?
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                This permanently deletes the Firestore business record and cannot
                be undone.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-lg border border-red-100 bg-red-50/40 px-3 py-2.5">
            <p className="text-sm font-medium text-red-900">
              All subcollections will be deleted permanently.
            </p>
            <p className="mt-1 text-sm text-red-800/80">
              Members, subscriptions, audit logs, notifications, and every other
              subcollection under this workspace will be removed.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p>
              <span className="font-medium">Business ID:</span> {businessId}
            </p>
            {subcollectionCount > 0 && (
              <p className="mt-1">
                <span className="font-medium">Subcollections affected:</span>{" "}
                {subcollectionCount}
              </p>
            )}
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
            disabled={deleting}
          >
            {deleting ?
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Deleting…
              </>
            : "Delete workspace"}
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
