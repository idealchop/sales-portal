import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type ParsedPrivateUsageListRow = {
  periodLabel: string;
  chatCountLabel: string;
  attachmentCountLabel: string;
  frequencyLabel: string;
  timestampLabel: string;
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

function formatUsageTimestamp(value: unknown): string {
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

function formatPeriodLabel(documentId: string, frequency: string): string {
  const match = documentId.match(/^support_ai_(monthly|yearly)_(\d{4}-\d{2}|\d{4})$/i);
  if (match) {
    const [, freq, period] = match;
    if (freq.toLowerCase() === "monthly" && /^\d{4}-\d{2}$/.test(period)) {
      const [year, month] = period.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleString("en-PH", { month: "long", year: "numeric" });
    }
    return period;
  }

  const cleaned = documentId.replace(/^support_ai_/i, "").replace(/_/g, " ");
  if (cleaned && cleaned !== documentId) return cleaned;
  if (frequency) return frequency;
  return documentId;
}

export function isSupportAiPrivateUsageDocument(
  doc: UserFirestoreDocumentRow,
): boolean {
  return doc.collectionId === "private" && /^support_ai_/i.test(doc.documentId);
}

export function filterSupportAiPrivateUsageDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return documents.filter(isSupportAiPrivateUsageDocument);
}

export function parsePrivateUsageListRow(
  doc: UserFirestoreDocumentRow,
): ParsedPrivateUsageListRow {
  const data = doc.data;
  const frequency = readString(data.frequency);
  const chatCount = readCount(data.chatCount);
  const attachmentCount = readCount(data.attachmentCount);

  return {
    periodLabel: formatPeriodLabel(doc.documentId, frequency),
    chatCountLabel: chatCount === null ? "—" : String(chatCount),
    attachmentCountLabel: attachmentCount === null ? "—" : String(attachmentCount),
    frequencyLabel: frequency || "—",
    timestampLabel: formatUsageTimestamp(data.updatedAt ?? data.createdAt),
  };
}

export function sortPrivateUsageDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort((a, b) => {
    const aMs = timestampMs(a.data.updatedAt ?? a.data.createdAt);
    const bMs = timestampMs(b.data.updatedAt ?? b.data.createdAt);
    if (aMs !== bMs) return bMs - aMs;
    return b.documentId.localeCompare(a.documentId);
  });
}

export function privateUsageSearchText(doc: UserFirestoreDocumentRow): string {
  const row = parsePrivateUsageListRow(doc);
  const data = doc.data;
  return [
    row.periodLabel,
    row.chatCountLabel,
    row.attachmentCountLabel,
    row.frequencyLabel,
    readString(data.frequency),
    doc.documentId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function supportAiKnowledgeDialogCount(
  usageDocuments: UserFirestoreDocumentRow[],
  knowledgeDocuments: UserFirestoreDocumentRow[],
): number {
  return (
    filterSupportAiPrivateUsageDocuments(usageDocuments).length +
    knowledgeDocuments.length
  );
}
