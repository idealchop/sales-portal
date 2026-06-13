import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type ParsedInventoryAssignmentRow = {
  itemName: string;
  quantityLabel: string;
  dateLabel: string;
  transactionReference?: string;
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

export function parseInventoryAssignmentRow(
  doc: UserFirestoreDocumentRow,
): ParsedInventoryAssignmentRow {
  const data = doc.data;
  const quantity = Number(data.quantityAssigned) || 0;
  const dateValue = data.date ?? data.createdAt;
  const ms = timestampMs(dateValue);

  return {
    itemName:
      readString(data.inventoryItemName) ||
      readString(data.itemName) ||
      "Container",
    quantityLabel: `${quantity > 0 ? "+" : ""}${quantity} pcs`,
    dateLabel:
      ms ?
        new Date(ms).toLocaleDateString("en-PH", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : "—",
    transactionReference: readString(data.transactionReferenceId) || undefined,
  };
}

export function formatPossessionSummary(
  rows: Array<{ itemName: string; quantity: number }>,
): string {
  if (rows.length === 0) return "No containers assigned yet.";
  if (rows.length === 1) {
    return `${rows[0].itemName} · ${rows[0].quantity} pcs`;
  }
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  return `${rows.length} items · ${total} pcs total`;
}
