"use client";

import { Receipt, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ListPagination } from "@/components/list-pagination";
import { BusinessTransactionListRow } from "@/features/admin/components/business-transaction-list-row";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { TransactionDetailDialog } from "@/features/admin/components/transaction-detail-dialog";
import { useAdminBusinessTransactions } from "@/hooks/use-admin-business-transactions";
import { usePagination } from "@/hooks/use-pagination";
import {
  BUSINESS_TRANSACTION_TABS,
  businessTransactionTypesForTab,
  filterBusinessTransactions,
  type BusinessTransactionTab,
} from "@/lib/admin/business-transaction-list-display";
import {
  DEFAULT_FIRESTORE_DOCUMENT_PAGE_SIZE,
  FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS,
  type FirestoreDocumentPageSize,
} from "@/lib/admin/firestore-document-list";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-1.5 h-8 w-0.5 shrink-0 rounded-full bg-teal-500/70" />
      <div>
        <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900">
          {title}
        </h4>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
    </div>
  );
}

export function BusinessTransactionListSection({
  businessId,
  onSaveDocument,
  onRemoveDocument,
}: {
  businessId: string;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] =
    useState<BusinessTransactionTab>("walkin");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<FirestoreDocumentPageSize>(
    DEFAULT_FIRESTORE_DOCUMENT_PAGE_SIZE,
  );
  const [selectedDoc, setSelectedDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );

  const types = useMemo(
    () => businessTransactionTypesForTab(activeTab),
    [activeTab],
  );
  const { transactions, isLoading, error, refresh } =
    useAdminBusinessTransactions(businessId, types, true);
  const filtered = useMemo(
    () => filterBusinessTransactions(transactions, query),
    [transactions, query],
  );
  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    totalItems,
    hasPagination,
  } = usePagination(
    filtered,
    pageSize,
    `${activeTab}-${pageSize}-${query.trim()}`,
  );

  const activeMeta =
    BUSINESS_TRANSACTION_TABS.find((tab) => tab.id === activeTab) ??
    BUSINESS_TRANSACTION_TABS[0];

  return (
    <section className={cn("border-t border-zinc-200/80 pt-8")}>
      <SectionHeader
        title="Transactions"
        description="Walk-in, delivery & collection, expenses, and direct sales"
      />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-zinc-200">
        {BUSINESS_TRANSACTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setQuery("");
            }}
            className={cn(
              "inline-flex shrink-0 items-center border-b-2 px-3 py-2 text-sm font-medium transition",
              activeTab === tab.id ?
                "border-teal-600 text-teal-700"
              : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reference, customer, rider…"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none ring-teal-500 focus:ring-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="whitespace-nowrap">Rows</span>
          <select
            className="h-10 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
            value={pageSize}
            onChange={(event) =>
              setPageSize(
                Number(event.target.value) as FirestoreDocumentPageSize,
              )
            }
          >
            {FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ?
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">Loading transactions…</p>
        </div>
      : error ?
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-rose-800">{error}</p>
        </div>
      : filtered.length === 0 ?
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
          <Receipt className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-800">
            {query.trim() ?
              "No transactions match your search"
            : "No transactions in this tab"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {query.trim() ?
              "Try a different reference, customer, or rider name."
            : activeMeta.emptyHint}
          </p>
        </div>
      : <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {paginatedItems.map((doc) => (
              <BusinessTransactionListRow
                key={doc.path}
                doc={doc}
                onView={() => setSelectedDoc(doc)}
                onEdit={() => {
                  setSelectedDoc(null);
                  setEditDoc(doc);
                }}
                onRemove={() => {
                  setSelectedDoc(null);
                  setDeleteDoc(doc);
                }}
              />
            ))}
          </div>

          {hasPagination && (
            <div className="mt-4">
              <ListPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      }

      {selectedDoc && (
        <TransactionDetailDialog
          doc={selectedDoc}
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
            await onSaveDocument(editDoc.path, data);
            setEditDoc(null);
            await refresh();
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
            await refresh();
          }}
        />
      )}
    </section>
  );
}
