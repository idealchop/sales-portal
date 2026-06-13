"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parseAuditLogListRow } from "@/lib/admin/audit-log-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const TABLE_HEAD_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

function AuditLogListRowDesktop({
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
  const row = parseAuditLogListRow(doc);

  return (
    <div className="grid grid-cols-[90px_minmax(0,1.6fr)_140px_170px_40px] items-center border-b border-zinc-100 bg-white px-4 py-3.5 last:border-b-0 transition hover:bg-zinc-50/70">
      <div>
        <Badge
          className={cn(
            "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            row.levelClassName,
          )}
        >
          {row.level}
        </Badge>
      </div>

      <button
        type="button"
        onClick={onView}
        className="min-w-0 pr-4 text-left"
        title={row.message}
      >
        <p className="line-clamp-2 text-sm font-medium text-zinc-900">
          {row.message}
        </p>
      </button>

      <button
        type="button"
        onClick={onView}
        className="min-w-0 pr-4 text-left text-sm text-zinc-600"
      >
        {row.typeLabel}
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

function AuditLogListRowMobile({
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
  const row = parseAuditLogListRow(doc);

  return (
    <div className="border-b border-zinc-100 bg-white p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                row.levelClassName,
              )}
            >
              {row.level}
            </Badge>
            <span className="text-xs text-zinc-500">{row.typeLabel}</span>
          </div>
          <p className="mt-2 text-sm font-medium leading-snug text-zinc-900">
            {row.message}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-zinc-500">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="text-xs font-medium">{row.timestampLabel}</span>
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

export function BusinessAuditLogListTable({
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
      <div className="hidden border-b border-zinc-200 bg-zinc-100/90 lg:grid lg:grid-cols-[90px_minmax(0,1.6fr)_140px_170px_40px] lg:px-4 lg:py-3">
        <div className={TABLE_HEAD_CLASS}>Level</div>
        <div className={TABLE_HEAD_CLASS}>Message</div>
        <div className={TABLE_HEAD_CLASS}>Type</div>
        <div className={TABLE_HEAD_CLASS}>Timestamp</div>
        <span className="sr-only">Actions</span>
      </div>

      <div className="hidden lg:block">
        {documents.map((doc) => (
          <AuditLogListRowDesktop
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
          <AuditLogListRowMobile
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
