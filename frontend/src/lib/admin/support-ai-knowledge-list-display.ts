import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type ParsedSupportAiKnowledgeListRow = {
  question: string;
  answer: string;
  sessionLabel: string;
  createdByLabel: string;
  timestampLabel: string;
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

function formatKnowledgeTimestamp(value: unknown): string {
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

function truncateId(value: string, head = 8, tail = 4): string {
  if (!value || value.length <= head + tail + 1) return value || "—";
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function parseSupportAiKnowledgeListRow(
  doc: UserFirestoreDocumentRow,
): ParsedSupportAiKnowledgeListRow {
  const data = doc.data;
  const sessionId = readString(data.sessionId);
  const messageId = readString(data.messageId);
  const createdBy = readString(data.createdBy);

  return {
    question: readString(data.question) || doc.documentId,
    answer: readString(data.answer) || "—",
    sessionLabel:
      sessionId ?
        messageId ?
          `${truncateId(sessionId)} · msg ${truncateId(messageId, 6, 4)}`
        : truncateId(sessionId)
      : "—",
    createdByLabel: createdBy ? truncateId(createdBy) : "—",
    timestampLabel: formatKnowledgeTimestamp(
      data.createdAt ?? data.updatedAt,
    ),
  };
}

export function sortSupportAiKnowledgeDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort((a, b) => {
    const aMs = timestampMs(a.data.createdAt ?? a.data.updatedAt);
    const bMs = timestampMs(b.data.createdAt ?? b.data.updatedAt);
    return bMs - aMs;
  });
}

export function supportAiKnowledgeSearchText(
  doc: UserFirestoreDocumentRow,
): string {
  const row = parseSupportAiKnowledgeListRow(doc);
  const data = doc.data;
  return [
    row.question,
    row.answer,
    row.sessionLabel,
    row.createdByLabel,
    readString(data.sessionId),
    readString(data.messageId),
    readString(data.createdBy),
    doc.documentId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
