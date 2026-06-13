import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { humanizeFieldKey } from "@/lib/admin/user-profile-display";

export type ParsedAuditLogListRow = {
  level: string;
  levelClassName: string;
  message: string;
  typeLabel: string;
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

function formatAuditTimestamp(value: unknown): string {
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

function auditLevelMeta(level: string): { label: string; className: string } {
  switch (level.toLowerCase()) {
    case "error":
      return {
        label: "Error",
        className: "border-red-200 bg-red-50 text-red-800",
      };
    case "warn":
    case "warning":
      return {
        label: "Warn",
        className: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "info":
      return {
        label: "Info",
        className: "border-sky-200 bg-sky-50 text-sky-800",
      };
    case "debug":
      return {
        label: "Debug",
        className: "border-zinc-200 bg-zinc-100 text-zinc-700",
      };
    default:
      return {
        label: level ? humanizeFieldKey(level) : "—",
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
      };
  }
}

export function parseAuditLogListRow(
  doc: UserFirestoreDocumentRow,
): ParsedAuditLogListRow {
  const data = doc.data;
  const level = readString(data.level) || "info";
  const levelMeta = auditLevelMeta(level);
  const auditType = readString(data.auditType);
  const event = readString(data.event);

  return {
    level: levelMeta.label,
    levelClassName: levelMeta.className,
    message: readString(data.message) || doc.documentId,
    typeLabel:
      auditType ? humanizeFieldKey(auditType)
      : event ? humanizeFieldKey(event)
      : "—",
    timestampLabel: formatAuditTimestamp(
      data.timestamp ?? data.createdAt ?? data.updatedAt,
    ),
  };
}

export function sortAuditLogDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort((a, b) => {
    const aMs = timestampMs(
      a.data.timestamp ?? a.data.createdAt ?? a.data.updatedAt,
    );
    const bMs = timestampMs(
      b.data.timestamp ?? b.data.createdAt ?? b.data.updatedAt,
    );
    return bMs - aMs;
  });
}

export function auditLogSearchText(doc: UserFirestoreDocumentRow): string {
  const row = parseAuditLogListRow(doc);
  const data = doc.data;
  return [
    row.level,
    row.message,
    row.typeLabel,
    readString(data.event),
    readString(data.auditType),
    readString(data.userId),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
