"use client";

import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  Pencil,
  Receipt,
  RotateCcw,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatPaymentStatusLabel,
  parseTransactionDetail,
  transactionPaymentStatusClass,
  type TransactionLineItem,
} from "@/lib/admin/transaction-detail-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

function DetailField({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-white text-zinc-500 shadow-sm">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500">{label}</p>
        <div className={cn("break-words text-sm font-medium text-zinc-900", valueClassName)}>
          {value}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-teal-600" />
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function LineItemsSection({
  title,
  items,
  totalAmount,
}: {
  title: string;
  items: TransactionLineItem[];
  totalAmount?: number;
}) {
  if (items.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 sm:px-5">
        <span className="h-4 w-1 rounded-full bg-teal-600" />
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>
      <div>
        {items.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="flex items-center justify-between gap-4 border-b border-zinc-50 px-4 py-3 last:border-b-0 sm:px-5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500">
                <Package className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                <p className="text-xs text-zinc-500">
                  {item.quantity} × ₱{item.unitPrice.toLocaleString("en-PH")}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
              ₱{item.subtotal.toLocaleString("en-PH")}
            </p>
          </div>
        ))}
      </div>
      {totalAmount !== undefined && (
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 sm:px-5">
          <span className="text-sm font-medium text-zinc-600">Total</span>
          <span className="text-sm font-bold tabular-nums text-teal-700">
            ₱{totalAmount.toLocaleString("en-PH")}
          </span>
        </div>
      )}
    </section>
  );
}

export function TransactionDetailDialog({
  doc,
  onClose,
  onEdit,
  onRemove,
}: {
  doc: UserFirestoreDocumentRow;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const detail = parseTransactionDetail(doc);
  const showBalanceBanner =
    !detail.isExpense &&
    detail.paymentStatus !== "paid" &&
    detail.paymentStatus !== "verified" &&
    detail.paymentStatus !== "n/a" &&
    detail.balanceDue > 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-zinc-50 shadow-2xl ring-1 ring-zinc-200/80"
      >
        <div
          className={cn(
            "relative shrink-0 overflow-hidden p-4 text-white sm:p-6",
            detail.isExpense && "bg-rose-600",
            detail.isCollection && "bg-amber-600",
            !detail.isExpense && !detail.isCollection && "bg-teal-700",
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
          <div className="absolute top-0 right-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/20 text-white shadow-lg backdrop-blur-md sm:h-14 sm:w-14">
                {detail.isCollection ?
                  <RotateCcw className="h-6 w-6 sm:h-7 sm:w-7" />
                : detail.isExpense ?
                  <ArrowUpRight className="h-6 w-6 rotate-180 sm:h-7 sm:w-7" />
                : <ArrowUpRight className="h-6 w-6 sm:h-7 sm:w-7" />}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                  <Receipt className="h-3.5 w-3.5 shrink-0" />
                  Transaction
                </p>
                <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {detail.reference}
                </h3>
                <p className="break-all font-mono text-xs text-white/70 sm:text-sm">
                  ID: {detail.documentId}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex items-center gap-1">
                <Badge className="border-white/30 bg-white/15 font-normal capitalize text-white backdrop-blur-sm">
                  {detail.typeLabel}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-white hover:bg-white/10 hover:text-white"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-white sm:text-3xl">
                {detail.isExpense ? "−" : "+"}₱
                {detail.totalAmount.toLocaleString("en-PH")}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-5">
            {showBalanceBanner && (
              <div className="flex flex-col gap-1 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-zinc-800">Payment still due</p>
                <p className="text-lg font-semibold tabular-nums text-rose-700">
                  Balance: ₱{detail.balanceDue.toLocaleString("en-PH")}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard title="Who & when">
                <DetailField
                  icon={<User className="h-4 w-4" />}
                  label={detail.isExpense ? "Payee" : "Customer"}
                  value={detail.customerName}
                />
                <DetailField
                  icon={<Calendar className="h-4 w-4" />}
                  label="Date"
                  value={detail.dateLabel}
                />
                <DetailField
                  icon={<Clock className="h-4 w-4" />}
                  label="Time"
                  value={detail.timeLabel}
                />
              </InfoCard>

              <InfoCard title="Payment">
                <DetailField
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Method"
                  value={detail.paymentMethod}
                />
                <DetailField
                  icon={<Receipt className="h-4 w-4" />}
                  label="Status"
                  value={formatPaymentStatusLabel(detail.paymentStatus)}
                  valueClassName={transactionPaymentStatusClass(detail.paymentStatus)}
                />
                <DetailField
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Paid so far"
                  value={`₱${detail.amountPaid.toLocaleString("en-PH")}`}
                />
              </InfoCard>
            </div>

            <LineItemsSection
              title="Water refills"
              items={detail.waterRefills}
              totalAmount={
                detail.waterRefills.length > 0 ? detail.totalAmount : undefined
              }
            />

            <LineItemsSection title="Line items" items={detail.items} />

            <InfoCard title="Payment history">
              {detail.payments.length > 0 ?
                <div className="space-y-2">
                  {detail.payments.map((payment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          ₱{payment.amount.toLocaleString("en-PH")}
                        </p>
                        <p className="text-xs text-zinc-500">{payment.dateLabel}</p>
                      </div>
                      {payment.method && (
                        <span className="text-xs font-medium text-zinc-600">
                          {payment.method}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              : <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
                  <Receipt className="mx-auto h-6 w-6 text-zinc-300" />
                  <p className="mt-2 text-sm text-zinc-500">
                    No payments recorded yet
                  </p>
                </div>
              }
            </InfoCard>

            {detail.deliveryStatus && (
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Delivery status
                    </p>
                    <p className="mt-1 text-sm font-bold uppercase text-emerald-800">
                      {detail.deliveryStatus.replaceAll("_", " ")}
                    </p>
                    {detail.deliveryUpdatedLabel && (
                      <p className="mt-1 text-xs text-emerald-700/80">
                        {detail.deliveryUpdatedLabel}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              </section>
            )}

            {detail.notes && (
              <InfoCard title="Notes">
                <p className="text-sm leading-relaxed text-zinc-600">{detail.notes}</p>
              </InfoCard>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 bg-white px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onRemove}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
