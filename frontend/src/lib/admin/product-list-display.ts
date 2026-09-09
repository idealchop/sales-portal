import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type ParsedProductListRow = {
  name: string;
  kindLabel: string;
  priceLabel: string;
  unitPrice: number;
  active: boolean;
  activeLabel: string;
  showInCustomerOrder: boolean;
  defaultForOrder: boolean;
  visibilityLabel: string;
  componentsCount: number;
  componentsLabel: string;
  iconId?: string;
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseProductListRow(
  doc: UserFirestoreDocumentRow,
): ParsedProductListRow {
  const data = doc.data;
  const name = readString(data.name) || doc.documentId;
  const itemOnly = data.itemOnly === true;
  const legacyWaterName = readString(data.legacyWaterName);
  const unitPrice = readNumber(data.unitPrice);
  const active = data.active !== false;
  const showInCustomerOrder = data.showInCustomerOrder !== false;
  const defaultForOrder = data.defaultForOrder === true;
  const components = Array.isArray(data.components) ? data.components : [];
  const iconId = readString(data.iconId) || undefined;

  const visibilityParts: string[] = [];
  if (defaultForOrder) visibilityParts.push("Default");
  if (showInCustomerOrder) visibilityParts.push("QR portal");
  else visibilityParts.push("Hidden on QR");

  return {
    name,
    kindLabel:
      itemOnly ? "Store item"
      : legacyWaterName ? `Refill · ${legacyWaterName}`
      : "Water refill",
    priceLabel: formatPrice(unitPrice),
    unitPrice,
    active,
    activeLabel: active ? "Active" : "Inactive",
    showInCustomerOrder,
    defaultForOrder,
    visibilityLabel: visibilityParts.join(" · "),
    componentsCount: components.length,
    componentsLabel:
      components.length === 0 ?
        "Service only"
      : `${components.length} SKU${components.length === 1 ? "" : "s"}`,
    iconId,
  };
}

export function productSearchText(doc: UserFirestoreDocumentRow): string {
  const row = parseProductListRow(doc);
  return [
    row.name,
    row.kindLabel,
    row.priceLabel,
    row.activeLabel,
    row.visibilityLabel,
    row.componentsLabel,
    row.iconId,
    doc.documentId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function sortProductDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort((a, b) => {
    const rowA = parseProductListRow(a);
    const rowB = parseProductListRow(b);
    if (rowA.active !== rowB.active) return rowA.active ? -1 : 1;
    if (rowA.defaultForOrder !== rowB.defaultForOrder) {
      return rowA.defaultForOrder ? -1 : 1;
    }
    return rowA.name.localeCompare(rowB.name, undefined, {
      sensitivity: "base",
    });
  });
}
