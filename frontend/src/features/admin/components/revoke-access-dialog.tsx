"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function RevokeAccessDialog({
  displayName,
  email,
  revoking,
  onClose,
  onConfirm,
}: {
  displayName: string;
  email?: string;
  revoking: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !revoking) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [revoking, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => {
          if (!revoking) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Revoke access
              </p>
              <h3 className="text-lg font-semibold text-foreground">
                Block {displayName || email || "this user"}?
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                They will be signed out and unable to use Sales Portal or
                SmartRefill until access is restored in Permissions.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
            disabled={revoking}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-5 py-4">
          {revoking ?
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
              Revoking access…
            </div>
          : <p className="text-sm text-zinc-600">
              This marks all assigned apps as revoked. It does not delete their
              account or Firestore data.
            </p>
          }
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={revoking}>
            Cancel
          </Button>
          <Button
            className="bg-amber-600 text-white hover:bg-amber-700"
            onClick={onConfirm}
            disabled={revoking}
          >
            {revoking ? "Revoking…" : "Revoke access"}
          </Button>
        </div>
      </div>
    </div>
  );
}
