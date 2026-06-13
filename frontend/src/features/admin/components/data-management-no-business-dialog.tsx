"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  dataManagementUserLabel,
  type DataManagementLinkRow,
} from "@/lib/admin/data-management";

export function DataManagementNoBusinessDialog({
  row,
  onClose,
}: {
  row: DataManagementLinkRow;
  onClose: () => void;
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="border-b border-zinc-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">
            No linked workspace
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {dataManagementUserLabel(row)} is not connected to a business.
          </p>
        </div>
        <div className="flex justify-end px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
