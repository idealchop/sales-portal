"use client";

import { Loader2, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CatalogDocumentFormDialog } from "@/features/admin/components/catalog-document-form-dialog";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { FirestoreDocumentDetailDialog } from "@/features/admin/components/firestore-document-detail-dialog";
import { useAdminCatalogCollection } from "@/hooks/use-admin-catalog-collection";
import {
  ADMIN_CATALOG_COLLECTIONS,
  catalogDocumentActive,
  catalogDocumentDisplayName,
  catalogDocumentIsWaterContainer,
  catalogDocumentSubtitle,
  isVersionedCatalogCollection,
  type AdminCatalogCollectionId,
} from "@/lib/admin/catalog-collections";
import {
  formatPlanPriceLine,
  missingRequiredPlanCodes,
  planOnPricingPage,
  planPresetLabel,
  sortCatalogPlanDocuments,
} from "@/lib/admin/plan-catalog-display";
import {
  formatAddonPlansLine,
  formatAddonPriceLine,
  formatVoucherOfferLine,
} from "@/lib/admin/catalog-offer-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

function ProductIconPreview({ data }: { data: Record<string, unknown> }) {
  const imageUrl =
    typeof data.imageUrl === "string" && data.imageUrl.trim() ?
      data.imageUrl.trim()
    : null;
  const lucide =
    typeof data.lucide === "string" && data.lucide.trim() ?
      data.lucide.trim()
    : null;

  if (imageUrl) {
    return (
      <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-contain p-1"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-[10px] font-medium uppercase text-zinc-500">
      {lucide ? lucide.slice(0, 2) : "—"}
    </div>
  );
}

export function AdminCatalogCollectionManager({
  collectionId,
  enabled = true,
  compact = false,
}: {
  collectionId: AdminCatalogCollectionId;
  enabled?: boolean;
  compact?: boolean;
}) {
  const meta = ADMIN_CATALOG_COLLECTIONS[collectionId];
  const { documents, isLoading, error, saveDocument, publishDocument, deactivateDocument, listAudit, removeDocument } =
    useAdminCatalogCollection(collectionId, enabled);
  const versioned = isVersionedCatalogCollection(collectionId);

  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [viewDoc, setViewDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPresetCode, setCreatePresetCode] = useState<string | undefined>(undefined);
  const isPlans = collectionId === "subscription_plans";
  const isAddons = collectionId === "subscription_addons";
  const isVouchers = collectionId === "vouchers_affiliates";
  const isIcons = collectionId === "product_icons";
  const howItWorks = "howItWorks" in meta ? meta.howItWorks : undefined;

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = documents.filter((doc) => {
      if (activeOnly && !catalogDocumentActive(doc.data)) return false;
      if (!normalized) return true;
      const haystack = [
        doc.documentId,
        catalogDocumentDisplayName(doc.data, doc.documentId),
        catalogDocumentSubtitle(doc.data),
        JSON.stringify(doc.data),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
    return isPlans ? sortCatalogPlanDocuments(filtered) : filtered;
  }, [documents, query, activeOnly, isPlans]);

  const missingPlans = isPlans ? missingRequiredPlanCodes(documents) : [];

  function openCreate(presetCode?: string) {
    setCreatePresetCode(presetCode);
    setCreateOpen(true);
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact ?
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {isIcons ? "SmartRefill config" : "Subscriptions"}
            </p>
            <h1 className="text-2xl font-bold text-foreground">{meta.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
              {meta.description}
            </p>
            {isPlans ?
              <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                The signup trial is configured separately.{" "}
                <Link href="/subscriptions/trial" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
                  Open free trial
                </Link>
              </p>
            : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openCreate(isVouchers ? "voucher" : undefined)}>
              <Plus className="mr-2 h-4 w-4" />
              {isPlans ?
                "Add a plan"
              : isAddons ?
                "Add an add-on"
              : isVouchers ?
                "Add a voucher"
              : "Add"}
            </Button>
            {isVouchers ?
              <Button variant="outline" onClick={() => openCreate("affiliate")}>
                <Plus className="mr-2 h-4 w-4" />
                Add an affiliate
              </Button>
            : null}
          </div>
        </div>
      : <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted-foreground)]">{meta.description}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add icon
            </Button>
          </div>
        </div>
      }

      {howItWorks && !compact ?
        <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <h2 className="text-sm font-semibold text-foreground">How this works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
            {howItWorks.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              isPlans ? "Search plans…"
              : isAddons ? "Search add-ons…"
              : isVouchers ? "Search codes…"
              : isIcons ? "Search icons…"
              : "Search by name…"
            }
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-9 text-sm outline-none ring-[var(--primary)] focus:ring-2"
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant={activeOnly ? "primary" : "outline"}
          onClick={() => setActiveOnly((current) => !current)}
        >
          {activeOnly ?
            isPlans ? "Offered only"
            : isAddons ? "Offered only"
            : isIcons ? "Shown only"
            : "Active only"
          : isPlans ? "All plans"
          : isAddons ? "All add-ons"
          : isVouchers ? "All codes"
          : isIcons ? "All icons"
          : "All statuses"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {missingPlans.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">
            {missingPlans.includes("free") ?
              "Free (₱0) is missing. Stations that finish the trial without paying need this plan."
            : "A catalog plan is missing from this list."}
          </p>
          <p className="mt-1 text-amber-800">
            Add {missingPlans.map((code) => planPresetLabel(code)).join(", ")} so pricing and
            the free trial stay complete.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingPlans.map((code) => (
              <Button
                key={code}
                type="button"
                size="sm"
                onClick={() => openCreate(code)}
              >
                Add {planPresetLabel(code)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {isLoading && documents.length === 0 ?
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isPlans ? "Loading plans…"
            : isAddons ? "Loading add-ons…"
            : isVouchers ? "Loading codes…"
            : isIcons ? "Loading icons…"
            : "Loading…"}
          </div>
        : filteredDocuments.length === 0 ?
          <div className="px-6 py-16 text-center text-sm text-zinc-500">
            {documents.length === 0 ?
              isPlans ?
                "No plans yet. Add Free (₱0) first so trials have somewhere to land."
              : isAddons ?
                "No add-ons yet. Add Extra rider, AI boost, or Additional business."
              : isVouchers ?
                "No vouchers or affiliates yet. Add a checkout code or a partner."
              : isIcons ?
                "No product icons yet. Add one for gallons, bottles, or other products."
              : "Nothing here yet."
            : activeOnly ?
              "Nothing matches your filters."
            : "Nothing matches your search."}
          </div>
        : <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  {isIcons ? <th className="px-4 py-3">Icon</th> : null}
                  <th className="px-4 py-3">Name</th>
                  {isPlans ?
                    <>
                      <th className="px-4 py-3">Price</th>
                      <th className="hidden px-4 py-3 md:table-cell">On pricing page</th>
                    </>
                  : isAddons ?
                    <>
                      <th className="px-4 py-3">Price</th>
                      <th className="hidden px-4 py-3 md:table-cell">Available on</th>
                    </>
                  : isVouchers ?
                    <>
                      <th className="px-4 py-3">Code</th>
                      <th className="hidden px-4 py-3 md:table-cell">Offer</th>
                    </>
                  : null}
                  {isIcons ? <th className="px-4 py-3">Water container</th> : null}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredDocuments.map((doc) => {
                  const subtitle = catalogDocumentSubtitle(doc.data);
                  const waterContainer = catalogDocumentIsWaterContainer(doc.data);
                  return (
                    <tr
                      key={doc.path}
                      onClick={() => setEditDoc(doc)}
                      className="cursor-pointer hover:bg-zinc-50/60"
                    >
                      {isIcons ?
                        <td className="px-4 py-3">
                          <ProductIconPreview data={doc.data} />
                        </td>
                      : null}
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {catalogDocumentDisplayName(doc.data, doc.documentId)}
                        </p>
                        {isPlans ?
                          <p className="mt-0.5 text-xs text-zinc-500 md:hidden">
                            {planOnPricingPage(doc.data) ? "On pricing page" : "Hidden from pricing"}
                          </p>
                        : isAddons ?
                          <p className="mt-0.5 text-xs text-zinc-500 md:hidden">
                            {formatAddonPlansLine(doc.data)}
                          </p>
                        : isVouchers ?
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {String(doc.data.kind || "voucher") === "affiliate" ?
                              "Affiliate"
                            : "Voucher"}
                          </p>
                        : subtitle ?
                          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
                        : null}
                      </td>
                      {isPlans ?
                        <>
                          <td className="px-4 py-3 text-zinc-700">
                            {formatPlanPriceLine(doc.data)}
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                planOnPricingPage(doc.data) ?
                                  "bg-emerald-50 text-emerald-700"
                                : "bg-zinc-100 text-zinc-600",
                              )}
                            >
                              {planOnPricingPage(doc.data) ? "Yes" : "Hidden"}
                            </span>
                          </td>
                        </>
                      : isAddons ?
                        <>
                          <td className="px-4 py-3 text-zinc-700">
                            {formatAddonPriceLine(doc.data)}
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell text-zinc-600">
                            {formatAddonPlansLine(doc.data)}
                          </td>
                        </>
                      : isVouchers ?
                        <>
                          <td className="px-4 py-3 font-medium text-zinc-700">
                            {String(doc.data.code || "—")}
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell text-zinc-600">
                            {formatVoucherOfferLine(doc.data)}
                          </td>
                        </>
                      : null}
                      {collectionId === "product_icons" ?
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              waterContainer ?
                                "bg-sky-50 text-sky-800"
                              : "bg-zinc-100 text-zinc-600",
                            )}
                          >
                            {waterContainer ? "Yes" : "No"}
                          </span>
                        </td>
                      : null}
                      <td className="px-4 py-3">
                        {(() => {
                          const active = catalogDocumentActive(doc.data);
                          const status = String(doc.data.catalogStatus || "published");
                          const pendingDraft =
                            Boolean(doc.data.draft && typeof doc.data.draft === "object");
                          if (active === false) {
                            return (
                              <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600">
                                Inactive
                              </span>
                            );
                          }
                          if (versioned && (status === "draft" || pendingDraft)) {
                            return (
                              <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-800">
                                {status === "published" ? "Published · draft pending" : "Draft"}
                              </span>
                            );
                          }
                          if (active === undefined && !versioned) {
                            return <span className="text-zinc-400">—</span>;
                          }
                          return (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">
                              {versioned ? "Published" : active ? "Active" : "Inactive"}
                            </span>
                          );
                        })()}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <FirestoreActionsMenu
                          onView={() => setViewDoc(doc)}
                          onLogs={
                            versioned ?
                              async () => {
                                const entries = await listAudit(doc.documentId);
                                const lines =
                                  entries.length === 0 ?
                                    "No catalog changes yet."
                                  : entries
                                    .map((entry) =>
                                      [
                                        entry.createdAt || "unknown time",
                                        entry.action,
                                        entry.actorEmail || entry.actorUid,
                                      ].join(" · "),
                                    )
                                    .join("\n");
                                window.alert(lines);
                              }
                            : undefined
                          }
                          onEdit={() => setEditDoc(doc)}
                          onPublish={
                            versioned ?
                              async () => {
                                await publishDocument(doc.documentId);
                              }
                            : undefined
                          }
                          onDeactivate={
                            versioned ?
                              async () => {
                                if (
                                  window.confirm(
                                    `Deactivate ${catalogDocumentDisplayName(doc.data, doc.documentId)}? Existing subscribers keep it until they change plan.`,
                                  )
                                ) {
                                  await deactivateDocument(doc.documentId);
                                }
                              }
                            : undefined
                          }
                          hideRemove={versioned}
                          onRemove={versioned ? undefined : () => setDeleteDoc(doc)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }
      </div>

      {viewDoc && (
        <FirestoreDocumentDetailDialog
          doc={viewDoc}
          sectionTitle={meta.title}
          onClose={() => setViewDoc(null)}
          onEdit={() => {
            setEditDoc(viewDoc);
            setViewDoc(null);
          }}
          onRemove={
            versioned ?
              undefined
            : () => {
                setDeleteDoc(viewDoc);
                setViewDoc(null);
              }
          }
        />
      )}

      {editDoc && (
        <CatalogDocumentFormDialog
          mode="edit"
          collectionId={collectionId}
          existingDocumentIds={documents.map((doc) => doc.documentId)}
          initialDocumentId={editDoc.documentId}
          initialData={editDoc.data}
          onClose={() => setEditDoc(null)}
          onSave={async (documentId, data) => {
            await saveDocument(documentId, data);
          }}
          onPublish={
            versioned ?
              async (documentId, data) => {
                await saveDocument(documentId, data);
                const effectiveAt =
                  typeof data.effectiveAt === "string" ? data.effectiveAt : undefined;
                await publishDocument(documentId, effectiveAt);
              }
            : undefined
          }
        />
      )}

      {deleteDoc && (
        <DeleteFirestoreDocDialog
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={async () => {
            await removeDocument(deleteDoc.documentId);
          }}
        />
      )}

      {createOpen && (
        <CatalogDocumentFormDialog
          mode="create"
          collectionId={collectionId}
          existingDocumentIds={documents.map((doc) => doc.documentId)}
          createPresetCode={createPresetCode}
          onClose={() => {
            setCreateOpen(false);
            setCreatePresetCode(undefined);
          }}
          onSave={async (documentId, data) => {
            await saveDocument(documentId, data);
          }}
          onPublish={
            versioned ?
              async (documentId, data) => {
                await saveDocument(documentId, data);
                const effectiveAt =
                  typeof data.effectiveAt === "string" ? data.effectiveAt : undefined;
                await publishDocument(documentId, effectiveAt);
              }
            : undefined
          }
        />
      )}
    </div>
  );
}
