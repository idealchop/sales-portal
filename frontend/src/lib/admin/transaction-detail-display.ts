import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type TransactionLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type TransactionPaymentEntry = {
  amount: number;
  method?: string;
  dateLabel: string;
};

export type ParsedTransactionDetail = {
  reference: string;
  documentId: string;
  type: string;
  typeLabel: string;
  customerName: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  paymentMethod: string;
  dateLabel: string;
  timeLabel: string;
  waterRefills: TransactionLineItem[];
  items: TransactionLineItem[];
  payments: TransactionPaymentEntry[];
  deliveryStatus?: string;
  deliveryUpdatedLabel?: string;
  notes?: string;
  isExpense: boolean;
  isCollection: boolean;
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function formatDateTimeParts(value: unknown): { dateLabel: string; timeLabel: string } {
  const ms = timestampMs(value);
  if (!ms) return { dateLabel: "—", timeLabel: "—" };
  const date = new Date(ms);
  return {
    dateLabel: date.toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    timeLabel: date.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function parseLineItems(value: unknown): TransactionLineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const quantity = readNumber(row.quantity);
      const unitPrice = readNumber(row.unitPrice ?? row.price);
      const subtotal = readNumber(row.subtotal) || quantity * unitPrice;
      const name = readString(row.name) || readString(row.itemName) || "Item";
      if (!name) return null;
      return { name, quantity, unitPrice, subtotal };
    })
    .filter((row): row is TransactionLineItem => row !== null);
}

function parsePayments(value: unknown): TransactionPaymentEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: TransactionPaymentEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const amount = readNumber(row.amount);
    const { dateLabel, timeLabel } = formatDateTimeParts(
      row.paidAt ?? row.createdAt ?? row.date,
    );
    const method = readString(row.method ?? row.paymentMethod) || undefined;
    entries.push({
      amount,
      method,
      dateLabel: `${dateLabel}${timeLabel !== "—" ? ` · ${timeLabel}` : ""}`,
    });
  }
  return entries;
}

export function formatTransactionTypeLabel(type: string): string {
  if (!type) return "Transaction";
  return type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatPaymentStatusLabel(status: string): string {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function parseTransactionDetail(
  doc: UserFirestoreDocumentRow,
): ParsedTransactionDetail {
  const data = doc.data;
  const type = readString(data.type) || "transaction";
  const isExpense = type === "expense";
  const isCollection = type === "collection";
  const totalAmount = readNumber(data.totalAmount);
  const amountPaid = readNumber(data.amountPaid);
  const balanceDue =
    readNumber(data.balanceDue) || Math.max(0, totalAmount - amountPaid);
  const paymentStatus = readString(data.paymentStatus).toLowerCase() || "unknown";
  const dateSource = data.scheduledAt ?? data.createdAt ?? data.deliveredAt;
  const { dateLabel, timeLabel } = formatDateTimeParts(dateSource);
  const deliveryUpdated = formatDateTimeParts(
    data.deliveredAt ?? data.updatedAt,
  );

  return {
    reference: readString(data.referenceId) || doc.documentId,
    documentId: doc.documentId,
    type,
    typeLabel: formatTransactionTypeLabel(type),
    customerName:
      readString(data.customerName) ||
      readString(data.payee) ||
      readString(data.vendor) ||
      "—",
    totalAmount,
    amountPaid,
    balanceDue,
    paymentStatus,
    paymentMethod: readString(data.paymentMethod) || "—",
    dateLabel,
    timeLabel,
    waterRefills: parseLineItems(data.waterRefills),
    items: parseLineItems(data.items),
    payments: parsePayments(data.payments),
    deliveryStatus: readString(data.deliveryStatus) || undefined,
    deliveryUpdatedLabel:
      deliveryUpdated.dateLabel !== "—" ?
        `Updated ${deliveryUpdated.dateLabel.replace(/, \d{4}$/, "")}, ${deliveryUpdated.timeLabel}`
      : undefined,
    notes: readString(data.notes) || undefined,
    isExpense,
    isCollection,
  };
}

export function transactionPaymentStatusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "paid" || normalized === "verified") {
    return "text-emerald-700";
  }
  if (normalized === "partial") return "text-amber-700";
  if (normalized === "unpaid") return "text-rose-700";
  return "text-zinc-800";
}
