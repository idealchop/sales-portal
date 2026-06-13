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

const BUSINESS_HIDDEN_ROOT_FIELD_KEYS = new Set<string>(
  BUSINESS_LOGO_FIELD_KEYS,
);

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
  chat_sessions: "Chat",
  support_ai_knowledge: "Support AI knowledge",
  team_chats: "Team chat",
  orders: "Orders",
  customers: "Customers",
  ai_tool_runs: "AI run tools",
  audit_logs: "Audit logs",
  notifications: "Notifications",
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
    label: humanizeFieldKey(key),
    value,
    kind:
      isLogo ? "photo"
      : typeof value === "boolean" ? "boolean"
      : key === "createdAt" || key === "updatedAt" ? "timestamp"
      : key.toLowerCase().includes("at") ? "timestamp"
      : "text",
  };
}

export function splitBusinessRootFields(data: Record<string, unknown>): {
  primaryFields: ProfileField[];
  otherFields: ProfileField[];
} {
  const allFields = extractBusinessRootFields(data).filter(
    (field) =>
      !BUSINESS_HIDDEN_ROOT_FIELD_KEYS.has(field.key) &&
      !BUSINESS_STRUCTURED_ROOT_FIELD_KEYS.has(field.key),
  );
  const primaryFields = allFields.filter((field) =>
    BUSINESS_PRIMARY_FIELD_KEYS.has(field.key),
  );
  const otherFields = allFields.filter(
    (field) => !BUSINESS_PRIMARY_FIELD_KEYS.has(field.key),
  );
  return { primaryFields, otherFields };
}

type BusinessSubcollectionGroup = {
  collectionId: string;
  title: string;
  documents: BusinessFirestoreDocumentRow[];
};

export function splitBusinessDocuments(
  documents: BusinessFirestoreDocumentRow[],
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

  const allGroups = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([collectionId, docs]) => ({
      collectionId,
      title: businessSubcollectionTitle(collectionId),
      documents: [...docs].sort((a, b) =>
        a.documentId.localeCompare(b.documentId),
      ),
    }));

  const subcollectionGroups = allGroups.filter(
    (group) => !BUSINESS_DIALOG_ONLY_SUBCOLLECTIONS.has(group.collectionId),
  );

  const membersGroup =
    allGroups.find((group) => group.collectionId === "members") ?? null;
  const subscriptionsGroup =
    allGroups.find((group) => group.collectionId === "subscriptions") ?? null;
  const customersGroup =
    allGroups.find((group) => group.collectionId === "customers") ?? null;
  const aiToolRunsGroup =
    allGroups.find((group) => group.collectionId === "ai_tool_runs") ?? null;
  const chatSessionsGroup =
    allGroups.find((group) => group.collectionId === "chat_sessions") ?? null;
  const supportAiKnowledgeGroup =
    allGroups.find((group) => group.collectionId === "support_ai_knowledge") ??
    null;
  const privateGroup =
    allGroups.find((group) => group.collectionId === "private") ?? null;
  const inventoryItemsGroup =
    allGroups.find((group) => group.collectionId === "inventory_items") ?? null;
  const auditLogsGroup =
    allGroups.find((group) => group.collectionId === "audit_logs") ?? null;
  const notificationsGroup =
    allGroups.find((group) => group.collectionId === "notifications") ?? null;
  const paymentInfoGroup =
    allGroups.find((group) => group.collectionId === "payment_info") ?? null;
  const filesGroup =
    allGroups.find((group) => group.collectionId === "files") ?? null;
  const portalOrderRatingsGroup =
    allGroups.find((group) => group.collectionId === "portal_order_ratings") ??
    null;
  const proactiveScheduleWeekSnapshotsGroup =
    allGroups.find(
      (group) => group.collectionId === "proactive_schedule_week_snapshots",
    ) ?? null;
  const rawSubmissionsGroup =
    allGroups.find((group) => group.collectionId === "raw_submissions") ?? null;

  return {
    root,
    subdocuments,
    subcollectionGroups,
    membersGroup,
    subscriptionsGroup,
    customersGroup,
    aiToolRunsGroup,
    chatSessionsGroup,
    supportAiKnowledgeGroup,
    privateGroup,
    inventoryItemsGroup,
    auditLogsGroup,
    notificationsGroup,
    paymentInfoGroup,
    filesGroup,
    portalOrderRatingsGroup,
    proactiveScheduleWeekSnapshotsGroup,
    rawSubmissionsGroup,
  };
}

export { extractDocumentFields };
