"use client";

import { Clock } from "lucide-react";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parsePrivateUsageListRow } from "@/lib/admin/private-usage-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const TABLE_HEAD_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

const DESKTOP_GRID =
  "grid-cols-[minmax(0,1fr)_70px_90px_90px_150px_40px]";

function PrivateUsageListRowDesktop({
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
  const row = parsePrivateUsageListRow(doc);

  return (
    <div
      className={cn(
        "grid items-center border-b border-zinc-100 bg-white px-4 py-3.5 last:border-b-0 transition hover:bg-zinc-50/70",
        DESKTOP_GRID,
      )}
    >
      <button type="button" onClick={onView} className="min-w-0 pr-4 text-left">
        <p className="text-sm font-semibold capitalize text-zinc-900">
          {row.periodLabel}
        </p>
        <p className="mt-0.5 font-mono text-[10px] font-medium text-zinc-400">
          {doc.documentId}
        </p>
      </button>

      <button
        type="button"
        onClick={onView}
        className="text-left text-sm font-semibold tabular-nums text-zinc-900"
      >
        {row.chatCountLabel}
      </button>

      <button
        type="button"
        onClick={onView}
        className="text-left text-sm font-semibold tabular-nums text-zinc-900"
      >
        {row.attachmentCountLabel}
      </button>

      <button
        type="button"
        onClick={onView}
        className="text-left text-sm text-zinc-600"
      >
        {row.frequencyLabel}
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

function PrivateUsageListRowMobile({
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
  const row = parsePrivateUsageListRow(doc);

  return (
    <div className="border-b border-zinc-100 bg-white p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold capitalize text-zinc-900">
            {row.periodLabel}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {row.chatCountLabel} chats · {row.attachmentCountLabel} attachments ·{" "}
            {row.frequencyLabel}
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

export function BusinessPrivateUsageListTable({
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
  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-8 text-center">
        <p className="text-sm font-medium text-zinc-800">No usage counters yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          River AI chat and attachment usage will appear here once recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div
        className={cn(
          "hidden border-b border-zinc-200 bg-zinc-100/90 lg:grid lg:px-4 lg:py-3",
          DESKTOP_GRID,
        )}
      >
        <div className={TABLE_HEAD_CLASS}>Period</div>
        <div className={TABLE_HEAD_CLASS}>Chats</div>
        <div className={TABLE_HEAD_CLASS}>Attachments</div>
        <div className={TABLE_HEAD_CLASS}>Frequency</div>
        <div className={TABLE_HEAD_CLASS}>Updated</div>
        <span className="sr-only">Actions</span>
      </div>

      <div className="hidden lg:block">
        {documents.map((doc) => (
          <PrivateUsageListRowDesktop
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
          <PrivateUsageListRowMobile
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
