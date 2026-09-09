"use client";

import { CheckCircle2, CircleDashed, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parseProductListRow } from "@/lib/admin/product-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const PRODUCT_TABLE_HEAD_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

function ProductStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      className={cn(
        "h-7 gap-1.5 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-wide shadow-sm",
        active ?
          "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-zinc-200 bg-zinc-50 text-zinc-600",
      )}
    >
      {active ?
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      : <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function ProductListRowDesktop({
  doc,
  onView,
  onEdit,
  onRemove,
}: {
  doc: UserFirestoreDocumentRow;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const item = parseProductListRow(doc);

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_100px_minmax(0,1fr)_110px_90px_40px] items-center border-b border-zinc-100 bg-white px-4 py-3.5 last:border-b-0 transition hover:bg-zinc-50/70">
      <button type="button" onClick={onView} className="min-w-0 pr-4 text-left">
        <p className="truncate text-sm font-semibold text-zinc-900">
          {item.name}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-zinc-500">
          {item.kindLabel}
          {item.iconId ? ` · ${item.iconId}` : ""}
        </p>
      </button>

      <div className="text-center">
        <span className="text-sm font-bold tabular-nums text-zinc-900">
          {item.priceLabel}
        </span>
      </div>

      <div className="min-w-0 px-2">
        <p className="truncate text-xs font-medium text-zinc-700">
          {item.visibilityLabel}
        </p>
        {item.defaultForOrder ?
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
            <Star className="h-3 w-3" aria-hidden />
            Station default
          </span>
        : null}
      </div>

      <div className="text-center text-xs font-medium text-zinc-600">
        {item.componentsLabel}
      </div>

      <div className="flex justify-center">
        <ProductStatusBadge active={item.active} />
      </div>

      <div className="flex justify-end">
        <FirestoreActionsMenu
          onView={onView}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}

function ProductListRowMobile({
  doc,
  onView,
  onEdit,
  onRemove,
}: {
  doc: UserFirestoreDocumentRow;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const item = parseProductListRow(doc);

  return (
    <div className="border-b border-zinc-100 bg-white p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">
            {item.kindLabel}
          </p>
        </button>
        <FirestoreActionsMenu
          onView={onView}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Price
          </p>
          <p className="mt-1 text-sm font-bold tabular-nums text-zinc-900">
            {item.priceLabel}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Status
          </p>
          <div className="mt-1">
            <ProductStatusBadge active={item.active} />
          </div>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Visibility
          </p>
          <p className="mt-1 text-xs font-medium text-zinc-700">
            {item.visibilityLabel}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{item.componentsLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function BusinessProductListTable({
  documents,
  onView,
  onEdit,
  onRemove,
}: {
  documents: UserFirestoreDocumentRow[];
  onView: (doc: UserFirestoreDocumentRow) => void;
  onEdit: (doc: UserFirestoreDocumentRow) => void;
  onRemove: (doc: UserFirestoreDocumentRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="hidden border-b border-zinc-200 bg-zinc-100/90 md:grid md:grid-cols-[minmax(0,1.4fr)_100px_minmax(0,1fr)_110px_90px_40px] md:px-4 md:py-3">
        <div className={cn(PRODUCT_TABLE_HEAD_CLASS, "pl-1")}>Product</div>
        <div className={cn(PRODUCT_TABLE_HEAD_CLASS, "text-center")}>Price</div>
        <div className={cn(PRODUCT_TABLE_HEAD_CLASS, "pl-2")}>Visibility</div>
        <div className={cn(PRODUCT_TABLE_HEAD_CLASS, "text-center")}>BOM</div>
        <div className={cn(PRODUCT_TABLE_HEAD_CLASS, "text-center")}>Status</div>
        <span className="sr-only">Actions</span>
      </div>

      <div className="hidden md:block">
        {documents.map((doc) => (
          <ProductListRowDesktop
            key={doc.path}
            doc={doc}
            onView={() => onView(doc)}
            onEdit={() => onEdit(doc)}
            onRemove={() => onRemove(doc)}
          />
        ))}
      </div>

      <div className="md:hidden">
        {documents.map((doc) => (
          <ProductListRowMobile
            key={doc.path}
            doc={doc}
            onView={() => onView(doc)}
            onEdit={() => onEdit(doc)}
            onRemove={() => onRemove(doc)}
          />
        ))}
      </div>
    </div>
  );
}
