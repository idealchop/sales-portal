"use client";

import { Calendar, Clock, Pencil, ScrollText, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { ListPagination } from "@/components/list-pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useAdminUserDocuments } from "@/hooks/use-admin-user-documents";
import {
  extractDocumentFields,
  formatLoginEventKind,
  formatProfileTimestamp,
  loginEventSummary,
} from "@/lib/admin/user-profile-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const LOGS_PAGE_SIZE = 10;

function LoginLogDetailDialog({
  event,
  onClose,
  onEdit,
  onRemove,
}: {
  event: UserFirestoreDocumentRow;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const fields = extractDocumentFields(event.data);
  const title =
    typeof event.data.calendarDayUtc === "string" ?
      event.data.calendarDayUtc
    : event.documentId;

  useEffect(() => {
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Login activity
            </p>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {loginEventSummary(event.data)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <dl className="divide-y divide-zinc-100">
            {fields.map((field) => {
              const value =
                field.kind === "timestamp" ?
                  formatProfileTimestamp(field.value)
                : String(field.value ?? "—");
              return (
                <div
                  key={field.key}
                  className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4"
                >
                  <dt className="text-sm font-medium text-zinc-500">
                    {field.label}
                  </dt>
                  <dd className="break-all text-sm text-foreground">{value}</dd>
                </div>
              );
            })}
          </dl>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onRemove}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

function kindBadgeClass(kind?: string): string {
  if (kind === "explicit_login") {
    return "border-teal-100 bg-teal-50 text-teal-800";
  }
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

export function UserLoginLogsDialog({
  uid,
  events: initialEvents,
  displayName,
  onClose,
  onDocumentsChanged,
}: {
  uid: string;
  events: UserFirestoreDocumentRow[];
  displayName: string;
  onClose: () => void;
  onDocumentsChanged?: () => void;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [eventsSource, setEventsSource] = useState(initialEvents);
  if (eventsSource !== initialEvents) {
    setEventsSource(initialEvents);
    setEvents(initialEvents);
  }
  const [selectedEvent, setSelectedEvent] = useState<UserFirestoreDocumentRow | null>(
    null,
  );
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(null);

  const { saveDocument, removeDocument } = useAdminUserDocuments(uid, true);

  const { paginatedItems, page, setPage, totalPages, totalItems } = usePagination(
    events,
    LOGS_PAGE_SIZE,
    events.length,
  );

  useEffect(() => {
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (
        keyboardEvent.key === "Escape" &&
        !selectedEvent &&
        !editDoc &&
        !deleteDoc
      ) {
        onClose();
      }
    };
    window.document.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteDoc, editDoc, onClose, selectedEvent]);

  function openView(event: UserFirestoreDocumentRow) {
    setSelectedEvent(event);
  }

  function openEdit(event: UserFirestoreDocumentRow) {
    setSelectedEvent(null);
    setEditDoc(event);
  }

  function openRemove(event: UserFirestoreDocumentRow) {
    setSelectedEvent(null);
    setDeleteDoc(event);
  }

  async function handleDelete(path: string) {
    await removeDocument(path);
    setEvents((current) => current.filter((row) => row.path !== path));
    onDocumentsChanged?.();
  }

  async function handleSave(
    doc: UserFirestoreDocumentRow,
    data: Record<string, unknown>,
  ) {
    const updated = await saveDocument(doc.path, data);
    setEvents((current) =>
      current.map((row) => (row.path === doc.path ? updated : row)),
    );
    if (selectedEvent?.path === doc.path) {
      setSelectedEvent(updated);
    }
    onDocumentsChanged?.();
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Login logs
              </p>
              <h3 className="text-lg font-semibold text-foreground">
                {displayName}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {totalItems} recorded {totalItems === 1 ? "day" : "days"} of activity
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {events.length === 0 ?
              <div className="rounded-xl border border-dashed border-zinc-200 px-6 py-10 text-center">
                <ScrollText className="mx-auto h-8 w-8 text-zinc-300" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  No login activity
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Sign-in events will appear here after this user logs in.
                </p>
              </div>
            : <div className="space-y-2">
                {paginatedItems.map((event) => {
                  const kind =
                    typeof event.data.kind === "string" ? event.data.kind : undefined;
                  const day =
                    typeof event.data.calendarDayUtc === "string" ?
                      event.data.calendarDayUtc
                    : event.documentId;
                  const timestamp = formatProfileTimestamp(event.data.timestamp);

                  return (
                    <div
                      key={event.path}
                      className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/40 px-4 py-3 transition hover:border-teal-200 hover:bg-teal-50/30"
                    >
                      <button
                        type="button"
                        onClick={() => openView(event)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{day}</p>
                            <Badge className={cn("font-normal", kindBadgeClass(kind))}>
                              {formatLoginEventKind(kind)}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-[var(--muted-foreground)]">
                            {loginEventSummary(event.data)}
                          </p>
                          {timestamp && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                              <Clock className="h-3 w-3" />
                              {timestamp}
                            </p>
                          )}
                        </div>
                      </button>
                      <FirestoreActionsMenu
                        onView={() => openView(event)}
                        onEdit={() => openEdit(event)}
                        onRemove={() => openRemove(event)}
                      />
                    </div>
                  );
                })}
              </div>
            }
          </div>

          {events.length > LOGS_PAGE_SIZE && (
            <div className="border-t border-zinc-100 px-5 py-3">
              <ListPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={LOGS_PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      {selectedEvent && (
        <LoginLogDetailDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => openEdit(selectedEvent)}
          onRemove={() => openRemove(selectedEvent)}
        />
      )}

      {editDoc && (
        <EditFirestoreDocDialog
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={async (data) => {
            await handleSave(editDoc, data);
          }}
        />
      )}

      {deleteDoc && (
        <DeleteFirestoreDocDialog
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={async () => {
            await handleDelete(deleteDoc.path);
          }}
        />
      )}
    </>
  );
}
