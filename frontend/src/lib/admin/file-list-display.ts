import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { humanizeFieldKey } from "@/lib/admin/user-profile-display";

export type ParsedFileListRow = {
  filePath: string;
  categoryLabel: string;
  originalMimeType: string;
  sizeLabel: string;
  metaLabel: string;
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

export function formatFileSizeLabel(value: unknown): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseFileListRow(doc: UserFirestoreDocumentRow): ParsedFileListRow {
  const data = doc.data;
  const filePath = readString(data.path) || doc.documentId;
  const category = readString(data.category);
  const originalMimeType =
    readString(data.originalMimeType) || readString(data.mimeType) || "—";
  const sizeLabel = formatFileSizeLabel(data.size);

  return {
    filePath,
    categoryLabel: category ? humanizeFieldKey(category) : "Uncategorized",
    originalMimeType,
    sizeLabel,
    metaLabel: `${originalMimeType} · ${sizeLabel}`,
  };
}

export function sortFileDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort(
    (a, b) => timestampMs(b.data.createdAt) - timestampMs(a.data.createdAt),
  );
}

export function fileSearchText(doc: UserFirestoreDocumentRow): string {
  const row = parseFileListRow(doc);
  return [
    row.filePath,
    row.categoryLabel,
    row.originalMimeType,
    readString(doc.data.mimeType),
    row.sizeLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
