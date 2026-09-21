"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { CatalogDocumentFormFields } from "@/features/admin/components/catalog-document-form-fields";
import {
  isVersionedCatalogCollection,
  type AdminCatalogCollectionId,
} from "@/lib/admin/catalog-collections";
import {
  catalogDocumentPayloadFromForm,
  catalogFormDocumentId,
  catalogFormValuesFromDocument,
  emptyCatalogFormValues,
  applyAddonPreset,
  filledPlanFormForCode,
  validateCatalogForm,
  type CatalogFormValues,
} from "@/lib/admin/catalog-document-forms";

function catalogDialogCopy(
  collectionId: AdminCatalogCollectionId,
  mode: "create" | "edit",
): { eyebrow: string; title: string } {
  if (collectionId === "subscription_plans") {
    return {
      eyebrow: "Subscriptions",
      title: mode === "create" ? "Add a plan" : "Edit plan",
    };
  }
  if (collectionId === "subscription_trial_policy") {
    return {
      eyebrow: "Subscriptions",
      title: mode === "create" ? "Set up the free trial" : "Edit free trial",
    };
  }
  if (collectionId === "subscription_addons") {
    return {
      eyebrow: "Subscriptions",
      title: mode === "create" ? "Add an add-on" : "Edit add-on",
    };
  }
  if (collectionId === "vouchers_affiliates") {
    return {
      eyebrow: "Subscriptions",
      title: mode === "create" ? "Add a voucher or affiliate" : "Edit voucher or affiliate",
    };
  }
  if (collectionId === "product_icons") {
    return {
      eyebrow: "SmartRefill config",
      title: mode === "create" ? "Add a product icon" : "Edit product icon",
    };
  }
  return {
    eyebrow: mode === "create" ? "Add" : "Edit",
    title: mode === "create" ? "New catalog document" : "Edit catalog document",
  };
}

export function CatalogDocumentFormDialog({
  mode,
  collectionId,
  existingDocumentIds,
  initialDocumentId,
  initialData,
  createPresetCode,
  createPrefill,
  onClose,
  onSave,
  onPublish,
}: {
  mode: "create" | "edit";
  collectionId: AdminCatalogCollectionId;
  existingDocumentIds: string[];
  initialDocumentId?: string;
  initialData?: Record<string, unknown>;
  createPresetCode?: string;
  createPrefill?: CatalogFormValues;
  onClose: () => void;
  onSave: (documentId: string, data: Record<string, unknown>) => Promise<void>;
  onPublish?: (documentId: string, data: Record<string, unknown>) => Promise<void>;
}) {
  const copy = catalogDialogCopy(collectionId, mode);
  const [form, setForm] = useState<CatalogFormValues>(() => {
    if (mode === "edit" && initialDocumentId) {
      return catalogFormValuesFromDocument(
        collectionId,
        initialDocumentId,
        initialData ?? {},
      );
    }
    if (createPrefill) return createPrefill;
    if (collectionId === "subscription_plans" && createPresetCode) {
      const filled = filledPlanFormForCode(createPresetCode);
      if (filled) return { collectionId, values: filled };
    }
    if (collectionId === "subscription_addons" && createPresetCode) {
      const empty = emptyCatalogFormValues("subscription_addons");
      if (empty.collectionId === "subscription_addons") {
        const filled = applyAddonPreset(empty.values, createPresetCode);
        if (filled) return { collectionId, values: filled };
      }
    }
    if (
      collectionId === "vouchers_affiliates" &&
      (createPresetCode === "voucher" || createPresetCode === "affiliate")
    ) {
      const empty = emptyCatalogFormValues("vouchers_affiliates");
      if (empty.collectionId === "vouchers_affiliates") {
        return {
          collectionId,
          values: { ...empty.values, kind: createPresetCode },
        };
      }
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

  async function handleSave(publish = false) {
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
        throw new Error(
          collectionId === "subscription_plans" ?
            "That plan is already in the list."
          : collectionId === "subscription_addons" ?
            "That add-on is already in the list."
          : collectionId === "vouchers_affiliates" ?
            "That code is already in the list."
          : "That item is already in the list.",
        );
      }

      const payload = catalogDocumentPayloadFromForm(form, initialData);
      if (publish && onPublish) {
        await onPublish(documentId, payload);
      } else {
        await onSave(documentId, payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save document.");
    } finally {
      setSaving(false);
    }
  }

  const versioned = isVersionedCatalogCollection(collectionId);

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
              {copy.eyebrow}
            </p>
            <h3 className="break-words text-lg font-semibold text-foreground">
              {copy.title}
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

        <div className="flex flex-col gap-3 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            {versioned ?
              "Save draft keeps this here only. Publish updates SmartRefill — no developer needed."
            : "Save updates SmartRefill right away — no developer needed."}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant={versioned ? "outline" : "primary"}
              onClick={() => void handleSave(false)}
              disabled={saving}
            >
              {saving ?
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Saving…
                </>
              : versioned ?
                "Save draft"
              : "Save"}
            </Button>
            {versioned && onPublish ?
              <Button onClick={() => void handleSave(true)} disabled={saving}>
                Publish
              </Button>
            : null}
          </div>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
