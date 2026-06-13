"use client";

import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parseSubscriptionListRow } from "@/lib/admin/subscription-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

export function BusinessSubscriptionListRow({
  doc,
  isLatest,
  onView,
  onEdit,
  onRemove,
}: {
  doc: UserFirestoreDocumentRow;
  isLatest: boolean;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const row = parseSubscriptionListRow(doc);

  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 bg-white px-4 py-5 last:border-b-0 transition hover:bg-zinc-50/60">
      <button
        type="button"
        onClick={onView}
        className="flex min-w-0 flex-1 items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0 space-y-2">
          <p className="text-base font-semibold leading-tight text-zinc-900">
            {row.planTitle}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-zinc-600">
              Ref: {row.reference}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {row.dateLabel}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isLatest && (
              <Badge className="h-5 border-none bg-emerald-500 px-2 text-[9px] font-bold uppercase tracking-wide text-white hover:bg-emerald-500">
                Latest
              </Badge>
            )}
            <p className="text-lg font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-xl">
              {row.priceLabel}
            </p>
          </div>
          <Badge
            className={cn(
              "h-5 px-2 text-[9px] font-semibold uppercase tracking-wide",
              row.paymentBadge.className,
            )}
          >
            {row.paymentBadge.label}
          </Badge>
        </div>
      </button>

      <FirestoreActionsMenu
        onView={onView}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    </div>
  );
}
