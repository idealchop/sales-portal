"use client";

import { FileJson, LayoutGrid, List, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ListPagination } from "@/components/list-pagination";
import { CustomerDetailDialog } from "@/features/admin/components/customer-detail-dialog";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { FirestoreDocumentDetailDialog } from "@/features/admin/components/firestore-document-detail-dialog";
import { BusinessSupportAiKnowledgeListTable } from "@/features/admin/components/business-support-ai-knowledge-list-table";
import { BusinessChatSessionListTable } from "@/features/admin/components/business-chat-session-list-table";
import { BusinessAiToolRunListTable } from "@/features/admin/components/business-ai-tool-run-list-table";
import { BusinessAuditLogListTable } from "@/features/admin/components/business-audit-log-list-table";
import { BusinessNotificationListTable } from "@/features/admin/components/business-notification-list-table";
import { BusinessRawSubmissionListTable } from "@/features/admin/components/business-raw-submission-list-table";
import { BusinessFileListRow } from "@/features/admin/components/business-file-list-row";
import { BusinessPaymentInfoListRow } from "@/features/admin/components/business-payment-info-list-row";
import { BusinessPortalOrderRatingListRow } from "@/features/admin/components/business-portal-order-rating-list-row";
import { BusinessCustomerListRow } from "@/features/admin/components/business-customer-list-row";
import { BusinessInventoryListTable } from "@/features/admin/components/business-inventory-list-table";
import { BusinessSubscriptionListRow } from "@/features/admin/components/business-subscription-list-row";
import {
  DEFAULT_FIRESTORE_DOCUMENT_PAGE_SIZE,
  FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS,
  firestoreDocumentSearchText,
  firestoreDocumentSummary,
  matchesSubcollectionFilter,
  subcollectionFilterOptions,
  type FirestoreDocumentDisplayMode,
  type FirestoreDocumentPageSize,
} from "@/lib/admin/firestore-document-list";
import {
  supportAiKnowledgeSearchText,
  sortSupportAiKnowledgeDocuments,
} from "@/lib/admin/support-ai-knowledge-list-display";
import {
  chatSessionSearchText,
  sortChatSessionDocuments,
} from "@/lib/admin/chat-session-list-display";
import {
  aiToolRunSearchText,
  sortAiToolRunDocuments,
} from "@/lib/admin/ai-tool-run-list-display";
import {
  notificationSearchText,
  sortNotificationDocuments,
} from "@/lib/admin/notification-list-display";
import {
  auditLogSearchText,
  sortAuditLogDocuments,
} from "@/lib/admin/audit-log-list-display";
import {
  rawSubmissionSearchText,
  sortRawSubmissionDocuments,
} from "@/lib/admin/raw-submission-list-display";
import {
  fileSearchText,
  sortFileDocuments,
} from "@/lib/admin/file-list-display";
import {
  paymentInfoSearchText,
  sortPaymentInfoDocuments,
} from "@/lib/admin/payment-info-list-display";
import {
  portalOrderRatingSearchText,
  sortPortalOrderRatingDocuments,
} from "@/lib/admin/portal-order-rating-list-display";
import {
  sortCustomerDocuments,
} from "@/lib/admin/customer-list-display";
import {
  sortInventoryDocuments,
} from "@/lib/admin/inventory-list-display";
import {
  sortSubscriptionDocuments,
  subscriptionLatestDocumentId,
} from "@/lib/admin/subscription-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { userDocumentTitle } from "@/lib/admin/user-documents";
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

