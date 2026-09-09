"use client";

import { ChevronDown, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { BusinessSubcollectionListSection } from "@/features/admin/components/business-subcollection-list-section";
import { useAdminBusinessSubcollection } from "@/hooks/use-admin-business-subcollection";
import {
  filterBusinessCollectionGroups,
  groupBusinessCollectionsByCategory,
  resolveBusinessCollectionMeta,
  type BusinessCollectionGroup,
} from "@/lib/admin/business-collections-nav";
import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

function CollectionCollapsibleSection({
  group,
  businessId,
  open,
  onToggle,
  onSaveDocument,
  onRemoveDocument,
}: {
  group: BusinessCollectionGroup;
  businessId: string;
  open: boolean;
  onToggle: () => void;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  const meta = resolveBusinessCollectionMeta(group.collectionId, group.title);
  const Icon = meta.icon;
  const count = group.totalCount ?? group.documents.length;

  const { documents, isLoading, error, setDocuments } =
    useAdminBusinessSubcollection(
      businessId,
      group.collectionId,
      open,
      (group.documents ?? []) as BusinessFirestoreDocumentRow[],
      group.totalCount,
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-zinc-50/80"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-zinc-900">
              {group.title}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">
              {count}
            </span>
          </span>
          <span className="mt-0.5 block text-sm text-zinc-500">
            {meta.description}
          </span>
          <span className="mt-1 block font-mono text-[11px] text-zinc-400">
            {group.collectionId}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ?
        <div className="border-t border-zinc-100 px-4 py-4 sm:px-5">
          {isLoading ?
            <div className="flex items-center justify-center py-14">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
            </div>
          : error ?
            <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-8 text-center text-sm text-red-700">
              {error}
            </div>
          : <BusinessSubcollectionListSection
              collectionId={group.collectionId}
              title={group.title}
              documents={documents as UserFirestoreDocumentRow[]}
              businessId={businessId}
              hideHeader
              onSaveDocument={async (path, data) => {
                const updated = await onSaveDocument(path, data);
                setDocuments((current) =>
                  current.map((row) =>
                    row.path === path ?
                      (updated as BusinessFirestoreDocumentRow)
                    : row,
                  ),
                );
                return updated;
              }}
              onRemoveDocument={async (path) => {
                await onRemoveDocument(path);
                setDocuments((current) =>
                  current.filter((row) => row.path !== path),
                );
              }}
            />
          }
        </div>
      : null}
    </section>
  );
}

export function BusinessCollectionsPanel({
  groups,
  businessId,
  onSaveDocument,
  onRemoveDocument,
}: {
  groups: BusinessCollectionGroup[];
  businessId: string;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const filteredGroups = useMemo(
    () => filterBusinessCollectionGroups(groups, query),
    [groups, query],
  );
  const categorized = useMemo(
    () => groupBusinessCollectionsByCategory(filteredGroups),
    [filteredGroups],
  );

  function toggleCollection(collectionId: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(collectionId)) next.delete(collectionId);
      else next.add(collectionId);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-zinc-300" />
        <p className="mt-3 text-sm font-medium text-zinc-800">
          No subcollections yet
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Remaining Firestore subcollections for this business will appear here.
          Common ones like customers, products, and inventory open from the
          workspace toolbar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Collections
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {groups.length} available · expand a section to browse documents
            </p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search collections…"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none ring-teal-500 focus:ring-2"
            />
          </div>
        </div>
      </div>

      {categorized.length === 0 ?
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
          No collections match “{query.trim()}”.
        </div>
      : categorized.map((category) => (
          <div key={category.categoryId} className="space-y-3">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {category.label}
            </p>
            <div className="space-y-3">
              {category.groups.map((group) => (
                <CollectionCollapsibleSection
                  key={group.collectionId}
                  group={group}
                  businessId={businessId}
                  open={openIds.has(group.collectionId)}
                  onToggle={() => toggleCollection(group.collectionId)}
                  onSaveDocument={onSaveDocument}
                  onRemoveDocument={onRemoveDocument}
                />
              ))}
            </div>
          </div>
        ))
      }
    </div>
  );
}
