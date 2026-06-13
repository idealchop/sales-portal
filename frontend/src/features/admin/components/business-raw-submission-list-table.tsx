"use client";

import { Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parseRawSubmissionListRow } from "@/lib/admin/raw-submission-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const TABLE_HEAD_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

function RawSubmissionListRowDesktop({
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
  const row = parseRawSubmissionListRow(doc);

  return (
    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_90px_150px_130px_40px] items-center border-b border-zinc-100 bg-white px-4 py-3.5 last:border-b-0 transition hover:bg-zinc-50/70">
      <button
        type="button"
        onClick={onView}
        className="flex min-w-0 items-center gap-3 pr-4 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          <User className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {row.customerName}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {row.customerSubtitle}
          </p>
        </div>
      </button>

      <button type="button" onClick={onView} className="min-w-0 pr-4 text-left">
        <Badge className="w-fit border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
          {row.submissionTypeLabel}
        </Badge>
        <p className="mt-1.5 break-all font-mono text-[10px] font-semibold tracking-tight text-zinc-800">
          {row.referenceLabel}
        </p>
        <p className="mt-1 text-xs font-medium text-zinc-500">
          {row.transactionSummary}
        </p>
      </button>

      <button
        type="button"
        onClick={onView}
        className="text-left text-sm font-semibold tabular-nums text-zinc-900"
      >
        {row.totalLabel}
      </button>

      <button
        type="button"
        onClick={onView}
        className="flex min-w-0 items-center gap-1.5 text-left text-zinc-500"
      >
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-xs font-medium">{row.orderedAtLabel}</span>
      </button>

      <div>
        <Badge
          className={cn(
            "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            row.statusClassName,
          )}
        >
          {row.statusLabel}
        </Badge>
      </div>

      <FirestoreActionsMenu
        onView={onView}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    </div>
  );
}

function RawSubmissionListRowMobile({
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
  const row = parseRawSubmissionListRow(doc);

  return (
    <div className="border-b border-zinc-100 bg-white p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <User className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {row.customerName}
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {row.customerSubtitle}
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

      <button type="button" onClick={onView} className="mt-3 w-full text-left">
        <Badge className="border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
          {row.submissionTypeLabel}
        </Badge>
        <p className="mt-2 break-all font-mono text-[10px] font-semibold text-zinc-800">
          {row.referenceLabel}
        </p>
        <p className="mt-1 text-xs font-medium text-zinc-500">
          {row.transactionSummary}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="text-xs font-medium">{row.orderedAtLabel}</span>
          </div>
          <span className="text-sm font-semibold tabular-nums text-zinc-900">
            {row.totalLabel}
          </span>
        </div>
        <div className="mt-3">
          <Badge
            className={cn(
              "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
              row.statusClassName,
            )}
          >
            {row.statusLabel}
          </Badge>
        </div>
      </button>
    </div>
  );
}

export function BusinessRawSubmissionListTable({
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
      <div className="hidden border-b border-zinc-200 bg-zinc-100/90 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_90px_150px_130px_40px] lg:px-4 lg:py-3">
        <div className={cn(TABLE_HEAD_CLASS, "pl-1")}>Customer</div>
        <div className={TABLE_HEAD_CLASS}>Transaction</div>
        <div className={TABLE_HEAD_CLASS}>Total</div>
        <div className={TABLE_HEAD_CLASS}>Ordered at</div>
        <div className={TABLE_HEAD_CLASS}>Status</div>
        <span className="sr-only">Actions</span>
      </div>

      <div className="hidden lg:block">
        {documents.map((doc) => (
          <RawSubmissionListRowDesktop
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
          <RawSubmissionListRowMobile
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
