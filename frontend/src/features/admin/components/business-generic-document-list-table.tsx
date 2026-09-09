"use client";

import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import {
  firestoreDocumentListTitle,
  listFirestoreDocumentHighlightFields,
  type FirestoreDocumentListField,
} from "@/lib/admin/firestore-document-list";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const TABLE_HEAD_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

const MAX_COLUMNS = 5;

function statusBadgeClass(value: string): string {
  const normalized = value.toLowerCase();
  if (
    normalized === "sent" ||
    normalized === "active" ||
    normalized === "success" ||
    normalized === "completed"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (
    normalized === "failed" ||
    normalized === "error" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (
    normalized === "partial" ||
    normalized === "pending" ||
    normalized === "warning"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function resolveColumns(
  documents: UserFirestoreDocumentRow[],
): FirestoreDocumentListField[] {
  const byKey = new Map<string, FirestoreDocumentListField>();
  for (const doc of documents) {
    for (const field of listFirestoreDocumentHighlightFields(doc, MAX_COLUMNS)) {
      if (!byKey.has(field.key)) byKey.set(field.key, field);
      if (byKey.size >= MAX_COLUMNS) break;
    }
    if (byKey.size >= MAX_COLUMNS) break;
  }
  return [...byKey.values()];
}

function fieldValue(
  doc: UserFirestoreDocumentRow,
  key: string,
): string {
  return (
    listFirestoreDocumentHighlightFields(doc, 12).find((field) => field.key === key)
      ?.display ?? "—"
  );
}

function GenericDocumentListRowDesktop({
  doc,
  columns,
  onView,
  onEdit,
  onRemove,
}: {
  doc: UserFirestoreDocumentRow;
  columns: FirestoreDocumentListField[];
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const title = firestoreDocumentListTitle(doc);

  return (
    <div
      className="grid items-center gap-3 border-b border-zinc-100 bg-white px-4 py-3 last:border-b-0 transition hover:bg-zinc-50/70"
      style={{
        gridTemplateColumns: `minmax(9rem,1.2fr) repeat(${columns.length}, minmax(0,1fr)) 2.5rem`,
      }}
    >
      <button
        type="button"
        onClick={onView}
        className="min-w-0 text-left"
        title={title}
      >
        <p className="truncate text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-400">
          {doc.documentId}
        </p>
      </button>

      {columns.map((column) => {
        const value = fieldValue(doc, column.key);
        if (column.key === "status") {
          return (
            <div key={column.key} className="min-w-0">
              <Badge
                className={cn(
                  "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  statusBadgeClass(value),
                )}
              >
                {value}
              </Badge>
            </div>
          );
        }
        return (
          <button
            key={column.key}
            type="button"
            onClick={onView}
            className="min-w-0 truncate text-left text-sm text-zinc-700"
            title={value}
          >
            {value}
          </button>
        );
      })}

      <FirestoreActionsMenu
        onView={onView}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    </div>
  );
}

function GenericDocumentListRowMobile({
  doc,
  columns,
  onView,
  onEdit,
  onRemove,
}: {
  doc: UserFirestoreDocumentRow;
  columns: FirestoreDocumentListField[];
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const title = firestoreDocumentListTitle(doc);
  const statusColumn = columns.find((column) => column.key === "status");
  const detailColumns = columns.filter((column) => column.key !== "status");

  return (
    <div className="border-b border-zinc-100 bg-white px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-900">{title}</p>
            {statusColumn ?
              <Badge
                className={cn(
                  "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  statusBadgeClass(fieldValue(doc, "status")),
                )}
              >
                {fieldValue(doc, "status")}
              </Badge>
            : null}
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-400">
            {doc.documentId}
          </p>
          {detailColumns.length > 0 ?
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {detailColumns.map((column) => (
                <div key={column.key} className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {column.label}
                  </dt>
                  <dd className="truncate text-sm text-zinc-800">
                    {fieldValue(doc, column.key)}
                  </dd>
                </div>
              ))}
            </dl>
          : null}
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

export function BusinessGenericDocumentListTable({
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
  const columns = resolveColumns(documents);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div
        className="hidden gap-3 border-b border-zinc-200 bg-zinc-100/90 px-4 py-3 lg:grid"
        style={{
          gridTemplateColumns: `minmax(9rem,1.2fr) repeat(${Math.max(columns.length, 1)}, minmax(0,1fr)) 2.5rem`,
        }}
      >
        <div className={TABLE_HEAD_CLASS}>Document</div>
        {columns.map((column) => (
          <div key={column.key} className={TABLE_HEAD_CLASS}>
            {column.label}
          </div>
        ))}
        {columns.length === 0 ?
          <div className={TABLE_HEAD_CLASS}>Details</div>
        : null}
        <span className="sr-only">Actions</span>
      </div>

      <div className="hidden lg:block">
        {documents.map((doc) => (
          <GenericDocumentListRowDesktop
            key={doc.path}
            doc={doc}
            columns={columns}
            onView={() => onView(doc)}
            onEdit={() => onEdit(doc)}
            onRemove={() => onRemove(doc)}
          />
        ))}
      </div>

      <div className="lg:hidden">
        {documents.map((doc) => (
          <GenericDocumentListRowMobile
            key={doc.path}
            doc={doc}
            columns={columns}
            onView={() => onView(doc)}
            onEdit={() => onEdit(doc)}
            onRemove={() => onRemove(doc)}
          />
        ))}
      </div>
    </div>
  );
}
