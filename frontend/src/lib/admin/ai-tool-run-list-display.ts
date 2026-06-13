import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { humanizeFieldKey } from "@/lib/admin/user-profile-display";

export type ParsedAiToolRunListRow = {
  aiModel: string;
  riskLevelLabel: string;
  riskLevelClassName: string;
  title: string;
  toolLabel: string;
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

function formatAiToolRunTimestamp(value: unknown): string {
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

function aiToolRunRiskMeta(riskLevel: string): {
  label: string;
  className: string;
} {
  switch (riskLevel.toLowerCase()) {
    case "high":
      return {
        label: "High",
        className: "border-red-200 bg-red-50 text-red-800",
      };
    case "medium":
      return {
        label: "Medium",
        className: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "low":
      return {
        label: "Low",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    default:
      return {
        label: riskLevel ? humanizeFieldKey(riskLevel) : "—",
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
      };
  }
}

export function parseAiToolRunListRow(
  doc: UserFirestoreDocumentRow,
): ParsedAiToolRunListRow {
  const data = doc.data;
  const riskLevel = readString(data.riskLevel) || "low";
  const riskMeta = aiToolRunRiskMeta(riskLevel);

  return {
    aiModel: readString(data.aiModel) || "—",
    riskLevelLabel: riskMeta.label,
    riskLevelClassName: riskMeta.className,
    title: readString(data.title) || doc.documentId,
    toolLabel: readString(data.toolLabel) || readString(data.tool) || "—",
    timestampLabel: formatAiToolRunTimestamp(
      data.createdAt ?? data.timestamp ?? data.updatedAt,
    ),
  };
}

export function sortAiToolRunDocuments(
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

export function aiToolRunSearchText(doc: UserFirestoreDocumentRow): string {
  const row = parseAiToolRunListRow(doc);
  const data = doc.data;
  return [
    row.aiModel,
    row.riskLevelLabel,
    row.title,
    row.toolLabel,
    readString(data.tool),
    readString(data.summary),
    readString(data.createdByUid),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
