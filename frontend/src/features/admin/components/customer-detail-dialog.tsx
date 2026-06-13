"use client";

import {
  History,
  MapPin,
  Package,
  Pencil,
  Phone,
  RotateCcw,
  Tag,
  Trash2,
  Truck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
import { CopyableUserId } from "@/features/admin/components/copyable-user-id";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { FirestoreDocumentDetailDialog } from "@/features/admin/components/firestore-document-detail-dialog";
import { TransactionDetailDialog } from "@/features/admin/components/transaction-detail-dialog";
import { useAdminCustomerInventoryAssignments } from "@/hooks/use-admin-customer-inventory-assignments";
import { useAdminCustomerTransactions } from "@/hooks/use-admin-customer-transactions";
import { usePagination } from "@/hooks/use-pagination";
import {
  formatPossessionSummary,
  parseInventoryAssignmentRow,
} from "@/lib/admin/inventory-assignment-display";
import {
  formatCustomerPreferredDays,
  formatCustomerWaterLabel,
  parseCustomerProfile,
  parseCustomerTransactionRow,
} from "@/lib/admin/customer-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

type CustomerDetailTab = "profile" | "history";

const CUSTOMER_HISTORY_PAGE_SIZE = 5;
const CUSTOMER_ASSIGNMENTS_PAGE_SIZE = 5;

function ProfileSection({
  icon: Icon,
  title,
  description,
  headerAction,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-4 ring-1 ring-zinc-200/70">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
            )}
          </div>
        </div>
        {headerAction}
      </div>
      {children}
    </section>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
      <span className="text-sm text-zinc-700">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-zinc-900">
        {value}
      </span>
    </div>
  );
}

