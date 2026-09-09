"use client";

import { Receipt, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
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

export function BusinessTransactionsDialog({
  businessId,
  onClose,
  onSaveDocument,
  onRemoveDocument,
}: {
  businessId: string;
  onClose: () => void;
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

  const activeMeta =
    BUSINESS_TRANSACTION_TABS.find((tab) => tab.id === activeTab) ??
    BUSINESS_TRANSACTION_TABS[0];

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Workspace ledger
            </p>
            <h3 className="text-lg font-semibold text-foreground">
              Transactions
            </h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Walk-in, delivery &amp; collection, expenses, and direct sales
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b border-zinc-100 bg-[#fafafa] px-5 pt-4">
          <div className="flex flex-wrap gap-1 overflow-x-auto">
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-5 py-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reference, customer, rider, amount…"
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
        </div>
      </div>

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
    </div>,
    document.body,
  );
}
