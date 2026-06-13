import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type ProactiveScheduleSuggestion = {
  id: string;
  customerId: string;
  customerName: string;
  scheduledDate: string;
  kind: string;
  refillItems: Array<{ type: string; qty: number }>;
  returnContainers: Array<{ inventoryId: string; qty: number; name?: string }>;
  rationale: string;
};

export type ParsedProactiveScheduleSnapshotListRow = {
  windowLabel: string;
  generatedAtLabel: string;
  expireAtLabel: string;
  suggestionCount: number;
};

export type ParsedProactiveScheduleSuggestionRow = {
  customerName: string;
  kindLabel: string;
  scheduledDateLabel: string;
  itemsLabel: string;
  rationale: string;
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

function formatSnapshotDateLabel(value: unknown): string {
  const ms = timestampMs(value);
  if (!ms) return "—";

  const date = new Date(ms);
  const datePart = date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${datePart} · ${timePart}`;
}

function formatSuggestionDateLabel(value: unknown): string {
  const ms = timestampMs(value);
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLineItems(items: unknown): string {
  if (!Array.isArray(items) || items.length === 0) return "—";

  return items
    .map((item) => {
      const record =
        item && typeof item === "object" ?
          (item as Record<string, unknown>)
        : {};
      const label =
        readString(record.type) ||
        readString(record.name) ||
        readString(record.inventoryId) ||
        "Item";
      const qty = Number(record.qty);
      return Number.isFinite(qty) && qty > 0 ? `${label} × ${qty}` : label;
    })
    .join(", ");
}

function readSuggestions(data: Record<string, unknown>): ProactiveScheduleSuggestion[] {
  if (!Array.isArray(data.suggestions)) return [];

  return data.suggestions
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: readString(record.id),
        customerId: readString(record.customerId),
        customerName: readString(record.customerName) || "Unknown customer",
        scheduledDate: readString(record.scheduledDate),
        kind: readString(record.kind),
        refillItems: Array.isArray(record.refillItems) ?
          record.refillItems
            .filter((line) => line && typeof line === "object")
            .map((line) => {
              const entry = line as Record<string, unknown>;
              return {
                type: readString(entry.type) || "Item",
                qty: Math.max(0, Number(entry.qty) || 0),
              };
            })
        : [],
        returnContainers: Array.isArray(record.returnContainers) ?
          record.returnContainers
            .filter((line) => line && typeof line === "object")
            .map((line) => {
              const entry = line as Record<string, unknown>;
              return {
                inventoryId: readString(entry.inventoryId),
                qty: Math.max(0, Number(entry.qty) || 0),
                name: readString(entry.name) || undefined,
              };
            })
        : [],
        rationale: readString(record.rationale),
      };
    });
}

export function parseProactiveScheduleSnapshotListRow(
  doc: UserFirestoreDocumentRow,
): ParsedProactiveScheduleSnapshotListRow {
  const data = doc.data;
  const suggestions = readSuggestions(data);

  return {
    windowLabel: readString(data.windowLabel) || doc.documentId,
    generatedAtLabel: formatSnapshotDateLabel(data.generatedAt),
    expireAtLabel: formatSnapshotDateLabel(data.expireAt),
    suggestionCount: suggestions.length,
  };
}

export function parseProactiveScheduleSuggestionRow(
  suggestion: ProactiveScheduleSuggestion,
): ParsedProactiveScheduleSuggestionRow {
  const refillLabel = formatLineItems(suggestion.refillItems);
  const returnLabel = formatLineItems(suggestion.returnContainers);
  const itemsLabel =
    refillLabel !== "—" && returnLabel !== "—" ?
      `${refillLabel} · Returns: ${returnLabel}`
    : refillLabel !== "—" ? refillLabel
    : returnLabel !== "—" ? `Returns: ${returnLabel}`
    : "—";

  return {
    customerName: suggestion.customerName,
    kindLabel:
      suggestion.kind ?
        suggestion.kind.charAt(0).toUpperCase() + suggestion.kind.slice(1)
      : "—",
    scheduledDateLabel: formatSuggestionDateLabel(suggestion.scheduledDate),
    itemsLabel,
    rationale: suggestion.rationale || "—",
  };
}

export function getProactiveScheduleSuggestions(
  doc: UserFirestoreDocumentRow,
): ProactiveScheduleSuggestion[] {
  return readSuggestions(doc.data);
}

export function sortProactiveScheduleSnapshotDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort(
    (a, b) => timestampMs(b.data.generatedAt) - timestampMs(a.data.generatedAt),
  );
}

export function proactiveScheduleSuggestionSearchText(
  suggestion: ProactiveScheduleSuggestion,
): string {
  const row = parseProactiveScheduleSuggestionRow(suggestion);
  return [
    row.customerName,
    row.kindLabel,
    row.itemsLabel,
    row.rationale,
    suggestion.customerId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
