import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type InventoryStockStatus = {
  label: string;
  className: string;
  tone: "in_stock" | "low_stock" | "out_of_stock";
};

export type ParsedInventoryListRow = {
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  unitCostLabel: string;
  totalValueLabel: string;
  status: InventoryStockStatus;
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readStockRecord(value: unknown): {
  current: number;
  min: number;
  unit: string;
} {
  const record =
    value && typeof value === "object" && !Array.isArray(value) ?
      (value as Record<string, unknown>)
    : {};
  return {
    current: readNumber(record.current),
    min: readNumber(record.min),
    unit: readString(record.unit) || "pcs",
  };
}

export function getInventoryStockStatus(
  current: number,
  min: number,
): InventoryStockStatus {
  if (current <= 0) {
    return {
      label: "Out of Stock",
      tone: "out_of_stock",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (current <= min) {
    return {
      label: "Low Stock",
      tone: "low_stock",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "In Stock",
    tone: "in_stock",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function formatInventoryCurrency(value: number, withDecimals = true): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })}`;
}

export function parseInventoryListRow(
  doc: UserFirestoreDocumentRow,
): ParsedInventoryListRow {
  const data = doc.data;
  const name = readString(data.name) || doc.documentId;
  const category =
    readString(data.category) ||
    readString(data.categoryId) ||
    "Uncategorized";
  const stock = readStockRecord(data.stock);
  const unitCost = readNumber(data.cost);
  const totalValue = stock.current * unitCost;

  return {
    name,
    category,
    currentStock: stock.current,
    unit: stock.unit.toUpperCase(),
    unitCost,
    totalValue,
    unitCostLabel: formatInventoryCurrency(unitCost),
    totalValueLabel: `Total ${formatInventoryCurrency(totalValue, false)}`,
    status: getInventoryStockStatus(stock.current, stock.min),
  };
}

export function sortInventoryDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort((a, b) => {
    const nameA = readString(a.data.name) || a.documentId;
    const nameB = readString(b.data.name) || b.documentId;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
}
