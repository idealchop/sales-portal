"use client";

import { Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parseAlertDeliveryListRow } from "@/lib/admin/alert-delivery-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const TABLE_HEAD_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

const DESKTOP_GRID =
  "grid-cols-[minmax(0,1.4fr)_88px_88px_90px_110px_150px_40px]";

function AlertDeliveryListRowDesktop({
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
  const row = parseAlertDeliveryListRow(doc);

  return (
    <div
      className={cn(
        "grid items-center border-b border-zinc-100 bg-white px-4 py-3.5 last:border-b-0 transition hover:bg-zinc-50/70",
        DESKTOP_GRID,
      )}
    >
      <button
        type="button"
        onClick={onView}
        className="min-w-0 pr-4 text-left"
        title={row.categoryLabel}
      >
        <p className="truncate text-sm font-semibold text-zinc-900">
          {row.categoryLabel}
        </p>
        {row.detailSummary ?
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {row.detailSummary}
          </p>
        : null}
      </button>

      <div>
        <Badge
          className={cn(
            "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            row.channelClassName,
          )}
        >
          {row.channelLabel}
        </Badge>
      </div>

      <div>
        <Badge
          className={cn(
            "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            row.statusClassName,
          )}
        >
          {row.statusLabel}
        </Badge>
      </div>

      <button
        type="button"
        onClick={onView}
        className="min-w-0 pr-2 text-left text-sm text-zinc-600"
      >
        {row.audienceLabel}
      </button>

      <button
        type="button"
        onClick={onView}
        className="flex min-w-0 items-center gap-1.5 text-left text-zinc-600"
      >
        <Users className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        <span className="truncate text-xs font-medium">{row.countsLabel}</span>
      </button>

      <button
        type="button"
        onClick={onView}
        className="flex min-w-0 items-center gap-1.5 text-left text-zinc-500"
      >
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-xs font-medium">{row.timestampLabel}</span>
      </button>

      <FirestoreActionsMenu
        onView={onView}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    </div>
  );
}

function AlertDeliveryListRowMobile({
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
  const row = parseAlertDeliveryListRow(doc);

  return (
    <div className="border-b border-zinc-100 bg-white p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                row.channelClassName,
              )}
            >
              {row.channelLabel}
            </Badge>
            <Badge
              className={cn(
                "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                row.statusClassName,
              )}
            >
              {row.statusLabel}
            </Badge>
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug text-zinc-900">
            {row.categoryLabel}
          </p>
          {row.detailSummary ?
            <p className="mt-1 text-sm leading-snug text-zinc-600">
              {row.detailSummary}
            </p>
          : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500">
            <span className="text-xs font-medium">{row.audienceLabel}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {row.countsLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {row.timestampLabel}
            </span>
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

export function BusinessAlertDeliveryListTable({
  documents,
  onView,
  onEdit,
  onRemove,
}: {
  documents: UserFirestoreDocumentRow[];
  onView: (doc: UserFirestoreDocumentRow) => void;
  onEdit: (doc: UserFirestoreDocumentRow) => void;
  onRemove: (doc: UserFirestoreDocumentRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div
        className={cn(
          "hidden border-b border-zinc-200 bg-zinc-100/90 lg:grid lg:px-4 lg:py-3",
          DESKTOP_GRID,
        )}
      >
        <div className={TABLE_HEAD_CLASS}>Alert</div>
        <div className={TABLE_HEAD_CLASS}>Channel</div>
        <div className={TABLE_HEAD_CLASS}>Status</div>
        <div className={TABLE_HEAD_CLASS}>Audience</div>
        <div className={TABLE_HEAD_CLASS}>Delivery</div>
        <div className={TABLE_HEAD_CLASS}>Sent</div>
        <span className="sr-only">Actions</span>
      </div>

      <div className="hidden lg:block">
        {documents.map((doc) => (
          <AlertDeliveryListRowDesktop
            key={doc.path}
            doc={doc}
            onView={() => onView(doc)}
            onEdit={() => onEdit(doc)}
            onRemove={() => onRemove(doc)}
          />
        ))}
      </div>

      <div className="lg:hidden">
        {documents.map((doc) => (
          <AlertDeliveryListRowMobile
            key={doc.path}
            doc={doc}
            onView={() => onView(doc)}
            onEdit={() => onEdit(doc)}
            onRemove={() => onRemove(doc)}
          />
        ))}
      </div>
    </div>
  );
}
