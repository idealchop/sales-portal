import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { humanizeFieldKey } from "@/lib/admin/user-profile-display";

export type ParsedRawSubmissionListRow = {
  customerName: string;
  customerSubtitle: string;
  submissionTypeLabel: string;
  referenceLabel: string;
  transactionSummary: string;
  totalLabel: string;
  orderedAtLabel: string;
  statusLabel: string;
  statusClassName: string;
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ?
      (value as Record<string, unknown>)
    : {};
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

function formatOrderedAtLabel(value: unknown): string {
  const ms = timestampMs(value);
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(amount: unknown): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return `₱${value.toLocaleString("en-PH")}`;
}

function submissionTypeLabel(type: string): string {
  if (!type) return "Submission";
  return type.replaceAll("_", " ");
}

function rawSubmissionStatusMeta(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "pending_review":
      return {
        label: "Pending review",
        className: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "processed":
      return {
        label: "Accepted",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "rejected":
    case "cancelled":
      return {
        label: "Cancelled",
        className: "border-zinc-200 bg-zinc-100 text-zinc-700",
      };
    default:
      return {
        label: humanizeFieldKey(status || "unknown"),
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
      };
  }
}

function formatLineItems(items: unknown): string {
  if (!Array.isArray(items) || items.length === 0) return "";

  return items
    .map((item) => {
      const record =
        item && typeof item === "object" ?
          (item as Record<string, unknown>)
        : {};
      const qty = Number(record.qty);
      const type = readString(record.type);
      const inventoryId = readString(record.inventoryId);
      if (type && Number.isFinite(qty)) return `${qty}x ${type}`;
      if (inventoryId && Number.isFinite(qty)) return `${qty}× return`;
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function transactionSummary(
  submissionType: string,
  payload: Record<string, unknown>,
): string {
  if (
    submissionType === "MARK_TX_COMPLETE" ||
    submissionType === "PORTAL_PAY_BALANCE"
  ) {
    const payment = readRecord(payload.payment);
    const method = readString(payment.method) || "payment";
    return submissionType === "PORTAL_PAY_BALANCE" ?
        `Balance payment · ${method}`
      : `Mark complete · ${method}`;
  }

  return (
    formatLineItems(payload.refillItems) ||
    formatLineItems(payload.returnContainers) ||
    "—"
  );
}

function referenceLabel(
  submissionType: string,
  referenceId: string,
  payload: Record<string, unknown>,
): string {
  if (
    submissionType === "MARK_TX_COMPLETE" ||
    submissionType === "PORTAL_PAY_BALANCE"
  ) {
    return readString(payload.transactionReferenceId) || referenceId || "—";
  }
  return referenceId || "—";
}

export function parseRawSubmissionListRow(
  doc: UserFirestoreDocumentRow,
): ParsedRawSubmissionListRow {
  const data = doc.data;
  const payload = readRecord(data.payload);
  const profile = readRecord(payload.profile);
  const address = readRecord(payload.address);
  const submissionType = readString(data.submissionType);
  const status = readString(data.status) || "pending_review";
  const statusMeta = rawSubmissionStatusMeta(status);

  const customerName =
    readString(profile.name) ||
    readString(data.customerName) ||
    (readString(data.customerId) ?
      readString(data.customerId).slice(-8).toUpperCase()
    : "Portal");

  const customerSubtitle =
    readString(address.line) ||
    readString(address.formatted) ||
    readString(profile.companyName) ||
    "Portal user";

  return {
    customerName,
    customerSubtitle,
    submissionTypeLabel: submissionTypeLabel(submissionType),
    referenceLabel: referenceLabel(
      submissionType,
      readString(data.referenceId),
      payload,
    ),
    transactionSummary: transactionSummary(submissionType, payload),
    totalLabel: formatCurrency(
      payload.totalAmount ?? readRecord(payload.payment).amountPaid,
    ),
    orderedAtLabel: formatOrderedAtLabel(data.submittedAt ?? data.metadata),
    statusLabel: statusMeta.label,
    statusClassName: statusMeta.className,
  };
}

export function sortRawSubmissionDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort(
    (a, b) => timestampMs(b.data.submittedAt) - timestampMs(a.data.submittedAt),
  );
}

export function rawSubmissionSearchText(doc: UserFirestoreDocumentRow): string {
  const row = parseRawSubmissionListRow(doc);
  return [
    row.customerName,
    row.customerSubtitle,
    row.submissionTypeLabel,
    row.referenceLabel,
    row.transactionSummary,
    row.statusLabel,
    readString(doc.data.customerId),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
