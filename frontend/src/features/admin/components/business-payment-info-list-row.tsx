"use client";

import { QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parsePaymentInfoListRow } from "@/lib/admin/payment-info-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export function BusinessPaymentInfoListRow({
  doc,
  onView,
  onEdit,
  onRemove,
}: {
  doc: UserFirestoreDocumentRow;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const row = parsePaymentInfoListRow(doc);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 transition hover:border-zinc-300 hover:bg-zinc-50/40">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onView}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <div className="flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              {row.qrCodeUrl ?
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.qrCodeUrl}
                  alt={`${row.displayName} QR code`}
                  className="h-full w-full object-contain p-1"
                />
              : <div className="flex h-full w-full items-center justify-center bg-zinc-50 text-zinc-300">
                  <QrCode className="h-8 w-8" aria-hidden />
                </div>
              }
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {row.displayName}
                </p>
                {row.isPrimary && (
                  <Badge className="border-none bg-teal-600 font-normal text-white hover:bg-teal-600">
                    Primary
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-zinc-500">
                {row.paymentTypeLabel}
              </p>
              <p className="mt-1 font-mono text-sm tracking-tight text-zinc-800">
                {row.accountNumber}
              </p>
            </div>
          </div>
        </button>

        <FirestoreActionsMenu
          onView={onView}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
