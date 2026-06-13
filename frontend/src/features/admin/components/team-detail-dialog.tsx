"use client";

import {
  Mail,
  MapPin,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
import { CopyableUserId } from "@/features/admin/components/copyable-user-id";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { FirestoreDocumentDetailDialog } from "@/features/admin/components/firestore-document-detail-dialog";
import {
  formatInviteStatus,
  formatRemittanceRow,
  formatTeamChatRow,
  parseTeamMemberDetail,
  parseTeamMemberListRow,
  sortTeamMembers,
} from "@/lib/admin/team-detail-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";

const REMITTANCE_PAGE_SIZE = 5;

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-50 py-2.5 last:border-b-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-right text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

function RelatedDocRow({
  title,
  subtitle,
  meta,
  onView,
  onEdit,
  onRemove,
  showView = false,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onView?: () => void;
  onEdit: () => void;
  onRemove: () => void;
  showView?: boolean;
}) {
  const content = (
    <>
      <p className="truncate text-sm font-medium text-zinc-900">{title}</p>
      {subtitle && (
        <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
      )}
      {meta && <p className="mt-1 text-xs font-medium text-zinc-600">{meta}</p>}
    </>
  );

  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 py-3 last:border-b-0">
      {showView && onView ?
        <button
          type="button"
          onClick={onView}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          {content}
        </button>
      : <div className="min-w-0 flex-1">{content}</div>}
      <FirestoreActionsMenu
        onView={showView ? onView : undefined}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    </div>
  );
}

