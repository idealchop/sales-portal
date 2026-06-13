import { formatProfileScalar, formatProfileTimestamp } from "@/lib/admin/user-profile-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type FirestoreDocumentDisplayMode = "cards" | "rows";

export const FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS = [5, 8, 10, 15, 20, 25] as const;
export type FirestoreDocumentPageSize =
  (typeof FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_FIRESTORE_DOCUMENT_PAGE_SIZE = 10;

export function firestoreDocumentSearchText(
  doc: UserFirestoreDocumentRow,
): string {
  const scalarParts = Object.entries(doc.data)
    .filter(([, value]) => value === null || typeof value !== "object")
    .map(([, value]) => formatProfileScalar(value) ?? "")
    .filter(Boolean);

  return [doc.documentId, doc.collectionId, doc.path, ...scalarParts]
    .join(" ")
    .toLowerCase();
}

export function firestoreDocumentSummary(
  doc: UserFirestoreDocumentRow,
  maxFields = 3,
): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(doc.data)) {
    if (value === null || value === undefined || typeof value === "object") {
      continue;
    }
    const formatted =
      key.toLowerCase().includes("at") ?
        formatProfileTimestamp(value)
      : formatProfileScalar(value);
    if (!formatted) continue;
    parts.push(`${key}: ${formatted}`);
    if (parts.length >= maxFields) break;
  }

  return parts.length > 0 ? parts.join(" · ") : doc.path;
}

export function subcollectionFilterOptions(
  collectionId: string,
): { value: string; label: string }[] {
  if (collectionId === "members") {
    return [
      { value: "all", label: "All roles" },
      { value: "admin", label: "Admin" },
      { value: "rider", label: "Rider" },
    ];
  }
  if (collectionId === "subscriptions") {
    return [
      { value: "all", label: "All statuses" },
      { value: "active", label: "Active" },
      { value: "pending", label: "Pending" },
      { value: "cancelled", label: "Cancelled" },
    ];
  }
  return [{ value: "all", label: "All" }];
}

export function matchesSubcollectionFilter(
  doc: UserFirestoreDocumentRow,
  collectionId: string,
  filter: string,
): boolean {
  if (filter === "all") return true;

  if (collectionId === "members") {
    const role = String(doc.data.role || "").trim().toLowerCase();
    return role === filter;
  }

  if (collectionId === "subscriptions") {
    const status = String(doc.data.status || "").trim().toLowerCase();
    if (filter === "cancelled") {
      return status === "cancelled" || status === "canceled";
    }
    return status === filter;
  }

  return true;
}
