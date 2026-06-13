"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parseAiToolRunListRow } from "@/lib/admin/ai-tool-run-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const TABLE_HEAD_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

const DESKTOP_GRID = "grid-cols-[minmax(0,1fr)_150px_40px]";

function AiToolRunListRowDesktop({
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
  const row = parseAiToolRunListRow(doc);

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
        title={`${row.title} · ${row.toolLabel} · ${row.aiModel}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-zinc-900">{row.title}</p>
          <Badge
            className={cn(
              "shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              row.riskLevelClassName,
            )}
          >
            {row.riskLevelLabel}
          </Badge>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-zinc-500">
          {row.toolLabel}
        </p>
        <p
          className="mt-0.5 truncate font-mono text-[10px] font-medium text-zinc-400"
          title={row.aiModel}
        >
          {row.aiModel}
        </p>
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

function AiToolRunListRowMobile({
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
  const row = parseAiToolRunListRow(doc);

  return (
    <div className="border-b border-zinc-100 bg-white p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold leading-snug text-zinc-900">
              {row.title}
            </p>
            <Badge
              className={cn(
                "shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                row.riskLevelClassName,
              )}
            >
              {row.riskLevelLabel}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">{row.toolLabel}</p>
          <p
            className="mt-1 truncate font-mono text-[10px] font-medium text-zinc-400"
            title={row.aiModel}
          >
            {row.aiModel}
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

export function BusinessAiToolRunListTable({
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
        <div className={TABLE_HEAD_CLASS}>Details</div>
        <div className={TABLE_HEAD_CLASS}>Timestamp</div>
        <span className="sr-only">Actions</span>
      </div>

      <div className="hidden lg:block">
        {documents.map((doc) => (
          <AiToolRunListRowDesktop
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
          <AiToolRunListRowMobile
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
