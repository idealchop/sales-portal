"use client";

import { Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { ListPagination } from "@/components/list-pagination";
import { BusinessTransactionListRow } from "@/features/admin/components/business-transaction-list-row";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { TransactionDetailDialog } from "@/features/admin/components/transaction-detail-dialog";
import { useAdminBusinessTransactions } from "@/hooks/use-admin-business-transactions";
import { usePagination } from "@/hooks/use-pagination";
import {
  businessTransactionTypesForTab,
  type BusinessTransactionTab,
} from "@/lib/admin/business-transaction-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const TRANSACTION_PAGE_SIZE = 10;

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
  const [activeTab, setActiveTab] = useState<BusinessTransactionTab>("sales");
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
  const { transactions, isLoading, error, refresh } = useAdminBusinessTransactions(
    businessId,
    types,
    true,
  );
  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    totalItems,
    hasPagination,
  } = usePagination(transactions, TRANSACTION_PAGE_SIZE, `${activeTab}-${types.join(",")}`);

  return (
    <section className={cn("border-t border-zinc-200/80 pt-8")}>
      <SectionHeader
        title="Transactions"
        description="Walk-in, direct sale, and expense records. Delivery and collection appear in customer history."
      />

      <div className="mb-4 flex gap-2 border-b border-zinc-200">
        {(
          [
            { id: "sales", label: "Walk-in / Direct sale" },
            { id: "expense", label: "Expense" },
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
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ?
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">Loading transactions…</p>
        </div>
      : error ?
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-rose-800">{error}</p>
        </div>
      : transactions.length === 0 ?
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
          <Receipt className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-800">
            No transactions in this tab
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {activeTab === "sales" ?
              "Walk-in and direct sale records will appear here."
            : "Expense records will appear here."}
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
                pageSize={TRANSACTION_PAGE_SIZE}
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
