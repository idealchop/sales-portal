import {
  extractDocumentFields,
  humanizeFieldKey,
  type ProfileField,
} from "@/lib/admin/user-profile-display";
import { BUSINESS_STRUCTURED_ROOT_FIELD_KEYS } from "@/lib/admin/business-workspace-config-display";

export type BusinessFirestoreDocumentRow = {
  path: string;
  collectionId: string;
  documentId: string;
  label: string;
  isRoot: boolean;
  data: Record<string, unknown>;
};

const BUSINESS_ROOT_FIELD_ORDER = [
  "name",
  "displayName",
  "ownerId",
  "phone",
  "email",
  "address",
  "city",
  "province",
  "onboardingComplete",
  "createdAt",
  "updatedAt",
] as const;

const BUSINESS_PRIMARY_FIELD_KEYS = new Set([
  "name",
  "displayName",
  "ownerId",
  "phone",
  "email",
  "address",
  "city",
  "province",
]);

const BUSINESS_LOGO_FIELD_KEYS = ["logo", "logoURL", "photoURL"] as const;

/**
 * Root fields that belong elsewhere (logo header, structured sections) or are
 * internal SmartRefill job/idempotency state — not useful in Workspace → Other info.
 */
const BUSINESS_HIDDEN_ROOT_FIELD_KEYS = new Set<string>([
  ...BUSINESS_LOGO_FIELD_KEYS,
  // Legacy catalog / denormalized job flags
  "containerOperatingMode",
  "ownerMorningAlertsEnabled",
  "workspaceOnboardedAt",
  "analyticsDirtyAt",
  "channelUsage",
  // Nested map (when present) + dotted top-level writes from set(merge)
  "customerEmailSentFlags",
]);

const BUSINESS_HIDDEN_ROOT_FIELD_PREFIXES = [
  "customerEmailSentFlags.",
] as const;

/** Notification / email / push idempotency timestamps written by scheduled jobs. */
const BUSINESS_IDEMPOTENCY_FIELD_PATTERN =
  /(?:LastSent|LastAutoRun|EmailSentFlags|PushLast|DigestLast)/i;

export function isBusinessOtherInfoNoiseField(key: string): boolean {
  if (BUSINESS_HIDDEN_ROOT_FIELD_KEYS.has(key)) return true;
  if (
    BUSINESS_HIDDEN_ROOT_FIELD_PREFIXES.some((prefix) => key.startsWith(prefix))
  ) {
    return true;
  }
  if (BUSINESS_IDEMPOTENCY_FIELD_PATTERN.test(key)) return true;
  return false;
}