function RemittancesSection({
  remittances,
  resetKey,
  onView,
  onEdit,
  onRemove,
}: {
  remittances: UserFirestoreDocumentRow[];
  resetKey: string;
  onView: (doc: UserFirestoreDocumentRow) => void;
  onEdit: (doc: UserFirestoreDocumentRow) => void;
  onRemove: (doc: UserFirestoreDocumentRow) => void;
}) {
  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    totalItems,
    hasPagination,
  } = usePagination(remittances, REMITTANCE_PAGE_SIZE, resetKey);

  if (remittances.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No cash remittances recorded for this member.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {paginatedItems.map((remittance) => {
        const row = formatRemittanceRow(remittance);
        return (
          <RelatedDocRow
            key={remittance.path}
            title={row.amountLabel}
            subtitle={row.dateLabel}
            meta={row.ordersLabel}
            showView
            onView={() => onView(remittance)}
            onEdit={() => onEdit(remittance)}
            onRemove={() => onRemove(remittance)}
          />
        );
      })}
      {hasPagination && (
        <ListPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={REMITTANCE_PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export function TeamDetailDialog({
  members,
  relatedDocuments,
  onClose,
  onSaveDocument,
  onRemoveDocument,
}: {
  members: UserFirestoreDocumentRow[];
  relatedDocuments: UserFirestoreDocumentRow[];
  onClose: () => void;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  const sortedMembers = useMemo(() => sortTeamMembers(members), [members]);
  const riders = useMemo(
    () => relatedDocuments.filter((doc) => doc.collectionId === "riders"),
    [relatedDocuments],
  );
  const presenceDocs = useMemo(
    () => relatedDocuments.filter((doc) => doc.collectionId === "team_presence"),
    [relatedDocuments],
  );

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    sortedMembers[0]?.documentId ?? null,
  );
  const effectiveSelectedMemberId =
    selectedMemberId &&
    sortedMembers.some((doc) => doc.documentId === selectedMemberId) ?
      selectedMemberId
    : sortedMembers[0]?.documentId ?? null;
  const [selectedRelatedDoc, setSelectedRelatedDoc] =
    useState<UserFirestoreDocumentRow | null>(null);
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );

  const selectedMember =
    sortedMembers.find(
      (doc) => doc.documentId === effectiveSelectedMemberId,
    ) ??
    sortedMembers[0] ??
    null;

  const detail =
    selectedMember ?
      parseTeamMemberDetail(selectedMember, relatedDocuments)
    : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editDoc || deleteDoc) return;
      if (selectedRelatedDoc) {
        setSelectedRelatedDoc(null);
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
  }, [deleteDoc, editDoc, onClose, selectedRelatedDoc]);

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
                  Team
                </p>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Team members
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="border-b border-zinc-100 bg-white lg:border-b-0 lg:border-r">
                <div className="max-h-[40vh] overflow-y-auto p-3 lg:max-h-none lg:h-full">
                  {sortedMembers.length === 0 ?
                    <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500">
                      No team members yet.
                    </div>
                  : sortedMembers.map((member) => {
                      const row = parseTeamMemberListRow(
                        member,
                        riders,
                        presenceDocs,
                      );
                      const isSelected =
                        selectedMember?.documentId === member.documentId;

                      return (
                        <button
                          key={member.path}
                          type="button"
                          onClick={() => setSelectedMemberId(member.documentId)}
                          className={cn(
                            "mb-2 w-full rounded-xl border p-3 text-left transition last:mb-0",
                            isSelected ?
                              "border-teal-200 bg-teal-50/40 ring-1 ring-teal-100"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-xs font-bold uppercase text-teal-700 ring-1 ring-zinc-200/80">
                                {row.initials}
                              </div>
                              {row.isActive && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-zinc-900">
                                {row.name}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    row.isActive ? "bg-emerald-500" : "bg-zinc-300",
                                  )}
                                />
                                <span className="text-xs text-zinc-500">
                                  {row.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                              {row.showProgress && (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                                    <div
                                      className="h-full rounded-full bg-teal-600"
                                      style={{ width: `${row.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-semibold tabular-nums text-zinc-500">
                                    {row.progressLabel}
                                  </span>
                                </div>
                              )}
                              {row.isLive && (
                                <Badge className="mt-2 border-emerald-200 bg-emerald-50 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                  Live
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  }
                </div>
              </aside>

              <div className="min-h-0 overflow-y-auto p-5">
                {!detail ?
                  <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white text-sm text-zinc-500">
                    Select a team member to view details.
                  </div>
                : <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="relative shrink-0">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-lg font-bold uppercase text-teal-700 ring-1 ring-zinc-200/80">
                            {detail.member.initials}
                          </div>
                          {detail.member.isActive && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xl font-semibold text-zinc-900">
                            {detail.member.name}
                          </h4>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                            <Truck className="h-4 w-4 shrink-0" />
                            {detail.member.subtitle}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge
                              className={cn(
                                "font-normal",
                                detail.member.isActive ?
                                  "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-zinc-200 bg-zinc-100 text-zinc-600",
                              )}
                            >
                              {detail.member.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {detail.riderProfile && (
                              <Badge className="border-sky-200 bg-sky-50 font-normal text-sky-800">
                                {detail.riderProfile.gpsLabel}
                              </Badge>
                            )}
                            <Badge className="border-zinc-200 bg-zinc-50 font-normal text-zinc-700">
                              {detail.member.roleLabel}
                            </Badge>
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <DetailRow
                              label="Email"
                              value={
                                <span className="inline-flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                                  {detail.member.email}
                                </span>
                              }
                            />
                            <div className="sm:col-span-2">
                              <CopyableUserId
                                uid={detail.member.userId}
                                label="User ID"
                                copyLabel="user ID"
                                muted
                              />
                            </div>
                          </div>
                        </div>
                        <FirestoreActionsMenu
                          onEdit={() => setEditDoc(detail.member.memberDoc)}
                          onRemove={() => setDeleteDoc(detail.member.memberDoc)}
                        />
                      </div>
                    </div>

                    <DetailSection title="Team presence">
                      <DetailRow
                        label="Last seen"
                        value={detail.presenceLastSeenLabel}
                      />
                    </DetailSection>

                    {detail.riderProfile && detail.riderDoc && (
                      <DetailSection title="Rider profile">
                        <DetailRow label="Phone" value={detail.riderProfile.phone} />
                        <DetailRow label="Vehicle" value={detail.riderProfile.vehicle} />
                        <DetailRow label="Status" value={detail.riderProfile.status} />
                        <DetailRow
                          label="Today's deliveries"
                          value={`${detail.riderProfile.deliveriesToday} / ${detail.riderProfile.maxDeliveries}`}
                        />
                        <DetailRow
                          label="Today's containers"
                          value={`${detail.riderProfile.containersToday} / ${detail.riderProfile.maxContainers}`}
                        />
                        <DetailRow
                          label="Last location"
                          value={
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                              {detail.riderProfile.locationLabel}
                            </span>
                          }
                        />
                        <div className="mt-3 flex justify-end">
                          <FirestoreActionsMenu
                            onEdit={() => setEditDoc(detail.riderDoc!)}
                            onRemove={() => setDeleteDoc(detail.riderDoc!)}
                          />
                        </div>
                      </DetailSection>
                    )}

                    <DetailSection title="Team invites">
                      {detail.invites.length === 0 ?
                        <p className="text-sm text-zinc-500">
                          No invites linked to this member.
                        </p>
                      : detail.invites.map((invite) => (
                          <RelatedDocRow
                            key={invite.path}
                            title={formatInviteStatus(invite)}
                            subtitle={String(invite.data.inviteeEmail ?? "—")}
                            meta={String(invite.data.role ?? "member")}
                            onEdit={() => setEditDoc(invite)}
                            onRemove={() => setDeleteDoc(invite)}
                          />
                        ))
                      }
                    </DetailSection>

                    <DetailSection title="Team chat">
                      {detail.teamChats.length === 0 ?
                        <p className="text-sm text-zinc-500">
                          No direct message threads for this member.
                        </p>
                      : detail.teamChats.map((chat) => {
                          const row = formatTeamChatRow(
                            chat,
                            detail.member.userId,
                          );
                          return (
                            <RelatedDocRow
                              key={chat.path}
                              title={row.peerLabel}
                              subtitle={row.messagePreview}
                              meta={row.lastActivityLabel}
                              showView
                              onView={() => setSelectedRelatedDoc(chat)}
                              onEdit={() => setEditDoc(chat)}
                              onRemove={() => setDeleteDoc(chat)}
                            />
                          );
                        })
                      }
                    </DetailSection>

                    <DetailSection title="Rider cash remittances">
                      <RemittancesSection
                        remittances={detail.remittances}
                        resetKey={detail.member.userId}
                        onView={setSelectedRelatedDoc}
                        onEdit={setEditDoc}
                        onRemove={setDeleteDoc}
                      />
                    </DetailSection>
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

      {selectedRelatedDoc && (
        <FirestoreDocumentDetailDialog
          doc={selectedRelatedDoc}
          sectionTitle={selectedRelatedDoc.collectionId.replaceAll("_", " ")}
          onClose={() => setSelectedRelatedDoc(null)}
          onEdit={() => {
            setEditDoc(selectedRelatedDoc);
            setSelectedRelatedDoc(null);
          }}
          onRemove={() => {
            setDeleteDoc(selectedRelatedDoc);
            setSelectedRelatedDoc(null);
          }}
        />
      )}

      {editDoc && (
        <EditFirestoreDocDialog
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={async (data) => {
            await onSaveDocument(editDoc.path, data);
            setEditDoc(null);
          }}
        />
      )}

      {deleteDoc && (
        <DeleteFirestoreDocDialog
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={async () => {
            await onRemoveDocument(deleteDoc.path);
            setDeleteDoc(null);
          }}
        />
      )}
    </>
  );
}
