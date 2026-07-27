"use client";

import { Copy, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  dataManagementBusinessLabel,
  dataManagementUserLabel,
  type DataManagementLinkRow,
} from "@/lib/admin/data-management";
import { apiClient, ApiError } from "@/lib/api-client";

export type CloneToDemoResult = {
  demoUid: string;
  demoEmail: string;
  demoBusinessId: string;
  sourceBusinessId: string;
  sourceOwnerId: string;
  replacedPreviousClone: boolean;
  copiedDocCount: number;
  deletedDocCount: number;
};

export function DataManagementCloneToDemoDialog({
  row,
  onClose,
  onCloned,
}: {
  row: DataManagementLinkRow;
  onClose: () => void;
  onCloned?: (result: CloneToDemoResult) => void;
}) {
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CloneToDemoResult | null>(null);
  const businessId = row.businessId!;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !cloning) onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cloning, onClose]);

  async function handleConfirm() {
    setCloning(true);
    setError(null);
    try {
      const json = await apiClient.post<{ data: CloneToDemoResult }>(
        "/admin/data-management/clone-to-demo",
        { sourceBusinessId: businessId },
      );
      setResult(json.data);
      onCloned?.(json.data);
    } catch (err) {
      setError(
        err instanceof ApiError ?
          err.message
        : err instanceof Error ?
          err.message
        : "Could not clone account to demo.",
      );
    } finally {
      setCloning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => {
          if (!cloning) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Clone to demo
              </p>
              <h3 className="text-lg font-semibold text-foreground">
                {result ? "Clone complete" : "Clone this account into demo?"}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {result ?
                  "Sign in with the demo credentials below to inspect the cloned workspace."
                : <>
                    Copies{" "}
                    <span className="font-medium text-foreground">
                      {dataManagementBusinessLabel(row)}
                    </span>{" "}
                    ({dataManagementUserLabel(row)}) into{" "}
                    <code className="rounded bg-zinc-100 px-1">
                      demo@smartrefill.com
                    </code>
                    . Any previous demo clone is cleared first — the original
                    account is never deleted.
                  </>
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            disabled={cloning}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {result ?
            <div className="space-y-2 rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-sm">
              <p>
                <span className="text-[var(--muted-foreground)]">Email · </span>
                <code className="font-medium">{result.demoEmail}</code>
              </p>
              <p>
                <span className="text-[var(--muted-foreground)]">
                  Password ·{" "}
                </span>
                <code className="font-medium">smartrefilldemo</code>
              </p>
              <p>
                <span className="text-[var(--muted-foreground)]">
                  Demo business ·{" "}
                </span>
                <code className="font-medium">{result.demoBusinessId}</code>
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Copied {result.copiedDocCount.toLocaleString()} docs
                {result.replacedPreviousClone ?
                  ` · cleared previous clone (${result.deletedDocCount.toLocaleString()} docs)`
                : ""}
              </p>
            </div>
          : <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>Creates / resets Auth user demo@smartrefill.com</li>
              <li>Wipes the previous demo workspace only</li>
              <li>Copies business + owner profile data into the demo account</li>
            </ul>
          }

          {error ?
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={cloning}
            onClick={onClose}
          >
            {result ? "Close" : "Cancel"}
          </Button>
          {!result ?
            <Button
              type="button"
              className="bg-teal-700 text-white hover:bg-teal-800"
              disabled={cloning}
              onClick={() => void handleConfirm()}
            >
              {cloning ?
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cloning…
                </>
              : "Clone to demo"}
            </Button>
          : null}
        </div>
      </div>
    </div>
  );
}
