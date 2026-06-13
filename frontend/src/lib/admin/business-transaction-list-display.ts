import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export const BUSINESS_SALE_TRANSACTION_TYPES = ["walkin", "direct_sale"] as const;
export const BUSINESS_EXPENSE_TRANSACTION_TYPES = ["expense"] as const;

export type BusinessTransactionTab = "sales" | "expense";

export type ParsedBusinessTransactionRow = {
  title: string;
  initials: string;
  photoUrl?: string;
  reference: string;
  metaLabel: string;
  itemQuantity?: number;
  itemSummary?: string;
  riderName?: string;
  deliveryStatusLabel: string;
  deliveryStatusTone: "complete" | "pending" | "neutral";
  paymentStatusLabel: string;
  paymentStatusTone: "paid" | "partial" | "unpaid" | "na";
  amountLabel: string;
  amountClassName: string;
  isExpense: boolean;
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function timestampMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const seconds = Number((value as { _seconds?: number })._seconds);
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  }
  return 0;
}

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TX";
  return parts
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTransactionDateLabel(value: unknown): string {
  const ms = timestampMs(value);
  if (!ms) return "—";
  return new Date(ms)
    .toLocaleDateString("en-PH", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

function formatTransactionTypeLabel(type: string): string {
  if (!type) return "TRANSACTION";
  if (type === "direct_sale") return "DIRECT SALE";
  return type.replaceAll("_", " ").toUpperCase();
}

function primaryWaterRefill(data: Record<string, unknown>) {
  const refills = data.waterRefills;
  if (!Array.isArray(refills) || refills.length === 0) return null;
  const row = refills[0];
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const quantity = Number(record.quantity) || 0;
  const name = readString(record.name) || "Item";
  return { quantity, name };
}

function deliveryStatusTone(
  status: string,
): ParsedBusinessTransactionRow["deliveryStatusTone"] {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "delivered") {
    return "complete";
  }
  if (normalized === "pending" || normalized === "scheduled") {
    return "pending";
  }
  return "neutral";
}

function paymentStatusTone(
  status: string,
  isExpense: boolean,
): ParsedBusinessTransactionRow["paymentStatusTone"] {
  if (isExpense) return "na";
  const normalized = status.toLowerCase();
  if (normalized === "paid" || normalized === "verified") return "paid";
  if (normalized === "partial") return "partial";
  if (normalized === "unpaid") return "unpaid";
  return "na";
}

export function parseBusinessTransactionRow(
  doc: UserFirestoreDocumentRow,
): ParsedBusinessTransactionRow {
  const data = doc.data;
  const type = readString(data.type) || "transaction";
  const isExpense = type === "expense";
  const customerName = readString(data.customerName) || "Customer";
  const title = isExpense ? "Expenses" : customerName;
  const refill = primaryWaterRefill(data);
  const totalAmount = Number(data.totalAmount) || 0;
  const paymentStatus = readString(data.paymentStatus).toLowerCase() || "unknown";
  const deliveryStatus =
    readString(data.deliveryStatus).replaceAll("_", " ") || "completed";
  const dateValue = data.createdAt ?? data.deliveredAt ?? data.scheduledAt;
  const typeLabel = formatTransactionTypeLabel(type);

  return {
    title,
    initials: initialsFromName(title),
    photoUrl:
      typeof data.customerPhotoUrl === "string" && data.customerPhotoUrl.trim() ?
        data.customerPhotoUrl.trim()
      : undefined,
    reference: readString(data.referenceId) || doc.documentId,
    metaLabel: `${formatTransactionDateLabel(dateValue)} · ${typeLabel}`,
    itemQuantity: refill?.quantity,
    itemSummary:
      refill ? `${refill.name}${refill.quantity ? ` x${refill.quantity}` : ""}` : undefined,
    riderName: readString(data.riderName) || undefined,
    deliveryStatusLabel: deliveryStatus.toUpperCase(),
    deliveryStatusTone: deliveryStatusTone(deliveryStatus),
    paymentStatusLabel:
      isExpense ? "N/A"
      : paymentStatus === "paid" || paymentStatus === "verified" ?
        "PAID"
      : paymentStatus.replaceAll("_", " ").toUpperCase(),
    paymentStatusTone: paymentStatusTone(paymentStatus, isExpense),
    amountLabel: `${isExpense ? "−" : ""}₱${totalAmount.toLocaleString("en-PH")}`,
    amountClassName: isExpense ? "text-rose-600" : "text-emerald-600",
    isExpense,
  };
}

export function businessTransactionTypesForTab(
  tab: BusinessTransactionTab,
): string[] {
  return tab === "expense" ?
      [...BUSINESS_EXPENSE_TRANSACTION_TYPES]
    : [...BUSINESS_SALE_TRANSACTION_TYPES];
}
