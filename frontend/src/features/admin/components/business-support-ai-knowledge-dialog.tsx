"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
import { BusinessPrivateUsageListTable } from "@/features/admin/components/business-private-usage-list-table";
import { BusinessSupportAiKnowledgeListTable } from "@/features/admin/components/business-support-ai-knowledge-list-table";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { FirestoreDocumentDetailDialog } from "@/features/admin/components/firestore-document-detail-dialog";
import {
  DEFAULT_FIRESTORE_DOCUMENT_PAGE_SIZE,
  FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS,
  type FirestoreDocumentPageSize,
} from "@/lib/admin/firestore-document-list";
import {
  filterSupportAiPrivateUsageDocuments,
  privateUsageSearchText,
  sortPrivateUsageDocuments,
} from "@/lib/admin/private-usage-list-display";
import {
  sortSupportAiKnowledgeDocuments,
  supportAiKnowledgeSearchText,
} from "@/lib/admin/support-ai-knowledge-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

function DialogSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function BusinessSupportAiKnowledgeDialog({
  usageDocuments: initialUsageDocuments,
  knowledgeDocuments: initialKnowledgeDocuments,
  onClose,
  onSaveDocument,
  onRemoveDocument,
}: {
  usageDocuments: UserFirestoreDocumentRow[];
  knowledgeDocuments: UserFirestoreDocumentRow[];
  onClose: () => void;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  const [usageDocuments, setUsageDocuments] = useState(initialUsageDocuments);
  const [usageDocumentsSource, setUsageDocumentsSource] =
    useState(initialUsageDocuments);
  const [knowledgeDocuments, setKnowledgeDocuments] = useState(
    initialKnowledgeDocuments,
  );
  const [knowledgeDocumentsSource, setKnowledgeDocumentsSource] = useState(
    initialKnowledgeDocuments,
  );
  const [usageQuery, setUsageQuery] = useState("");
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [pageSize, setPageSize] = useState<FirestoreDocumentPageSize>(
    DEFAULT_FIRESTORE_DOCUMENT_PAGE_SIZE,
  );
  const [usagePage, setUsagePage] = useState(1);
  const [knowledgePage, setKnowledgePage] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );
  const [selectedSection, setSelectedSection] = useState<
    "usage" | "knowledge" | null
  >(null);
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );
  if (usageDocumentsSource !== initialUsageDocuments) {
    setUsageDocumentsSource(initialUsageDocuments);
    setUsageDocuments(initialUsageDocuments);
  }
  if (knowledgeDocumentsSource !== initialKnowledgeDocuments) {
    setKnowledgeDocumentsSource(initialKnowledgeDocuments);
    setKnowledgeDocuments(initialKnowledgeDocuments);
  }

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

  const filteredUsage = useMemo(() => {
    const q = usageQuery.trim().toLowerCase();
    const docs = sortPrivateUsageDocuments(
      filterSupportAiPrivateUsageDocuments(usageDocuments),
    );
    if (!q) return docs;
    return docs.filter((doc) => privateUsageSearchText(doc).includes(q));
  }, [usageDocuments, usageQuery]);

  const filteredKnowledge = useMemo(() => {
    const q = knowledgeQuery.trim().toLowerCase();
    const docs = sortSupportAiKnowledgeDocuments(knowledgeDocuments);
    if (!q) return docs;
    return docs.filter((doc) => supportAiKnowledgeSearchText(doc).includes(q));
  }, [knowledgeDocuments, knowledgeQuery]);

  const usageTotalPages = Math.max(1, Math.ceil(filteredUsage.length / pageSize));
  const usageCurrentPage = Math.min(usagePage, usageTotalPages);
  const paginatedUsage = useMemo(() => {
    const start = (usageCurrentPage - 1) * pageSize;
    return filteredUsage.slice(start, start + pageSize);
  }, [filteredUsage, usageCurrentPage, pageSize]);

  const knowledgeTotalPages = Math.max(
    1,
    Math.ceil(filteredKnowledge.length / pageSize),
  );
  const knowledgeCurrentPage = Math.min(knowledgePage, knowledgeTotalPages);
  const paginatedKnowledge = useMemo(() => {
    const start = (knowledgeCurrentPage - 1) * pageSize;
    return filteredKnowledge.slice(start, start + pageSize);
  }, [filteredKnowledge, knowledgeCurrentPage, pageSize]);

  function openView(doc: UserFirestoreDocumentRow, section: "usage" | "knowledge") {
    setSelectedSection(section);
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
    if (doc.collectionId === "private") {
      setUsageDocuments((current) =>
        current.map((row) => (row.path === doc.path ? updated : row)),
      );
    } else {
      setKnowledgeDocuments((current) =>
        current.map((row) => (row.path === doc.path ? updated : row)),
      );
    }
    if (selectedDoc?.path === doc.path) {
      setSelectedDoc(updated);
    }
  }

  async function handleDelete(path: string) {
    await onRemoveDocument(path);
    setUsageDocuments((current) => current.filter((row) => row.path !== path));
    setKnowledgeDocuments((current) => current.filter((row) => row.path !== path));
  }

  return (
    <>
      {createPortal(
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
            className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80"
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Workspace subcollection
                </p>
                <h3 className="text-lg font-semibold text-foreground">
                  Support AI knowledge
                </h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  River AI usage counters and user-confirmed Q&A pairs
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-5 py-5">
              <div className="space-y-8">
                <DialogSection
                  title="Usage counters"
                  description="Support chat and attachment counts stored in private usage docs"
                >
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="search"
                        value={usageQuery}
                        onChange={(event) => {
                          setUsageQuery(event.target.value);
                          setUsagePage(1);
                        }}
                        placeholder="Search period, frequency, counts…"
                        className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm"
                      />
                    </div>
                    <p className="text-xs text-zinc-500">
                      Showing {paginatedUsage.length} of {filteredUsage.length}{" "}
                      usage record{filteredUsage.length === 1 ? "" : "s"}
                    </p>
                    <BusinessPrivateUsageListTable
                      documents={paginatedUsage}
                      onView={(doc) => openView(doc, "usage")}
                      onEdit={openEdit}
                      onRemove={openRemove}
                    />
                    {filteredUsage.length > pageSize && (
                      <ListPagination
                        page={usageCurrentPage}
                        totalPages={usageTotalPages}
                        totalItems={filteredUsage.length}
                        pageSize={pageSize}
                        onPageChange={setUsagePage}
                      />
                    )}
                  </div>
                </DialogSection>

                <DialogSection
                  title="Knowledge base"
                  description="Confirmed questions and answers saved for River AI retrieval"
                >
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="search"
                          value={knowledgeQuery}
                          onChange={(event) => {
                            setKnowledgeQuery(event.target.value);
                            setKnowledgePage(1);
                          }}
                          placeholder="Search question, answer, session, user…"
                          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-zinc-600">
                        <span className="whitespace-nowrap font-medium">Per page</span>
                        <select
                          value={pageSize}
                          onChange={(event) => {
                            setPageSize(
                              Number(event.target.value) as FirestoreDocumentPageSize,
                            );
                            setUsagePage(1);
                            setKnowledgePage(1);
                          }}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                        >
                          {FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Showing {paginatedKnowledge.length} of{" "}
                      {filteredKnowledge.length} knowledge entr
                      {filteredKnowledge.length === 1 ? "y" : "ies"}
                    </p>
                    <BusinessSupportAiKnowledgeListTable
                      documents={paginatedKnowledge}
                      onView={(doc) => openView(doc, "knowledge")}
                      onEdit={openEdit}
                      onRemove={openRemove}
                    />
                    {filteredKnowledge.length > pageSize && (
                      <ListPagination
                        page={knowledgeCurrentPage}
                        totalPages={knowledgeTotalPages}
                        totalItems={filteredKnowledge.length}
                        pageSize={pageSize}
                        onPageChange={setKnowledgePage}
                      />
                    )}
                  </div>
                </DialogSection>
              </div>
            </div>
          </div>
        </div>,
        window.document.body,
      )}

      {selectedDoc && (
        <FirestoreDocumentDetailDialog
          doc={selectedDoc}
          sectionTitle={
            selectedSection === "usage" ? "Support AI usage" : "Support AI knowledge"
          }
          onClose={() => {
            setSelectedDoc(null);
            setSelectedSection(null);
          }}
          onEdit={() => openEdit(selectedDoc)}
          onRemove={() => openRemove(selectedDoc)}
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
