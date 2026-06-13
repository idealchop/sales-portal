"use client";

import {
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import {
  parseInventoryListRow,
  type InventoryStockStatus,
} from "@/lib/admin/inventory-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

const INVENTORY_TABLE_HEAD_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

function InventoryStatusIcon({
  tone,
}: {
  tone: InventoryStockStatus["tone"];
}) {
  switch (tone) {
    case "in_stock":
      return <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    case "low_stock":
      return <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    case "out_of_stock":
      return <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  }
}

function InventoryStatusBadge({ status }: { status: InventoryStockStatus }) {
  return (
    <Badge
      className={cn(
        "h-7 gap-1.5 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-wide shadow-sm",
        status.className,
      )}
    >
      <InventoryStatusIcon tone={status.tone} />
      {status.label}
    </Badge>
  );
}

function InventoryListRowDesktop({
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
  const item = parseInventoryListRow(doc);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_120px_130px_120px_40px] items-center border-b border-zinc-100 bg-white px-4 py-3.5 last:border-b-0 transition hover:bg-zinc-50/70">
      <button
        type="button"
        onClick={onView}
        className="min-w-0 pr-4 text-left"
      >
        <p className="truncate text-sm font-semibold text-zinc-900">
          {item.name}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-zinc-500">
          {item.category}
        </p>
      </button>

      <div className="flex flex-col items-center gap-1">
        <span className="text-lg font-bold tabular-nums leading-none text-zinc-900">
          {item.currentStock}
        </span>
        <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          {item.unit}
        </span>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm font-bold tabular-nums leading-none text-zinc-900">
          {item.unitCostLabel}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-zinc-500">
          {item.totalValueLabel}
        </span>
      </div>

      <div className="flex justify-center">
        <InventoryStatusBadge status={item.status} />
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

function InventoryListRowMobile({
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
  const item = parseInventoryListRow(doc);

  return (
    <div className="border-b border-zinc-100 bg-white p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">
            {item.category}
          </p>
        </button>
        <FirestoreActionsMenu
          onView={onView}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Stock
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900">
            {item.currentStock}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase text-zinc-500">
            {item.unit}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Value
          </p>
          <p className="mt-1 text-sm font-bold tabular-nums text-zinc-900">
            {item.unitCostLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{item.totalValueLabel}</p>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Status
          </p>
          <div className="mt-1">
            <InventoryStatusBadge status={item.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BusinessInventoryListTable({
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
      <div className="hidden border-b border-zinc-200 bg-zinc-100/90 md:grid md:grid-cols-[minmax(0,1fr)_120px_130px_120px_40px] md:px-4 md:py-3">
        <div className={cn(INVENTORY_TABLE_HEAD_CLASS, "pl-1")}>Item</div>
        <div className={cn(INVENTORY_TABLE_HEAD_CLASS, "text-center")}>Stock</div>
        <div className={cn(INVENTORY_TABLE_HEAD_CLASS, "text-center")}>Value</div>
        <div className={cn(INVENTORY_TABLE_HEAD_CLASS, "text-center")}>Status</div>
        <span className="sr-only">Actions</span>
      </div>

      <div className="hidden md:block">
        {documents.map((doc) => (
          <InventoryListRowDesktop
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
          <InventoryListRowMobile
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
