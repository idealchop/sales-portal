"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { dataManagementUserLabel } from "@/lib/admin/data-management";
import type { DataManagementLinkRow } from "@/lib/admin/data-management";

export function DataManagementRemoveUserDialog({
  row,
  onClose,
  onConfirm,
}: {
  row: DataManagementLinkRow;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = row.userId!;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !removing) onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [removing, onClose]);

  async function handleConfirm() {
    setRemoving(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove user collection.",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => {
          if (!removing) onClose();
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
                Remove user collection
              </p>
              <h3 className="text-lg font-semibold text-foreground">
                Remove Firestore data for {dataManagementUserLabel(row)}?
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Deletes all documents under{" "}
                <code className="rounded bg-zinc-100 px-1">users/{uid}</code>.
                Firebase Authentication is not changed.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={removing}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-lg border border-red-100 bg-red-50/40 px-3 py-2.5">
            <p className="text-sm font-medium text-red-900">User ID</p>
            <p className="mt-0.5 break-all font-mono text-sm text-red-800/80">{uid}</p>
          </div>
          <p className="text-sm text-zinc-600">
            This removes the root user document and all subcollection documents.
            The sign-in account remains active until removed separately.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={removing}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => void handleConfirm()}
            disabled={removing}
          >
            {removing ?
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Removing…
              </>
            : "Remove collection"}
          </Button>
        </div>
      </div>
    </div>
  );
}
