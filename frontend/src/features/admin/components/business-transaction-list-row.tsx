"use client";

import {
  Banknote,
  PackageCheck,
  Shield,
  Truck,
  UserRound,
} from "lucide-react";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { parseBusinessTransactionRow } from "@/lib/admin/business-transaction-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

function StatusBadge({
  tone,
  icon: Icon,
  label,
}: {
  tone: "complete" | "pending" | "neutral" | "paid" | "partial" | "unpaid" | "na";
  icon: typeof PackageCheck;
  label: string;
}) {
  const toneClass =
    tone === "complete" || tone === "paid" ?
      "bg-emerald-500 text-white"
    : tone === "pending" || tone === "partial" ?
      "bg-amber-500 text-white"
    : tone === "unpaid" ?
      "bg-rose-500 text-white"
    : "bg-zinc-200 text-zinc-500";

  const labelClass =
    tone === "complete" || tone === "paid" ?
      "text-emerald-600"
    : tone === "pending" || tone === "partial" ?
      "text-amber-600"
    : tone === "unpaid" ?
      "text-rose-600"
    : "text-zinc-400";

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          toneClass,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span
        className={cn(
          "text-[9px] font-semibold uppercase tracking-wide",
          labelClass,
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function BusinessTransactionListRow({
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
  const row = parseBusinessTransactionRow(doc);

  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 last:border-b-0 transition hover:bg-zinc-50/60 lg:gap-4 lg:px-5">
      <button
        type="button"
        onClick={onView}
        className="grid min-w-0 flex-1 cursor-pointer gap-3 text-left lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto_auto] lg:items-center lg:gap-4"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-50 text-xs font-bold uppercase text-teal-700 ring-1 ring-zinc-200/80">
            {row.photoUrl && !row.isExpense ?
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.photoUrl}
                alt={row.title}
                className="h-full w-full object-cover"
              />
            : row.isExpense ?
              <UserRound className="h-4 w-4" />
            : row.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {row.title}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Ref. No.: {row.reference}
            </p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              {row.metaLabel}
            </p>
          </div>
        </div>

        <div className="hidden min-w-0 lg:block">
          {row.itemSummary ?
            <div>
              {row.itemQuantity !== undefined && (
                <p className="text-lg font-semibold leading-none text-zinc-900">
                  {row.itemQuantity}
                </p>
              )}
              <p className="mt-1 text-xs text-zinc-500">{row.itemSummary}</p>
            </div>
          : <span className="text-sm text-zinc-300">—</span>}
        </div>

        <div className="hidden min-w-0 lg:block">
          {row.riderName ?
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
              <Truck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{row.riderName}</span>
            </span>
          : <span className="text-sm text-zinc-300">—</span>}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <StatusBadge
            tone={row.deliveryStatusTone}
            icon={PackageCheck}
            label={row.deliveryStatusLabel}
          />
          <StatusBadge
            tone={row.paymentStatusTone}
            icon={row.paymentStatusTone === "na" ? Shield : Banknote}
            label={row.paymentStatusLabel}
          />
        </div>

        <div className="flex items-center justify-between gap-3 lg:contents">
          <div className="lg:hidden">
            {row.itemSummary && (
              <p className="text-xs text-zinc-500">{row.itemSummary}</p>
            )}
          </div>
          <p
            className={cn(
              "shrink-0 text-base font-bold tabular-nums tracking-tight",
              row.amountClassName,
            )}
          >
            {row.amountLabel}
          </p>
        </div>
      </button>

      <FirestoreActionsMenu onView={onView} onEdit={onEdit} onRemove={onRemove} />
    </div>
  );
}
