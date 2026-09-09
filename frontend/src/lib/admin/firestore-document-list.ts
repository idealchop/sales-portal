import {
  formatProfileScalar,
  formatProfileTimestamp,
  humanizeFieldKey,
} from "@/lib/admin/user-profile-display";
import { matchesAlertDeliveryFilter } from "@/lib/admin/alert-delivery-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type FirestoreDocumentDisplayMode = "cards" | "rows";

export const FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS = [5, 8, 10, 15, 20, 25] as const;
export type FirestoreDocumentPageSize =
  (typeof FIRESTORE_DOCUMENT_PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_FIRESTORE_DOCUMENT_PAGE_SIZE = 10;

export type FirestoreDocumentListField = {
  key: string;
  label: string;
  display: string;
  kind: "scalar" | "object";
};

/** Prefer these keys first when picking list highlights for any collection. */
const GENERIC_HIGHLIGHT_KEYS = [
  "status",
  "channel",
  "category",
  "type",
  "audience",
  "title",
  "name",
  "subject",
  "message",
  "email",
  "phone",
  "role",
  "amount",
  "total",
  "recipientCount",
  "successCount",
  "failureCount",
  "createdAt",
  "updatedAt",
  "timestamp",
] as const;

const COLLECTION_HIGHLIGHT_KEYS: Record<string, readonly string[]> = {
  alert_delivery_log: [
    "channel",
    "category",
    "status",
    "audience",
    "createdAt",
    "successCount",
    "failureCount",
    "recipientCount",
  ],
  locations: ["name", "address", "city", "status", "createdAt"],
  settings: ["key", "name", "type", "updatedAt"],
  orders: ["status", "total", "customerName", "createdAt"],
  inventory: ["name", "sku", "quantity", "status", "updatedAt"],
  analytics_daily: [
    "dateKey",
    "fulfilledCount",
    "revenueCash",
    "expensesTotal",
    "paymentCount",
    "computedAt",
  ],
  analytics_snapshots: [
    "dateKey",
    "label",
    "type",
    "status",
    "createdAt",
    "computedAt",
  ],
  river_ai_pending: [
    "tool",
    "status",
    "createdAt",
    "expiresAt",
    "id",
  ],
};

const DEFAULT_HIGHLIGHT_FIELD_COUNT = 6;

function formatFirestoreListValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return null;
  if (key.toLowerCase().includes("at") || key === "timestamp") {
    return formatProfileTimestamp(value) ?? formatProfileScalar(value);
  }
  return formatProfileScalar(value);
}

export function firestoreDocumentSearchText(
  doc: UserFirestoreDocumentRow,
): string {
  const parts = Object.entries(doc.data)
    .filter(([, value]) => value === null || typeof value !== "object")
    .map(([key, value]) => formatFirestoreListValue(key, value) ?? "")
    .filter(Boolean);

  return [doc.documentId, doc.collectionId, doc.path, ...parts]
    .join(" ")
    .toLowerCase();
}

function preferredHighlightKeys(collectionId: string): readonly string[] {
  return COLLECTION_HIGHLIGHT_KEYS[collectionId] ?? GENERIC_HIGHLIGHT_KEYS;
}

/**
 * Important scalar fields for inline list preview — not the full document.
 * Collection-specific keys win first, then common highlight keys, then leftovers.
 */
export function listFirestoreDocumentHighlightFields(
  doc: UserFirestoreDocumentRow,
  maxFields = DEFAULT_HIGHLIGHT_FIELD_COUNT,
): FirestoreDocumentListField[] {
  const preferred = preferredHighlightKeys(doc.collectionId);
  const preferredSet = new Set(preferred);
  const selected: FirestoreDocumentListField[] = [];
  const seen = new Set<string>();

  const pushField = (key: string) => {
    if (seen.has(key) || selected.length >= maxFields) return;
    if (!(key in doc.data)) return;
    const display = formatFirestoreListValue(key, doc.data[key]);
    if (!display) return;
    seen.add(key);
    selected.push({
      key,
      label: humanizeFieldKey(key),
      display,
      kind: "scalar",
    });
  };

  for (const key of preferred) {
    pushField(key);
  }

  if (selected.length < maxFields) {
    for (const key of Object.keys(doc.data).sort()) {
      if (preferredSet.has(key)) continue;
      pushField(key);
      if (selected.length >= maxFields) break;
    }
  }

  return selected;
}

/** @deprecated Prefer listFirestoreDocumentHighlightFields for list UI. */
export function listFirestoreDocumentFields(
  doc: UserFirestoreDocumentRow,
): FirestoreDocumentListField[] {
  return listFirestoreDocumentHighlightFields(doc);
}

export function firestoreDocumentListTitle(doc: UserFirestoreDocumentRow): string {
  const data = doc.data;
  for (const key of [
    "title",
    "name",
    "subject",
    "category",
    "type",
    "dateKey",
    "tool",
  ] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim().replace(/_/g, " ");
    }
  }
  return doc.isRoot ? "DOC: ROOT" : `DOC: ${doc.label}`;
}

export function firestoreDocumentSummary(
  doc: UserFirestoreDocumentRow,
  maxFields = 3,
): string {
  const fields = listFirestoreDocumentHighlightFields(doc, maxFields);
  if (fields.length === 0) return doc.path;
  return fields.map((field) => `${field.key}: ${field.display}`).join(" · ");
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
  if (collectionId === "customers") {
    return [
      { value: "all", label: "All statuses" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Deactivated" },
    ];
  }
  if (collectionId === "alert_delivery_log") {
    return [
      { value: "all", label: "All deliveries" },
      { value: "status:sent", label: "Sent" },
      { value: "status:partial", label: "Partial" },
      { value: "status:failed", label: "Failed" },
      { value: "status:skipped", label: "Skipped" },
      { value: "channel:push", label: "Push" },
      { value: "channel:email", label: "Email" },
      { value: "channel:sms", label: "SMS" },
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

  if (collectionId === "customers") {
    const status = String(doc.data.status || "").trim().toLowerCase();
    if (filter === "inactive") {
      return status === "inactive" || status === "archived";
    }
    if (filter === "active") {
      return status !== "inactive" && status !== "archived";
    }
  }

  if (collectionId === "alert_delivery_log") {
    return matchesAlertDeliveryFilter(doc, filter);
  }

  return true;
}
