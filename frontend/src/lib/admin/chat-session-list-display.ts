import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { humanizeFieldKey } from "@/lib/admin/user-profile-display";

export type ParsedChatSessionListRow = {
  subject: string;
  statusLabel: string;
  statusClassName: string;
  subtitle: string;
  userId: string;
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

function formatChatSessionTimestamp(value: unknown): string {
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

function chatSessionStatusMeta(status: string): {
  label: string;
  className: string;
} {
  switch (status.toLowerCase()) {
    case "ai_active":
      return {
        label: "Active",
        className: "border-sky-200 bg-sky-50 text-sky-800",
      };
    case "escalated":
      return {
        label: "Escalated",
        className: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "resolved":
      return {
        label: "Resolved",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    default:
      return {
        label: status ? humanizeFieldKey(status) : "—",
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
      };
  }
}

function chatSessionSubtitle(data: Record<string, unknown>): string {
  const summary = readString(data.conversationSummary);
  if (summary) return summary;

  const type = readString(data.type);
  if (type) return humanizeFieldKey(type);

  return "Support chat";
}

export function parseChatSessionListRow(
  doc: UserFirestoreDocumentRow,
): ParsedChatSessionListRow {
  const data = doc.data;
  const status = readString(data.status) || "ai_active";
  const statusMeta = chatSessionStatusMeta(status);

  return {
    subject: readString(data.subject) || doc.documentId,
    statusLabel: statusMeta.label,
    statusClassName: statusMeta.className,
    subtitle: chatSessionSubtitle(data),
    userId: readString(data.userId) || "—",
    timestampLabel: formatChatSessionTimestamp(
      data.updatedAt ?? data.createdAt ?? data.resolvedAt ?? data.escalatedAt,
    ),
  };
}

export function sortChatSessionDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort((a, b) => {
    const aMs = timestampMs(
      a.data.updatedAt ?? a.data.createdAt ?? a.data.resolvedAt,
    );
    const bMs = timestampMs(
      b.data.updatedAt ?? b.data.createdAt ?? b.data.resolvedAt,
    );
    return bMs - aMs;
  });
}

export function chatSessionSearchText(doc: UserFirestoreDocumentRow): string {
  const row = parseChatSessionListRow(doc);
  const data = doc.data;
  return [
    row.subject,
    row.subtitle,
    row.statusLabel,
    row.userId,
    readString(data.status),
    readString(data.type),
    readString(data.conversationSummary),
    doc.documentId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