export function BusinessSubcollectionListSection({
  collectionId,
  title,
  documents: initialDocuments,
  businessId,
  onSaveDocument,
  onRemoveDocument,
  hideHeader = false,
}: {
  collectionId: string;
  title: string;
  documents: UserFirestoreDocumentRow[];
  businessId?: string;
  hideHeader?: boolean;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [documentsSource, setDocumentsSource] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [displayMode, setDisplayMode] =
    useState<FirestoreDocumentDisplayMode>("cards");
  const isSubscriptionList = collectionId === "subscriptions";
  const isCustomerList = collectionId === "customers";
  const isInventoryList = collectionId === "inventory_items";
  const isPortalOrderRatingsList = collectionId === "portal_order_ratings";
  const isPaymentInfoList = collectionId === "payment_info";
  const isFilesList = collectionId === "files";
  const isRawSubmissionsList = collectionId === "raw_submissions";
  const isAuditLogsList = collectionId === "audit_logs";
  const isNotificationsList = collectionId === "notifications";
  const isAiToolRunsList = collectionId === "ai_tool_runs";
  const isChatSessionsList = collectionId === "chat_sessions";
  const isSupportAiKnowledgeList = collectionId === "support_ai_knowledge";
  const usesCustomListLayout =
    isSubscriptionList ||
    isCustomerList ||
    isInventoryList ||
    isPortalOrderRatingsList ||
    isPaymentInfoList ||
    isFilesList ||
    isRawSubmissionsList ||
    isAuditLogsList ||
    isNotificationsList ||
    isAiToolRunsList ||
    isChatSessionsList ||
    isSupportAiKnowledgeList;
  const [pageSize, setPageSize] = useState<FirestoreDocumentPageSize>(
    DEFAULT_FIRESTORE_DOCUMENT_PAGE_SIZE,
  );
  const [page, setPage] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );
  if (documentsSource !== initialDocuments) {
    setDocumentsSource(initialDocuments);
    setDocuments(initialDocuments);
  }

  const filterOptions = useMemo(
    () => subcollectionFilterOptions(collectionId),
    [collectionId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesFilter = matchesSubcollectionFilter(doc, collectionId, filter);
      const matchesQuery =
        !q ||
        (isPortalOrderRatingsList ?
          portalOrderRatingSearchText(doc).includes(q)
        : isPaymentInfoList ?
          paymentInfoSearchText(doc).includes(q)
        : isFilesList ?
          fileSearchText(doc).includes(q)
        : isRawSubmissionsList ?
          rawSubmissionSearchText(doc).includes(q)
        : isAuditLogsList ?
          auditLogSearchText(doc).includes(q)
        : isNotificationsList ?
          notificationSearchText(doc).includes(q)
        : isAiToolRunsList ?
          aiToolRunSearchText(doc).includes(q)
        : isChatSessionsList ?
          chatSessionSearchText(doc).includes(q)
        : isSupportAiKnowledgeList ?
          supportAiKnowledgeSearchText(doc).includes(q)
        : firestoreDocumentSearchText(doc).includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [collectionId, documents, filter, isAiToolRunsList, isAuditLogsList, isChatSessionsList, isFilesList, isNotificationsList, isPaymentInfoList, isPortalOrderRatingsList, isRawSubmissionsList, isSupportAiKnowledgeList, query]);

  const listedDocuments = useMemo(() => {
    if (isSubscriptionList) return sortSubscriptionDocuments(filtered);
    if (isCustomerList) return sortCustomerDocuments(filtered);
    if (isInventoryList) return sortInventoryDocuments(filtered);
    if (isPortalOrderRatingsList) return sortPortalOrderRatingDocuments(filtered);
    if (isPaymentInfoList) return sortPaymentInfoDocuments(filtered);
    if (isFilesList) return sortFileDocuments(filtered);
    if (isRawSubmissionsList) return sortRawSubmissionDocuments(filtered);
    if (isAuditLogsList) return sortAuditLogDocuments(filtered);
    if (isNotificationsList) return sortNotificationDocuments(filtered);
    if (isAiToolRunsList) return sortAiToolRunDocuments(filtered);
    if (isChatSessionsList) return sortChatSessionDocuments(filtered);
    if (isSupportAiKnowledgeList) return sortSupportAiKnowledgeDocuments(filtered);
    return filtered;
  }, [
    filtered,
    isAiToolRunsList,
    isAuditLogsList,
    isChatSessionsList,
    isCustomerList,
    isFilesList,
    isInventoryList,
    isNotificationsList,
    isPaymentInfoList,
    isPortalOrderRatingsList,
    isRawSubmissionsList,
    isSubscriptionList,
    isSupportAiKnowledgeList,
  ]);

  const latestSubscriptionId = useMemo(
    () =>
      isSubscriptionList ? subscriptionLatestDocumentId(documents) : undefined,
    [documents, isSubscriptionList],
  );

  const totalPages = Math.max(1, Math.ceil(listedDocuments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return listedDocuments.slice(start, start + pageSize);
  }, [currentPage, listedDocuments, pageSize]);

  function openView(doc: UserFirestoreDocumentRow) {
    setSelectedDoc(doc);
  }

  function openEdit(doc: UserFirestoreDocumentRow) {
    setSelectedDoc(null);
    setEditDoc(doc);
  }

  function openRemove(doc: UserFirestoreDocumentRow) {
    setSelectedDoc(null);
    setDeleteDoc(doc);
  }

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
    <section>
      {!hideHeader && (
        <SectionHeader
          title={title}
          description={`${documents.length} document${documents.length === 1 ? "" : "s"}`}
        />
      )}

      <div className={cn("space-y-3", !hideHeader && "mb-4")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={
                isPortalOrderRatingsList ?
                  "Search customer, email, feedback, rider…"
                : isPaymentInfoList ?
                  "Search name, provider, account number…"
                : isFilesList ?
                  "Search path, category, mime type…"
                : isRawSubmissionsList ?
                  "Search customer, reference, status…"
                : isAuditLogsList ?
                  "Search level, message, type…"
                : isNotificationsList ?
                  "Search title, message, type, status…"
                : isAiToolRunsList ?
                  "Search model, risk, title, tool…"
                : isChatSessionsList ?
                  "Search subject, summary, status, user…"
                : isSupportAiKnowledgeList ?
                  "Search question, answer, session, user…"
                : "Search documents"
              }
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!usesCustomListLayout && (
              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setDisplayMode("cards")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                    displayMode === "cards" ?
                      "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-50",
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode("rows")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                    displayMode === "rows" ?
                      "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-50",
                  )}
                >
                  <List className="h-4 w-4" />
                  Rows
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <span className="whitespace-nowrap font-medium">Per page</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(
                    Number(event.target.value) as FirestoreDocumentPageSize,
                  );
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filterOptions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFilter(option.value);
                  setPage(1);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  filter === option.value ?
                    "bg-zinc-800 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-zinc-500">
          Showing {paginatedItems.length} of {listedDocuments.length} filtered
          {listedDocuments.length !== documents.length ?
            ` (${documents.length} total)`
          : ""}
        </p>
      </div>

      {filtered.length === 0 ?
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No documents match</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Try a different search term or filter.
          </p>
        </div>
      : isInventoryList ?
        <BusinessInventoryListTable
          documents={paginatedItems}
          onView={openView}
          onEdit={openEdit}
          onRemove={openRemove}
        />
      : isCustomerList ?
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {paginatedItems.map((doc) => (
            <BusinessCustomerListRow
              key={doc.path}
              doc={doc}
              onView={() => openView(doc)}
              onEdit={() => openEdit(doc)}
              onRemove={() => openRemove(doc)}
            />
          ))}
        </div>
      : isSubscriptionList ?
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {paginatedItems.map((doc) => (
            <BusinessSubscriptionListRow
              key={doc.path}
              doc={doc}
              isLatest={doc.documentId === latestSubscriptionId}
              onView={() => openView(doc)}
              onEdit={() => openEdit(doc)}
              onRemove={() => openRemove(doc)}
            />
          ))}
        </div>
      : isPortalOrderRatingsList ?
        <div className="space-y-2">
          {paginatedItems.map((doc) => (
            <BusinessPortalOrderRatingListRow
              key={doc.path}
              doc={doc}
              onView={() => openView(doc)}
              onEdit={() => openEdit(doc)}
              onRemove={() => openRemove(doc)}
            />
          ))}
        </div>
      : isPaymentInfoList ?
        <div className="space-y-2">
          {paginatedItems.map((doc) => (
            <BusinessPaymentInfoListRow
              key={doc.path}
              doc={doc}
              onView={() => openView(doc)}
              onEdit={() => openEdit(doc)}
              onRemove={() => openRemove(doc)}
            />
          ))}
        </div>
      : isFilesList ?
        <div className="space-y-2">
          {paginatedItems.map((doc) => (
            <BusinessFileListRow
              key={doc.path}
              doc={doc}
              onView={() => openView(doc)}
              onEdit={() => openEdit(doc)}
              onRemove={() => openRemove(doc)}
            />
          ))}
        </div>
      : isRawSubmissionsList ?
        <BusinessRawSubmissionListTable
          documents={paginatedItems}
          onView={openView}
          onEdit={openEdit}
          onRemove={openRemove}
        />
      : isAuditLogsList ?
        <BusinessAuditLogListTable
          documents={paginatedItems}
          onView={openView}
          onEdit={openEdit}
          onRemove={openRemove}
        />
      : isNotificationsList ?
        <BusinessNotificationListTable
          documents={paginatedItems}
          onView={openView}
          onEdit={openEdit}
          onRemove={openRemove}
        />
      : isAiToolRunsList ?
        <BusinessAiToolRunListTable
          documents={paginatedItems}
          onView={openView}
          onEdit={openEdit}
          onRemove={openRemove}
        />
      : isChatSessionsList ?
        <BusinessChatSessionListTable
          documents={paginatedItems}
          onView={openView}
          onEdit={openEdit}
          onRemove={openRemove}
        />
      : isSupportAiKnowledgeList ?
        <BusinessSupportAiKnowledgeListTable
          documents={paginatedItems}
          onView={openView}
          onEdit={openEdit}
          onRemove={openRemove}
        />
      : displayMode === "cards" ?
        <div className="grid gap-3 sm:grid-cols-2">
          {paginatedItems.map((doc) => (
            <div
              key={doc.path}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex items-start gap-2 border-b border-zinc-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => openView(doc)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <FileJson className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {userDocumentTitle(doc)}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                      {firestoreDocumentSummary(doc)}
                    </p>
                  </div>
                </button>
                <FirestoreActionsMenu
                  onView={() => openView(doc)}
                  onEdit={() => openEdit(doc)}
                  onRemove={() => openRemove(doc)}
                />
              </div>
            </div>
          ))}
        </div>
      : <div className="space-y-2">
          {paginatedItems.map((doc) => (
            <div
              key={doc.path}
              className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-4 py-3 transition hover:border-teal-200 hover:bg-teal-50/20"
            >
              <button
                type="button"
                onClick={() => openView(doc)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <FileJson className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {userDocumentTitle(doc)}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-[var(--muted-foreground)]">
                    {firestoreDocumentSummary(doc)}
                  </p>
                </div>
              </button>
              <FirestoreActionsMenu
                onView={() => openView(doc)}
                onEdit={() => openEdit(doc)}
                onRemove={() => openRemove(doc)}
              />
            </div>
          ))}
        </div>
      }

      {filtered.length > pageSize && (
        <div className="mt-4">
          <ListPagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={listedDocuments.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {selectedDoc && isCustomerList && businessId ?
        <CustomerDetailDialog
          doc={selectedDoc}
          businessId={businessId}
          onClose={() => setSelectedDoc(null)}
          onEdit={() => openEdit(selectedDoc)}
          onRemove={() => openRemove(selectedDoc)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      : selectedDoc ?
        <FirestoreDocumentDetailDialog
          doc={selectedDoc}
          sectionTitle={title}
          onClose={() => setSelectedDoc(null)}
          onEdit={() => openEdit(selectedDoc)}
          onRemove={() => openRemove(selectedDoc)}
        />
      : null}

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
    </section>
  );
}
