"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { CatalogDocumentFormFields } from "@/features/admin/components/catalog-document-form-fields";
import {
  ADMIN_CATALOG_COLLECTIONS,
  type AdminCatalogCollectionId,
} from "@/lib/admin/catalog-collections";
import {
  catalogDocumentPayloadFromForm,
  catalogFormDocumentId,
  catalogFormValuesFromDocument,
  emptyCatalogFormValues,
  validateCatalogForm,
  type CatalogFormValues,
} from "@/lib/admin/catalog-document-forms";

export function CatalogDocumentFormDialog({
  mode,
  collectionId,
  existingDocumentIds,
  initialDocumentId,
  initialData,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  collectionId: AdminCatalogCollectionId;
  existingDocumentIds: string[];
  initialDocumentId?: string;
  initialData?: Record<string, unknown>;
  onClose: () => void;
  onSave: (documentId: string, data: Record<string, unknown>) => Promise<void>;
}) {
  const meta = ADMIN_CATALOG_COLLECTIONS[collectionId];
  const [form, setForm] = useState<CatalogFormValues>(() => {
    if (mode === "edit" && initialDocumentId) {
      return catalogFormValuesFromDocument(
        collectionId,
        initialDocumentId,
        initialData ?? {},
      );
    }
    return emptyCatalogFormValues(collectionId);
  });
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
      const validationError = validateCatalogForm(form);
      if (validationError) {
        throw new Error(validationError);
      }

      const documentId = catalogFormDocumentId(form);
      if (documentId.includes("/")) {
        throw new Error("Document id cannot contain slashes.");
      }
      if (mode === "create" && existingDocumentIds.includes(documentId)) {
        throw new Error("A document with this id already exists.");
      }

      const payload = catalogDocumentPayloadFromForm(form, initialData);
      await onSave(documentId, payload);
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
        className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl max-w-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {mode === "create" ? "Add" : "Edit"} · {collectionId}
            </p>
            <h3 className="break-words text-lg font-semibold text-foreground">
              {mode === "create" ? `New ${meta.title.toLowerCase()}` : meta.title}
            </h3>
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <CatalogDocumentFormFields
            form={form}
            documentIdDisabled={mode === "edit"}
            onChange={setForm}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
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
            : mode === "create" ?
              "Create"
            : "Save changes"}
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
