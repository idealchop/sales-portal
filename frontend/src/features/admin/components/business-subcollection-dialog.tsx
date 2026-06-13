"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { BusinessSubcollectionListSection } from "@/features/admin/components/business-subcollection-list-section";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

export function BusinessSubcollectionDialog({
  title,
  description,
  collectionId,
  documents,
  businessId,
  maxWidthClass = "max-w-4xl",
  onClose,
  onSaveDocument,
  onRemoveDocument,
}: {
  title: string;
  description?: string;
  collectionId: string;
  documents: UserFirestoreDocumentRow[];
  businessId?: string;
  maxWidthClass?: string;
  onClose: () => void;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80",
          maxWidthClass,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Workspace subcollection
            </p>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-5 py-5">
          {documents.length === 0 ?
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No records yet</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Documents in this subcollection will appear here.
              </p>
            </div>
          : <BusinessSubcollectionListSection
              collectionId={collectionId}
              title={title}
              documents={documents}
              businessId={businessId}
              onSaveDocument={onSaveDocument}
              onRemoveDocument={onRemoveDocument}
              hideHeader
            />
          }
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
