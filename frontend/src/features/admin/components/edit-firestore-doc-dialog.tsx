"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { userDocumentTitle } from "@/lib/admin/user-documents";

export function EditFirestoreDocDialog({
  doc,
  onClose,
  onSave,
}: {
  doc: UserFirestoreDocumentRow;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [jsonText, setJsonText] = useState(
    JSON.stringify(doc.data, null, 2),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [saving, onClose]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Document JSON must be an object.");
      }
      await onSave(parsed as Record<string, unknown>);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save document.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Edit Firestore document
            </p>
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
            disabled={saving}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            spellCheck={false}
            className="min-h-[320px] w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ?
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Saving…
              </>
            : "Save JSON"}
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
