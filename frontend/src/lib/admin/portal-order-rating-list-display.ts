import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { humanizeFieldKey } from "@/lib/admin/user-profile-display";

export type ParsedPortalOrderRatingListRow = {
  customerName: string;
  contactLabel: string;
  dateLabel: string;
  serviceRating: number;
  recommends: boolean;
  sourceLabel: string;
  feedback?: string;
  transactionReferenceId: string;
};

const PORTAL_ORDER_RATING_SOURCE_LABELS: Record<string, string> = {
  portal_track_complete: "Track complete",
  portal_balance_pay: "Balance pay",
  portal_ratings: "In-app",
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

function normalizeStarRating(value: unknown): number {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 0;
  return Math.min(5, Math.max(0, Math.round(rating)));
}

function formatRatingDateLabel(value: unknown): string {
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

function portalOrderRatingSourceLabel(source: string): string {
  if (!source) return "Portal";
  return (
    PORTAL_ORDER_RATING_SOURCE_LABELS[source] ?? humanizeFieldKey(source)
  );
}

export function parsePortalOrderRatingListRow(
  doc: UserFirestoreDocumentRow,
): ParsedPortalOrderRatingListRow {
  const data = doc.data;
  const customerName = readString(data.customerName) || doc.documentId;
  const customerEmail = readString(data.customerEmail);
  const customerPhone = readString(data.customerPhone);
  const serviceRating = normalizeStarRating(data.serviceRating);
  const riderRating = normalizeStarRating(data.riderRating);
  const rating = serviceRating || riderRating;

  return {
    customerName,
    contactLabel: customerEmail || customerPhone || "—",
    dateLabel: formatRatingDateLabel(data.createdAt),
    serviceRating: rating,
    recommends: rating >= 4,
    sourceLabel: portalOrderRatingSourceLabel(readString(data.source)),
    feedback: readString(data.feedback) || undefined,
    transactionReferenceId: readString(data.transactionReferenceId),
  };
}

export function sortPortalOrderRatingDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort(
    (a, b) => timestampMs(b.data.createdAt) - timestampMs(a.data.createdAt),
  );
}

export function portalOrderRatingSearchText(
  doc: UserFirestoreDocumentRow,
): string {
  const row = parsePortalOrderRatingListRow(doc);
  return [
    row.customerName,
    row.contactLabel,
    row.feedback,
    row.transactionReferenceId,
    readString(doc.data.riderName),
    readString(doc.data.source),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
