import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { humanizeFieldKey } from "@/lib/admin/user-profile-display";

export type ParsedNotificationListRow = {
  title: string;
  message: string;
  typeLabel: string;
  typeClassName: string;
  statusLabel: string;
  statusClassName: string;
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

function formatNotificationTimestamp(value: unknown): string {
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

function notificationTypeMeta(type: string): { label: string; className: string } {
  switch (type.toLowerCase()) {
    case "error":
      return {
        label: "Error",
        className: "border-red-200 bg-red-50 text-red-800",
      };
    case "warning":
      return {
        label: "Warning",
        className: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "success":
      return {
        label: "Success",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "info":
      return {
        label: "Info",
        className: "border-sky-200 bg-sky-50 text-sky-800",
      };
    default:
      return {
        label: type ? humanizeFieldKey(type) : "—",
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
      };
  }
}

function notificationStatusMeta(
  data: Record<string, unknown>,
): { label: string; className: string } {
  const status = readString(data.status).toLowerCase();
  if (status === "read") {
    return {
      label: "Read",
      className: "border-zinc-200 bg-zinc-50 text-zinc-600",
    };
  }
  if (status === "unread") {
    return {
      label: "Unread",
      className: "border-teal-200 bg-teal-50 text-teal-800",
    };
  }
  if (data.isRead === true) {
    return {
      label: "Read",
      className: "border-zinc-200 bg-zinc-50 text-zinc-600",
    };
  }
  if (data.isRead === false) {
    return {
      label: "Unread",
      className: "border-teal-200 bg-teal-50 text-teal-800",
    };
  }
  return {
    label: status ? humanizeFieldKey(status) : "—",
    className: "border-zinc-200 bg-zinc-50 text-zinc-600",
  };
}

export function parseNotificationListRow(
  doc: UserFirestoreDocumentRow,
): ParsedNotificationListRow {
  const data = doc.data;
  const type = readString(data.type) || "info";
  const typeMeta = notificationTypeMeta(type);
  const statusMeta = notificationStatusMeta(data);

  return {
    title: readString(data.title) || doc.documentId,
    message: readString(data.message) || "—",
    typeLabel: typeMeta.label,
    typeClassName: typeMeta.className,
    statusLabel: statusMeta.label,
    statusClassName: statusMeta.className,
    timestampLabel: formatNotificationTimestamp(
      data.createdAt ?? data.timestamp ?? data.updatedAt,
    ),
  };
}

export function sortNotificationDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort((a, b) => {
    const aMs = timestampMs(
      a.data.createdAt ?? a.data.timestamp ?? a.data.updatedAt,
    );
    const bMs = timestampMs(
      b.data.createdAt ?? b.data.timestamp ?? b.data.updatedAt,
    );
    return bMs - aMs;
  });
}

export function notificationSearchText(doc: UserFirestoreDocumentRow): string {
  const row = parseNotificationListRow(doc);
  const data = doc.data;
  return [
    row.title,
    row.message,
    row.typeLabel,
    row.statusLabel,
    readString(data.type),
    readString(data.status),
    readString(data.userId),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
