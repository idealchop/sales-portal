"use client";

import { Star, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parsePortalOrderRatingListRow } from "@/lib/admin/portal-order-rating-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

function StarRating({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1;
        return (
          <Star
            key={star}
            className={cn(
              "h-3.5 w-3.5",
              star <= rating ?
                "fill-amber-400 text-amber-400"
              : "text-zinc-200",
            )}
            aria-hidden
          />
        );
      })}
    </span>
  );
}

export function BusinessPortalOrderRatingListRow({
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
  const row = parsePortalOrderRatingListRow(doc);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 transition hover:border-zinc-300 hover:bg-zinc-50/40">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onView}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <p className="truncate text-sm font-semibold text-zinc-900">
            {row.customerName}
          </p>
          <p className="mt-0.5 truncate text-sm text-zinc-500">
            {row.contactLabel}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{row.dateLabel}</p>
          {row.feedback && (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              &ldquo;{row.feedback}&rdquo;
            </p>
          )}
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {row.serviceRating > 0 && <StarRating rating={row.serviceRating} />}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {row.recommends && (
              <Badge className="gap-1 border-emerald-200 bg-emerald-50 font-normal text-emerald-800 hover:bg-emerald-50">
                <ThumbsUp className="h-3 w-3" aria-hidden />
                Recommends
              </Badge>
            )}
            <Badge className="border-zinc-200 bg-white font-normal text-zinc-700">
              {row.sourceLabel}
            </Badge>
          </div>
        </div>

        <FirestoreActionsMenu
          onView={onView}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