function CustomerProfileTab({
  doc,
  onOpenInventoryAssignments,
}: {
  doc: UserFirestoreDocumentRow;
  onOpenInventoryAssignments: () => void;
}) {
  const profile = parseCustomerProfile(doc);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <ProfileSection
          icon={Package}
          title="Inventory assignments"
          description="Containers assigned through delivery and collection"
          headerAction={
            <FirestoreActionsMenu
              onView={onOpenInventoryAssignments}
              onEdit={onOpenInventoryAssignments}
              onRemove={onOpenInventoryAssignments}
            />
          }
        >
          <p className="text-sm text-zinc-600">
            {formatPossessionSummary(profile.possessionRows)}
          </p>
        </ProfileSection>

        <ProfileSection
          icon={Tag}
          title="Water prices"
          description="Custom rates for this customer (if any)"
        >
          {profile.pricingRows.length > 0 ?
            <div className="space-y-2">
              {profile.pricingRows.map((row) => (
                <ProfileRow
                  key={row.waterTypeId}
                  label={formatCustomerWaterLabel(row.waterTypeId)}
                  value={`₱${row.price.toLocaleString("en-PH")}`}
                />
              ))}
            </div>
          : <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center text-sm text-zinc-500">
              Using the workspace default water prices.
            </p>
          }
        </ProfileSection>
      </div>

      <div className="space-y-4">
        <ProfileSection
          icon={Truck}
          title="Delivery & collection"
          description="Scheduled visits and preferences"
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                <Truck className="h-4 w-4 text-teal-700" />
                Delivery
              </div>
              <Badge
                className={cn(
                  "mt-2 border-0",
                  profile.isDeliveryEnabled ?
                    "bg-emerald-100 text-emerald-800"
                  : "bg-zinc-100 text-zinc-600",
                )}
              >
                {profile.isDeliveryEnabled ? "On" : "Off"}
              </Badge>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                <RotateCcw className="h-4 w-4 text-teal-700" />
                Collection
              </div>
              <Badge
                className={cn(
                  "mt-2 border-0",
                  profile.isCollectionEnabled ?
                    "bg-emerald-100 text-emerald-800"
                  : "bg-zinc-100 text-zinc-600",
                )}
              >
                {profile.isCollectionEnabled ? "On" : "Off"}
              </Badge>
            </div>
          </div>

          {profile.isDeliveryEnabled && (
            <div className="mt-3 space-y-2 rounded-xl border border-zinc-100 bg-white p-3 text-sm">
              <p className="font-medium text-zinc-900">Delivery schedule</p>
              <p className="capitalize text-zinc-600">
                {profile.deliveryConfig?.frequency || "Not set"}
              </p>
              <dl className="space-y-1.5 text-xs text-zinc-600">
                <div className="flex justify-between gap-2">
                  <dt>Days</dt>
                  <dd className="font-medium text-zinc-800">
                    {formatCustomerPreferredDays(
                      profile.deliveryConfig?.preferredDays,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Time</dt>
                  <dd className="font-medium capitalize text-zinc-800">
                    {profile.deliveryConfig?.preferredTime || "Any time"}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {profile.isCollectionEnabled && (
            <div className="mt-3 space-y-2 rounded-xl border border-zinc-100 bg-white p-3 text-sm">
              <p className="font-medium text-zinc-900">Collection schedule</p>
              <p className="capitalize text-zinc-600">
                {profile.collectionConfig?.frequency || "Not set"}
              </p>
              <dl className="space-y-1.5 text-xs text-zinc-600">
                <div className="flex justify-between gap-2">
                  <dt>Days</dt>
                  <dd className="font-medium text-zinc-800">
                    {formatCustomerPreferredDays(
                      profile.collectionConfig?.preferredDays,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Time</dt>
                  <dd className="font-medium capitalize text-zinc-800">
                    {profile.collectionConfig?.preferredTime || "Any time"}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </ProfileSection>

        {profile.notes && (
          <ProfileSection
            icon={UserRound}
            title="Notes"
            description="For your team"
          >
            <p className="text-sm leading-relaxed text-zinc-600">
              {profile.notes}
            </p>
          </ProfileSection>
        )}
      </div>
    </div>
  );
}

function CustomerInventoryAssignmentsDialog({
  assignments,
  isLoading,
  error,
  onClose,
  onViewAssignment,
  onEditAssignment,
  onRemoveAssignment,
}: {
  assignments: UserFirestoreDocumentRow[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onViewAssignment: (doc: UserFirestoreDocumentRow) => void;
  onEditAssignment: (doc: UserFirestoreDocumentRow) => void;
  onRemoveAssignment: (doc: UserFirestoreDocumentRow) => void;
}) {
  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    totalItems,
    hasPagination,
  } = usePagination(assignments, CUSTOMER_ASSIGNMENTS_PAGE_SIZE, assignments.length);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[#fafafa] shadow-2xl ring-1 ring-zinc-200/80"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              Inventory assignments
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Assignment history for this customer
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isLoading ?
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
              <p className="text-sm text-zinc-500">Loading assignments…</p>
            </div>
          : error ?
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
          : assignments.length === 0 ?
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
              <Package className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-800">
                No assignments yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Container assignments will appear here.
              </p>
            </div>
          : <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {paginatedItems.map((assignment) => {
                  const row = parseInventoryAssignmentRow(assignment);
                  return (
                    <div
                      key={assignment.path}
                      className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0 transition hover:bg-zinc-50/60"
                    >
                      <button
                        type="button"
                        onClick={() => onViewAssignment(assignment)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-zinc-900">
                            {row.itemName}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {row.dateLabel}
                            {row.transactionReference ?
                              ` · ${row.transactionReference}`
                            : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900">
                          {row.quantityLabel}
                        </span>
                      </button>
                      <FirestoreActionsMenu
                        onView={() => onViewAssignment(assignment)}
                        onEdit={() => onEditAssignment(assignment)}
                        onRemove={() => onRemoveAssignment(assignment)}
                      />
                    </div>
                  );
                })}
              </div>

              {hasPagination && (
                <ListPagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={CUSTOMER_ASSIGNMENTS_PAGE_SIZE}
                  onPageChange={setPage}
                  className="px-1"
                />
              )}
            </div>
          }
        </div>

        <div className="flex justify-end border-t border-zinc-100 bg-white px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}

function CustomerHistoryTab({
  transactions,
  isLoading,
  error,
  resetKey,
  onViewTransaction,
  onEditTransaction,
  onRemoveTransaction,
}: {
  transactions: UserFirestoreDocumentRow[];
  isLoading: boolean;
  error: string | null;
  resetKey: string;
  onViewTransaction: (doc: UserFirestoreDocumentRow) => void;
  onEditTransaction: (doc: UserFirestoreDocumentRow) => void;
  onRemoveTransaction: (doc: UserFirestoreDocumentRow) => void;
}) {
  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    totalItems,
    hasPagination,
  } = usePagination(transactions, CUSTOMER_HISTORY_PAGE_SIZE, resetKey);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-zinc-500">Loading transactions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
        <p className="text-sm font-medium text-rose-800">{error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
        <History className="mx-auto h-8 w-8 text-zinc-300" />
        <p className="mt-3 text-sm font-medium text-zinc-800">
          No transactions yet
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Orders and visits for this customer will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {paginatedItems.map((transaction) => {
          const row = parseCustomerTransactionRow(transaction);
          return (
            <div
              key={transaction.path}
              className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0 transition hover:bg-zinc-50/60"
            >
              <button
                type="button"
                onClick={() => onViewTransaction(transaction)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {row.reference}
                  </p>
                  <p className="mt-1 text-xs capitalize text-zinc-500">
                    {row.type.replaceAll("_", " ")} · {row.dateLabel}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-sm font-bold tabular-nums text-zinc-900">
                    {row.amountLabel}
                  </span>
                  <Badge
                    className={cn(
                      "h-5 px-2 text-[9px] font-semibold uppercase tracking-wide",
                      row.paymentBadgeClass,
                    )}
                  >
                    {row.paymentStatus}
                  </Badge>
                </div>
              </button>
              <FirestoreActionsMenu
                onView={() => onViewTransaction(transaction)}
                onEdit={() => onEditTransaction(transaction)}
                onRemove={() => onRemoveTransaction(transaction)}
              />
            </div>
          );
        })}
      </div>

      {hasPagination && (
        <ListPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={CUSTOMER_HISTORY_PAGE_SIZE}
          onPageChange={setPage}
          className="px-1"
        />
      )}
    </div>
  );
}

export function CustomerDetailDialog({
  doc,
  businessId,
  onClose,
  onEdit,
  onRemove,
  onSaveDocument,
  onRemoveDocument,
}: {
  doc: UserFirestoreDocumentRow;
  businessId: string;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<CustomerDetailTab>("profile");
  const [selectedTransaction, setSelectedTransaction] =
    useState<UserFirestoreDocumentRow | null>(null);
  const [editTransaction, setEditTransaction] =
    useState<UserFirestoreDocumentRow | null>(null);
  const [deleteTransaction, setDeleteTransaction] =
    useState<UserFirestoreDocumentRow | null>(null);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<UserFirestoreDocumentRow | null>(null);
  const [editAssignment, setEditAssignment] =
    useState<UserFirestoreDocumentRow | null>(null);
  const [deleteAssignment, setDeleteAssignment] =
    useState<UserFirestoreDocumentRow | null>(null);
  const profile = parseCustomerProfile(doc);
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refresh: refreshTransactions,
  } = useAdminCustomerTransactions(businessId, doc.documentId, true);
  const {
    assignments,
    isLoading: assignmentsLoading,
    error: assignmentsError,
    refresh: refreshAssignments,
  } = useAdminCustomerInventoryAssignments(
    businessId,
    doc.documentId,
    assignmentsOpen,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editTransaction || deleteTransaction || editAssignment || deleteAssignment) {
        return;
      }
      if (selectedAssignment) {
        setSelectedAssignment(null);
        return;
      }
      if (selectedTransaction) {
        setSelectedTransaction(null);
        return;
      }
      if (assignmentsOpen) {
        setAssignmentsOpen(false);
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
  }, [
    assignmentsOpen,
    deleteAssignment,
    deleteTransaction,
    editAssignment,
    editTransaction,
    onClose,
    selectedAssignment,
    selectedTransaction,
  ]);

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
          className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#fafafa] shadow-2xl ring-1 ring-zinc-200/80"
        >
          <div className="border-b border-zinc-100 bg-white px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-teal-50 text-base font-bold uppercase text-teal-700 shadow-sm ring-1 ring-zinc-200/80">
                  {profile.photoUrl ?
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  : profile.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {profile.name}
                    </h3>
                    <Badge className="border-emerald-200 bg-emerald-50 font-normal text-emerald-800">
                      {profile.customerType}
                    </Badge>
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-zinc-500">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{profile.address}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{profile.phone}</span>
                  </p>
                  <div className="mt-3">
                    <CopyableUserId
                      uid={doc.documentId}
                      label="ID"
                      copyLabel="customer ID"
                      muted
                    />
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 flex gap-2 border-b border-zinc-100">
              {(
                [
                  { id: "profile", label: "Profile", icon: UserRound },
                  { id: "history", label: "History", icon: History },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition",
                    activeTab === tab.id ?
                      "border-teal-600 text-teal-700"
                    : "border-transparent text-zinc-500 hover:text-zinc-800",
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === "history" && transactions.length > 0 && (
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                      {transactions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {activeTab === "profile" ?
              <CustomerProfileTab
                doc={doc}
                onOpenInventoryAssignments={() => setAssignmentsOpen(true)}
              />
            : <CustomerHistoryTab
                transactions={transactions}
                isLoading={transactionsLoading}
                error={transactionsError}
                resetKey={doc.documentId}
                onViewTransaction={setSelectedTransaction}
                onEditTransaction={setEditTransaction}
                onRemoveTransaction={setDeleteTransaction}
              />}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 bg-white px-5 py-4">
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
    </div>,
        window.document.body,
      )}

      {selectedTransaction && (
        <TransactionDetailDialog
          doc={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onEdit={() => {
            setEditTransaction(selectedTransaction);
            setSelectedTransaction(null);
          }}
          onRemove={() => {
            setDeleteTransaction(selectedTransaction);
            setSelectedTransaction(null);
          }}
        />
      )}

      {editTransaction && (
        <EditFirestoreDocDialog
          doc={editTransaction}
          onClose={() => setEditTransaction(null)}
          onSave={async (data) => {
            const updated = await onSaveDocument(editTransaction.path, data);
            setEditTransaction(null);
            setSelectedTransaction((current) =>
              current?.path === updated.path ? updated : current,
            );
            await refreshTransactions();
          }}
        />
      )}

      {deleteTransaction && (
        <DeleteFirestoreDocDialog
          doc={deleteTransaction}
          onClose={() => setDeleteTransaction(null)}
          onConfirm={async () => {
            await onRemoveDocument(deleteTransaction.path);
            setDeleteTransaction(null);
            setSelectedTransaction((current) =>
              current?.path === deleteTransaction.path ? null : current,
            );
            await refreshTransactions();
          }}
        />
      )}

      {assignmentsOpen && (
        <CustomerInventoryAssignmentsDialog
          assignments={assignments}
          isLoading={assignmentsLoading}
          error={assignmentsError}
          onClose={() => setAssignmentsOpen(false)}
          onViewAssignment={setSelectedAssignment}
          onEditAssignment={setEditAssignment}
          onRemoveAssignment={setDeleteAssignment}
        />
      )}

      {selectedAssignment && (
        <FirestoreDocumentDetailDialog
          doc={selectedAssignment}
          sectionTitle="Inventory assignment"
          onClose={() => setSelectedAssignment(null)}
          onEdit={() => {
            setEditAssignment(selectedAssignment);
            setSelectedAssignment(null);
          }}
          onRemove={() => {
            setDeleteAssignment(selectedAssignment);
            setSelectedAssignment(null);
          }}
        />
      )}

      {editAssignment && (
        <EditFirestoreDocDialog
          doc={editAssignment}
          onClose={() => setEditAssignment(null)}
          onSave={async (data) => {
            const updated = await onSaveDocument(editAssignment.path, data);
            setEditAssignment(null);
            setSelectedAssignment((current) =>
              current?.path === updated.path ? updated : current,
            );
            await refreshAssignments();
          }}
        />
      )}

      {deleteAssignment && (
        <DeleteFirestoreDocDialog
          doc={deleteAssignment}
          onClose={() => setDeleteAssignment(null)}
          onConfirm={async () => {
            await onRemoveDocument(deleteAssignment.path);
            setDeleteAssignment(null);
            setSelectedAssignment((current) =>
              current?.path === deleteAssignment.path ? null : current,
            );
            await refreshAssignments();
          }}
        />
      )}
    </>
  );
}
