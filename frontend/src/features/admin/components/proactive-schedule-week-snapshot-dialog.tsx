"use client";

import { CalendarDays, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { FirestoreDocumentDetailDialog } from "@/features/admin/components/firestore-document-detail-dialog";
import {
  getProactiveScheduleSuggestions,
  parseProactiveScheduleSnapshotListRow,
  parseProactiveScheduleSuggestionRow,
  proactiveScheduleSuggestionSearchText,
  sortProactiveScheduleSnapshotDocuments,
  type ProactiveScheduleSuggestion,
} from "@/lib/admin/proactive-schedule-week-snapshot-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";

const SUGGESTION_PAGE_SIZE = 10;

function SnapshotMetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] leading-none">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="whitespace-nowrap font-medium text-zinc-700">{value}</span>
    </div>
  );
}

function SuggestionsSection({
  suggestions,
  query,
  resetKey,
}: {
  suggestions: ProactiveScheduleSuggestion[];
  query: string;
  resetKey: string;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((suggestion) =>
      proactiveScheduleSuggestionSearchText(suggestion).includes(q),
    );
  }, [query, suggestions]);

  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    totalItems,
    hasPagination,
  } = usePagination(filtered, SUGGESTION_PAGE_SIZE, `${resetKey}|${query}`);

  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No generated suggestions in this snapshot.
      </p>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No suggestions match your search.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {paginatedItems.map((suggestion) => {
        const row = parseProactiveScheduleSuggestionRow(suggestion);
        return (
          <div
            key={suggestion.id || `${suggestion.customerId}-${suggestion.kind}-${suggestion.scheduledDate}`}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {row.customerName}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {row.scheduledDateLabel}
                </p>
              </div>
              <Badge
                className={cn(
                  "shrink-0 font-normal",
                  suggestion.kind === "collection" ?
                    "border-sky-200 bg-sky-50 text-sky-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
                )}
              >
                {row.kindLabel}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-zinc-700">{row.itemsLabel}</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {row.rationale}
            </p>
          </div>
        );
      })}
      {hasPagination && (
        <ListPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={SUGGESTION_PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export function ProactiveScheduleWeekSnapshotDialog({
  documents: initialDocuments,
  onClose,
  onSaveDocument,
  onRemoveDocument,
}: {
  documents: UserFirestoreDocumentRow[];
  onClose: () => void;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [documentsSource, setDocumentsSource] = useState(initialDocuments);
  const sortedDocuments = useMemo(
    () => sortProactiveScheduleSnapshotDocuments(documents),
    [documents],
  );
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    sortedDocuments[0]?.documentId ?? null,
  );
  const effectiveSelectedSnapshotId =
    selectedSnapshotId &&
    sortedDocuments.some((doc) => doc.documentId === selectedSnapshotId) ?
      selectedSnapshotId
    : sortedDocuments[0]?.documentId ?? null;
  const [query, setQuery] = useState("");
  const [querySnapshotId, setQuerySnapshotId] = useState<string | null>(
    effectiveSelectedSnapshotId,
  );
  if (documentsSource !== initialDocuments) {
    setDocumentsSource(initialDocuments);
    setDocuments(initialDocuments);
  }
  if (querySnapshotId !== effectiveSelectedSnapshotId) {
    setQuerySnapshotId(effectiveSelectedSnapshotId);
    setQuery("");
  }
  const [selectedDoc, setSelectedDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );

  const selectedSnapshot =
    sortedDocuments.find(
      (doc) => doc.documentId === effectiveSelectedSnapshotId,
    ) ??
    sortedDocuments[0] ??
    null;

  const selectedRow =
    selectedSnapshot ?
      parseProactiveScheduleSnapshotListRow(selectedSnapshot)
    : null;
  const suggestions =
    selectedSnapshot ? getProactiveScheduleSuggestions(selectedSnapshot) : [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editDoc || deleteDoc) return;
      if (selectedDoc) {
        setSelectedDoc(null);
        return;
      }
      onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteDoc, editDoc, onClose, selectedDoc]);

  async function handleSave(
    doc: UserFirestoreDocumentRow,
    data: Record<string, unknown>,
  ) {
    const updated = await onSaveDocument(doc.path, data);
    setDocuments((current) =>
      current.map((row) => (row.path === doc.path ? updated : row)),
    );
    if (selectedDoc?.path === doc.path) {
      setSelectedDoc(updated);
    }
  }

  async function handleDelete(path: string) {
    await onRemoveDocument(path);
    setDocuments((current) => current.filter((row) => row.path !== path));
  }

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[75] flex items-end justify-center p-4 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#fafafa] shadow-2xl ring-1 ring-zinc-200/80"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Proactive schedule
                </p>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Week snapshots
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="border-b border-zinc-100 bg-white lg:border-b-0 lg:border-r">
                <div className="max-h-[40vh] overflow-y-auto p-3 lg:max-h-none lg:h-full">
                  {sortedDocuments.length === 0 ?
                    <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500">
                      No week snapshots yet.
                    </div>
                  : sortedDocuments.map((snapshot) => {
                      const row = parseProactiveScheduleSnapshotListRow(snapshot);
                      const isSelected =
                        selectedSnapshot?.documentId === snapshot.documentId;

                      return (
                        <button
                          key={snapshot.path}
                          type="button"
                          onClick={() => setSelectedSnapshotId(snapshot.documentId)}
                          className={cn(
                            "mb-2 w-full rounded-xl border p-3 text-left transition last:mb-0",
                            isSelected ?
                              "border-teal-200 bg-teal-50/40 ring-1 ring-teal-100"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-zinc-200/80">
                              <CalendarDays className="h-4 w-4" aria-hidden />
                            </div>
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
                              {row.windowLabel}
                            </p>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            <SnapshotMetaRow
                              label="Generated"
                              value={row.generatedAtLabel}
                            />
                            <SnapshotMetaRow
                              label="Expires"
                              value={row.expireAtLabel}
                            />
                            <SnapshotMetaRow
                              label="Total generated"
                              value={String(row.suggestionCount)}
                            />
                          </div>
                        </button>
                      );
                    })
                  }
                </div>
              </aside>

              <div className="min-h-0 overflow-y-auto p-5">
                {!selectedSnapshot || !selectedRow ?
                  <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white text-sm text-zinc-500">
                    Select a week snapshot to view generated suggestions.
                  </div>
                : <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 shrink-0 text-teal-600" />
                            <h4 className="text-base font-semibold text-zinc-900">
                              {selectedRow.windowLabel}
                            </h4>
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <SnapshotMetaRow
                              label="Generated"
                              value={selectedRow.generatedAtLabel}
                            />
                            <SnapshotMetaRow
                              label="Expires"
                              value={selectedRow.expireAtLabel}
                            />
                            <SnapshotMetaRow
                              label="Total generated"
                              value={String(selectedRow.suggestionCount)}
                            />
                          </div>
                        </div>
                        <FirestoreActionsMenu
                          onView={() => setSelectedDoc(selectedSnapshot)}
                          onEdit={() => setEditDoc(selectedSnapshot)}
                          onRemove={() => setDeleteDoc(selectedSnapshot)}
                        />
                      </div>
                    </div>

                    <section className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900">
                            Generated suggestions
                          </h4>
                          <p className="mt-1 text-xs text-zinc-500">
                            {suggestions.length} suggestion
                            {suggestions.length === 1 ? "" : "s"} in this week
                          </p>
                        </div>
                        <input
                          type="search"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search customer, kind, items…"
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm sm:max-w-xs"
                        />
                      </div>
                      <SuggestionsSection
                        suggestions={suggestions}
                        query={query}
                        resetKey={selectedSnapshot.documentId}
                      />
                    </section>
                  </div>
                }
              </div>
            </div>

            <div className="flex justify-end border-t border-zinc-100 bg-white px-5 py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>,
        window.document.body,
      )}

      {selectedDoc && (
        <FirestoreDocumentDetailDialog
          doc={selectedDoc}
          sectionTitle="Proactive schedule week snapshots"
          onClose={() => setSelectedDoc(null)}
          onEdit={() => {
            setEditDoc(selectedDoc);
            setSelectedDoc(null);
          }}
          onRemove={() => {
            setDeleteDoc(selectedDoc);
            setSelectedDoc(null);
          }}
        />
      )}

      {editDoc && (
        <EditFirestoreDocDialog
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={async (data) => {
            await handleSave(editDoc, data);
            setEditDoc(null);
          }}
        />
      )}

      {deleteDoc && (
        <DeleteFirestoreDocDialog
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={async () => {
            await handleDelete(deleteDoc.path);
            setDeleteDoc(null);
          }}
        />
      )}
    </>
  );
}