export function businessLogoFromData(
  data: Record<string, unknown> | undefined,
): string | undefined {
  if (!data) return undefined;
  for (const key of BUSINESS_LOGO_FIELD_KEYS) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

const BUSINESS_SUBCOLLECTION_LABELS: Record<string, string> = {
  members: "Team members",
  subscriptions: "Subscriptions",
  locations: "Locations",
  settings: "Settings",
  inventory: "Inventory",
  inventory_items: "Inventory",
  inventory_assignments: "Inventory assignments",
  products: "Products",
  chat_sessions: "Chat",
  support_ai_knowledge: "Support AI knowledge",
  team_chats: "Team chat",
  orders: "Orders",
  customers: "Customers",
  ai_tool_runs: "AI run tools",
  audit_logs: "Audit logs",
  notifications: "Notifications",
  alert_delivery_log: "Alert delivery log",
  payment_info: "Payment info",
  files: "Files",
  portal_order_ratings: "Portal order ratings",
  proactive_schedule_week_snapshots: "Proactive schedule week snapshots",
  riders: "Riders",
  team_presence: "Team presence",
  team_invites: "Team invites",
  rider_cash_remittances: "Rider cash remittances",
  raw_submissions: "Raw submissions",
  transactions: "Transactions",
  private: "Support AI usage",
};

/** Shown in dialogs from workspace actions, not inline on the page. */
export const BUSINESS_DIALOG_ONLY_SUBCOLLECTIONS = new Set([
  "members",
  "subscriptions",
  "customers",
  "ai_tool_runs",
  "chat_sessions",
  "support_ai_knowledge",
  "private",
  "team_chats",
  "inventory_items",
  "inventory_assignments",
  "products",
  "audit_logs",
  "notifications",
  "payment_info",
  "files",
  "portal_order_ratings",
  "proactive_schedule_week_snapshots",
  "transactions",
  "riders",
  "team_presence",
  "team_invites",
  "rider_cash_remittances",
  "raw_submissions",
]);

export function businessNameFromData(
  data: Record<string, unknown> | undefined,
): string | undefined {
  if (!data) return undefined;
  for (const key of ["name", "displayName", "businessName"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function businessSubcollectionTitle(collectionId: string): string {
  return (
    BUSINESS_SUBCOLLECTION_LABELS[collectionId] ??
    humanizeFieldKey(collectionId)
  );
}

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function formatPaymentInfoSummary(
  documents: BusinessFirestoreDocumentRow[],
): string {
  if (documents.length === 0) return "No payment methods";

  const primary =
    documents.find((doc) => doc.data.isPrimary === true) ?? documents[0];
  const bankName = readString(primary.data.bankName);
  const accountName = readString(primary.data.accountName);

  if (bankName && accountName) return `${bankName} · ${accountName}`;
  if (bankName) return bankName;
  if (accountName) return accountName;

  return `${documents.length} method${documents.length === 1 ? "" : "s"}`;
}

export function formatBusinessFilesSummary(
  documents: BusinessFirestoreDocumentRow[],
): string {
  if (documents.length === 0) return "No files uploaded";

  const categories = new Set(
    documents
      .map((doc) => readString(doc.data.category))
      .filter(Boolean),
  );

  const countLabel = `${documents.length} file${documents.length === 1 ? "" : "s"}`;
  if (categories.size === 1) {
    return `${countLabel} · ${humanizeFieldKey([...categories][0])}`;
  }
  if (categories.size > 1) {
    return `${countLabel} · ${categories.size} categories`;
  }

  return countLabel;
}

export function formatPortalOrderRatingsSummary(
  documents: BusinessFirestoreDocumentRow[],
): string {
  if (documents.length === 0) return "No ratings yet";

  const serviceRatings = documents
    .map((doc) => Number(doc.data.serviceRating))
    .filter((value) => Number.isFinite(value) && value > 0);
  const countLabel = `${documents.length} rating${documents.length === 1 ? "" : "s"}`;

  if (serviceRatings.length === 0) return countLabel;

  const average =
    serviceRatings.reduce((sum, value) => sum + value, 0) / serviceRatings.length;
  return `${countLabel} · ${average.toFixed(1)}★ service avg`;
}

export function formatProactiveScheduleWeekSnapshotsSummary(
  documents: BusinessFirestoreDocumentRow[],
): string {
  if (documents.length === 0) return "No week snapshots";

  const latest =
    [...documents].sort((a, b) =>
      readString(b.data.windowLabel).localeCompare(
        readString(a.data.windowLabel),
      ),
    )[0] ?? documents[0];
  const windowLabel = readString(latest.data.windowLabel);
  const suggestionCount = Array.isArray(latest.data.suggestions) ?
    latest.data.suggestions.length
  : 0;

  if (windowLabel && suggestionCount > 0) {
    return `${documents.length} snapshot${documents.length === 1 ? "" : "s"} · ${windowLabel} (${suggestionCount} suggestions)`;
  }
  if (windowLabel) {
    return `${documents.length} snapshot${documents.length === 1 ? "" : "s"} · ${windowLabel}`;
  }

  return `${documents.length} snapshot${documents.length === 1 ? "" : "s"}`;
}

export function extractBusinessRootFields(
  data: Record<string, unknown>,
): ProfileField[] {
  const fields: ProfileField[] = [];
  const seen = new Set<string>();

  for (const key of BUSINESS_ROOT_FIELD_ORDER) {
    if (!(key in data)) continue;
    seen.add(key);
    const value = data[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;
    fields.push(buildBusinessRootField(key, value));
  }

  for (const key of Object.keys(data).sort()) {
    if (seen.has(key)) continue;
    const value = data[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;
    fields.push(buildBusinessRootField(key, value));
  }

  return fields;
}

function buildBusinessRootField(key: string, value: unknown): ProfileField {
  const isLogo =
    (key === "logo" || key === "logoURL" || key === "photoURL") &&
    typeof value === "string";

  return {
    key,
    label: BUSINESS_OTHER_INFO_LABELS[key] ?? humanizeFieldKey(key),
    value,
    kind:
      isLogo ? "photo"
      : typeof value === "boolean" ? "boolean"
      : key === "createdAt" || key === "updatedAt" ? "timestamp"
      : key.toLowerCase().includes("at") ? "timestamp"
      : "text",
  };
}

const BUSINESS_OTHER_INFO_LABELS: Record<string, string> = {
  onboardingComplete: "Onboarding complete",
  createdAt: "Created",
  updatedAt: "Updated",
  banner: "Portal banner",
  allowManualTransactionReference: "Allow manual transaction reference",
  qrWalkInEnabled: "QR walk-in enabled",
  customerImportAiFreeUsed: "Customer import AI free used",
  containerDefaultPolicy: "Container default policy",
  defaultContainerDepositAmount: "Default container deposit (₱)",
  deliveryInventorySalesEnabled: "Delivery inventory sales enabled",
  riderCommissionEnabled: "Rider commission enabled",
  riderRateEnabled: "Rider rate enabled",
  multiRiderAssignEnabled: "Multi-rider assign enabled",
  multiRiderCommissionMode: "Multi-rider commission mode",
};

export type BusinessOtherInfoGroupId =
  | "record"
  | "portal"
  | "containers"
  | "riders"
  | "more";

export type BusinessOtherInfoGroup = {
  id: BusinessOtherInfoGroupId;
  title: string;
  fields: ProfileField[];
};

const OTHER_INFO_GROUP_META: Array<{
  id: BusinessOtherInfoGroupId;
  title: string;
  keys: readonly string[];
}> = [
  {
    id: "record",
    title: "Record",
    keys: ["onboardingComplete", "createdAt", "updatedAt"],
  },
  {
    id: "portal",
    title: "Portal & ordering",
    keys: [
      "banner",
      "allowManualTransactionReference",
      "qrWalkInEnabled",
      "customerImportAiFreeUsed",
    ],
  },
  {
    id: "containers",
    title: "Containers & delivery",
    keys: [
      "containerDefaultPolicy",
      "defaultContainerDepositAmount",
      "deliveryInventorySalesEnabled",
    ],
  },
  {
    id: "riders",
    title: "Riders",
    keys: [
      "riderCommissionEnabled",
      "riderRateEnabled",
      "multiRiderAssignEnabled",
      "multiRiderCommissionMode",
    ],
  },
];

const OTHER_INFO_KEY_TO_GROUP = new Map<string, BusinessOtherInfoGroupId>();
for (const group of OTHER_INFO_GROUP_META) {
  for (const key of group.keys) {
    OTHER_INFO_KEY_TO_GROUP.set(key, group.id);
  }
}

function otherInfoGroupIdForKey(key: string): BusinessOtherInfoGroupId {
  const mapped = OTHER_INFO_KEY_TO_GROUP.get(key);
  if (mapped) return mapped;
  if (/rider/i.test(key)) return "riders";
  if (/container|deliveryInventory/i.test(key)) return "containers";
  if (/^(banner|qr|portal|importAi)/i.test(key) || /WalkIn|ManualTransaction/i.test(key)) {
    return "portal";
  }
  return "more";
}

export function groupBusinessOtherInfoFields(
  fields: ProfileField[],
): BusinessOtherInfoGroup[] {
  const buckets = new Map<BusinessOtherInfoGroupId, ProfileField[]>();
  for (const field of fields) {
    const groupId = otherInfoGroupIdForKey(field.key);
    const bucket = buckets.get(groupId) ?? [];
    bucket.push(field);
    buckets.set(groupId, bucket);
  }

  const ordered: BusinessOtherInfoGroup[] = [];
  for (const meta of OTHER_INFO_GROUP_META) {
    const groupFields = buckets.get(meta.id);
    if (!groupFields || groupFields.length === 0) continue;
    const keyOrder = new Map(meta.keys.map((key, index) => [key, index]));
    ordered.push({
      id: meta.id,
      title: meta.title,
      fields: [...groupFields].sort((a, b) => {
        const ai = keyOrder.get(a.key) ?? Number.MAX_SAFE_INTEGER;
        const bi = keyOrder.get(b.key) ?? Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return a.label.localeCompare(b.label);
      }),
    });
  }

  const more = buckets.get("more");
  if (more && more.length > 0) {
    ordered.push({
      id: "more",
      title: "More",
      fields: [...more].sort((a, b) => a.label.localeCompare(b.label)),
    });
  }

  return ordered;
}

export function splitBusinessRootFields(data: Record<string, unknown>): {
  primaryFields: ProfileField[];
  otherFields: ProfileField[];
  otherInfoGroups: BusinessOtherInfoGroup[];
} {
  const allFields = extractBusinessRootFields(data).filter(
    (field) =>
      !isBusinessOtherInfoNoiseField(field.key) &&
      !BUSINESS_STRUCTURED_ROOT_FIELD_KEYS.has(field.key),
  );
  const primaryFields = allFields.filter((field) =>
    BUSINESS_PRIMARY_FIELD_KEYS.has(field.key),
  );
  const otherFields = allFields.filter(
    (field) => !BUSINESS_PRIMARY_FIELD_KEYS.has(field.key),
  );
  return {
    primaryFields,
    otherFields,
    otherInfoGroups: groupBusinessOtherInfoFields(otherFields),
  };
}

type BusinessSubcollectionGroup = {
  collectionId: string;
  title: string;
  documents: BusinessFirestoreDocumentRow[];
  /** Actual Firestore count (may exceed documents.length when lazy-loaded). */
  totalCount: number;
};

function emptyGroup(collectionId: string, totalCount: number): BusinessSubcollectionGroup {
  return {
    collectionId,
    title: businessSubcollectionTitle(collectionId),
    documents: [],
    totalCount,
  };
}

export function splitBusinessDocuments(
  documents: BusinessFirestoreDocumentRow[],
  collectionCounts: Record<string, number> = {},
): {
  root: BusinessFirestoreDocumentRow | null;
  subdocuments: BusinessFirestoreDocumentRow[];
  subcollectionGroups: BusinessSubcollectionGroup[];
  membersGroup: BusinessSubcollectionGroup | null;
  subscriptionsGroup: BusinessSubcollectionGroup | null;
  customersGroup: BusinessSubcollectionGroup | null;
  aiToolRunsGroup: BusinessSubcollectionGroup | null;
  chatSessionsGroup: BusinessSubcollectionGroup | null;
  supportAiKnowledgeGroup: BusinessSubcollectionGroup | null;
  privateGroup: BusinessSubcollectionGroup | null;
  inventoryItemsGroup: BusinessSubcollectionGroup | null;
  productsGroup: BusinessSubcollectionGroup | null;
  auditLogsGroup: BusinessSubcollectionGroup | null;
  notificationsGroup: BusinessSubcollectionGroup | null;
  paymentInfoGroup: BusinessSubcollectionGroup | null;
  filesGroup: BusinessSubcollectionGroup | null;
  portalOrderRatingsGroup: BusinessSubcollectionGroup | null;
  proactiveScheduleWeekSnapshotsGroup: BusinessSubcollectionGroup | null;
  rawSubmissionsGroup: BusinessSubcollectionGroup | null;
} {
  const root = documents.find((doc) => doc.isRoot) ?? null;
  const subdocuments = documents.filter((doc) => !doc.isRoot);
  const grouped = new Map<string, BusinessFirestoreDocumentRow[]>();

  for (const doc of subdocuments) {
    const bucket = grouped.get(doc.collectionId) ?? [];
    bucket.push(doc);
    grouped.set(doc.collectionId, bucket);
  }

  for (const [collectionId, count] of Object.entries(collectionCounts)) {
    if (count > 0 && !grouped.has(collectionId)) {
      grouped.set(collectionId, []);
    }
  }

  const allGroups = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([collectionId, docs]) => ({
      collectionId,
      title: businessSubcollectionTitle(collectionId),
      documents: [...docs].sort((a, b) =>
        a.documentId.localeCompare(b.documentId),
      ),
      totalCount: collectionCounts[collectionId] ?? docs.length,
    }));

  const subcollectionGroups = allGroups.filter(
    (group) => !BUSINESS_DIALOG_ONLY_SUBCOLLECTIONS.has(group.collectionId),
  );

  const findGroup = (collectionId: string) => {
    const found = allGroups.find((group) => group.collectionId === collectionId);
    if (found) return found;
    const count = collectionCounts[collectionId] ?? 0;
    return count > 0 ? emptyGroup(collectionId, count) : null;
  };

  return {
    root,
    subdocuments,
    subcollectionGroups,
    membersGroup: findGroup("members"),
    subscriptionsGroup: findGroup("subscriptions"),
    customersGroup: findGroup("customers"),
    aiToolRunsGroup: findGroup("ai_tool_runs"),
    chatSessionsGroup: findGroup("chat_sessions"),
    supportAiKnowledgeGroup: findGroup("support_ai_knowledge"),
    privateGroup: findGroup("private"),
    inventoryItemsGroup: findGroup("inventory_items"),
    productsGroup: findGroup("products"),
    auditLogsGroup: findGroup("audit_logs"),
    notificationsGroup: findGroup("notifications"),
    paymentInfoGroup: findGroup("payment_info"),
    filesGroup: findGroup("files"),
    portalOrderRatingsGroup: findGroup("portal_order_ratings"),
    proactiveScheduleWeekSnapshotsGroup: findGroup(
      "proactive_schedule_week_snapshots",
    ),
    rawSubmissionsGroup: findGroup("raw_submissions"),
  };
}

export { extractDocumentFields };
