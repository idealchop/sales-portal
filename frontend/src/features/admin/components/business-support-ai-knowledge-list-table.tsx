"use client";

import { Clock } from "lucide-react";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parseSupportAiKnowledgeListRow } from "@/lib/admin/support-ai-knowledge-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const TABLE_HEAD_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

const DESKTOP_GRID =
  "grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_120px_130px_150px_40px]";

function SupportAiKnowledgeListRowDesktop({
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
  const row = parseSupportAiKnowledgeListRow(doc);

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
        title={row.question}
      >
        <p className="line-clamp-2 text-sm font-semibold text-zinc-900">
          {row.question}
        </p>
      </button>

      <button
        type="button"
        onClick={onView}
        className="min-w-0 pr-4 text-left"
        title={row.answer}
      >
        <p className="line-clamp-3 text-sm leading-snug text-zinc-600">
          {row.answer}
        </p>
      </button>

      <button
        type="button"
        onClick={onView}
        className="min-w-0 pr-4 text-left font-mono text-[10px] font-medium text-zinc-500"
        title={row.sessionLabel}
      >
        {row.sessionLabel}
      </button>

      <button
        type="button"
        onClick={onView}
        className="min-w-0 pr-4 text-left font-mono text-[10px] font-medium text-zinc-500"
        title={row.createdByLabel}
      >
        {row.createdByLabel}
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

function SupportAiKnowledgeListRowMobile({
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
  const row = parseSupportAiKnowledgeListRow(doc);

  return (
    <div className="border-b border-zinc-100 bg-white p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold leading-snug text-zinc-900">
            {row.question}
          </p>
          <p className="mt-2 text-sm leading-snug text-zinc-600">{row.answer}</p>
          <p className="mt-2 font-mono text-[10px] font-medium text-zinc-500">
            Session {row.sessionLabel} · {row.createdByLabel}
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

export function BusinessSupportAiKnowledgeListTable({
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
        <div className={TABLE_HEAD_CLASS}>Question</div>
        <div className={TABLE_HEAD_CLASS}>Answer</div>
        <div className={TABLE_HEAD_CLASS}>Session</div>
        <div className={TABLE_HEAD_CLASS}>Created by</div>
        <div className={TABLE_HEAD_CLASS}>Timestamp</div>
        <span className="sr-only">Actions</span>
      </div>

      <div className="hidden lg:block">
        {documents.map((doc) => (
          <SupportAiKnowledgeListRowDesktop
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
          <SupportAiKnowledgeListRowMobile
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
