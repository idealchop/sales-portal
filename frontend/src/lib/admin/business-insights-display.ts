import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";
import { sortSubscriptionDocuments } from "@/lib/admin/subscription-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { SUBSCRIPTION_PLAN_LIMITATION_PATCHES } from "@/lib/admin/subscription-plans-catalog";

const INSIGHT_CHART_DAYS = 14;

const PLAN_LIMITATION_PATCHES = SUBSCRIPTION_PLAN_LIMITATION_PATCHES;

export type BusinessInsightStat = {
  id: string;
  label: string;
  value: string;
};

export type BusinessInsightDailyRow = {
  date: string;
  label: string;
  transactions: number;
  waterContainers: number;
  other: number;
};

export type BusinessInsightMixRow = {
  date: string;
  label: string;
  deliveryManual: number;
  deliveryQr: number;
  walkin: number;
  direct: number;
  collection: number;
};

export type BusinessInsightConsumptionRow = {
  id: string;
  label: string;
  used: number;
  cap: number | null;
  suffix?: string;
};

export type BusinessInsightsSnapshot = {
  stats: BusinessInsightStat[];
  transactionDaily: BusinessInsightDailyRow[];
  mixDaily: BusinessInsightMixRow[];
  consumption: BusinessInsightConsumptionRow[];
  planLabel: string;
};

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

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isUnlimited(value: unknown): boolean {
  return value === "full" || value === "unlimited";
}

function finiteCap(value: unknown): number | null {
  if (isUnlimited(value)) return null;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (value && typeof value === "object" && "max" in value) {
    const max = Number((value as { max?: unknown }).max);
    return Number.isFinite(max) && max >= 0 ? max : null;
  }
  return null;
}

function parsePlanQuotas(planCode: string) {
  const code = planCode.toLowerCase() === "pro" ? "grow" : planCode.toLowerCase();
  const patch = PLAN_LIMITATION_PATCHES[code] ?? PLAN_LIMITATION_PATCHES.free;
  const staff =
    patch.staff && typeof patch.staff === "object" ?
      (patch.staff as { admin?: number; rider?: number })
    : {};
  const staffCap =
    (Number(staff.admin) || 0) + (Number(staff.rider) || 0) + 1;

  return {
    customersMax: finiteCap(patch.customers),
    transactionsDailyMax:
      finiteCap(patch.containers) ?? finiteCap(patch.transactions),
    aiToolsMonthlyMax: finiteCap(patch.aiTools),
    onlineOrdersMax: finiteCap(patch.online_orders),
    supportChatMax: finiteCap(
      patch.support && typeof patch.support === "object" ?
        (patch.support as { chat?: unknown }).chat
      : null,
    ),
    staffMax: staffCap > 0 ? staffCap : null,
  };
}

function isActiveCustomer(data: Record<string, unknown>): boolean {
  const status = readString(data.status).toLowerCase();
  return status !== "inactive" && status !== "archived";
}

function isActiveSubscription(data: Record<string, unknown>): boolean {
  const status = readString(data.status).toLowerCase();
  return (
    status === "active" ||
    status === "grace_period" ||
    status === "approved" ||
    status === "pending"
  );
}

function resolveActiveSubscription(
  documents: BusinessFirestoreDocumentRow[],
): UserFirestoreDocumentRow | null {
  const subs = documents.filter((doc) => doc.collectionId === "subscriptions");
  const active = sortSubscriptionDocuments(subs).find((doc) =>
    isActiveSubscription(doc.data),
  );
  return active ?? sortSubscriptionDocuments(subs)[0] ?? null;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shortDayLabel(date: Date): string {
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function buildDailyWindow(days: number): Date[] {
  const today = startOfLocalDay(new Date());
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return date;
  });
}

function countInWindow(
  documents: BusinessFirestoreDocumentRow[],
  collectionId: string,
  field: string,
  startMs: number,
  endMs: number,
): number {
  return documents.filter((doc) => {
    if (doc.collectionId !== collectionId) return false;
    const ms = timestampMs(doc.data[field]);
    return ms >= startMs && ms <= endMs;
  }).length;
}

const SALE_TRANSACTION_TYPES = new Set(["delivery", "walkin", "direct_sale"]);
const SKIP_DELIVERY_STATUSES = new Set(["failed", "cancelled"]);
const SKIP_REFILL_WATER_TYPE_IDS = new Set([
  "adjustment",
  "operating_expense",
]);
const DEFAULT_WATER_CONTAINER_ICON_IDS = ["round-gallon", "slim-gallon"];

function compactIconKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function canonicalGallonIconId(iconId: string): string | undefined {
  if (iconId === "round-gallon" || iconId === "slim-gallon") return iconId;
  const compact = compactIconKey(iconId);
  if (compact === "roundgallon" || compact === "roundicon") return "round-gallon";
  if (compact === "slimgallon" || compact === "slimicon") return "slim-gallon";
  return undefined;
}

export function buildWaterContainerIconIds(
  productIcons: ReadonlyArray<{ documentId: string; data: Record<string, unknown> }>,
): Set<string> {
  const ids = new Set<string>();
  for (const icon of productIcons) {
    if (icon.data.waterContainer !== true) continue;
    const id = String(icon.documentId || "").trim();
    if (!id) continue;
    ids.add(id);
    const canonical = canonicalGallonIconId(id);
    if (canonical) ids.add(canonical);
  }
  for (const id of DEFAULT_WATER_CONTAINER_ICON_IDS) {
    ids.add(id);
  }
  return ids;
}

function productCatalogFromDocuments(
  documents: BusinessFirestoreDocumentRow[],
): Map<string, { itemOnly?: boolean; iconId?: string }> {
  const productById = new Map<string, { itemOnly?: boolean; iconId?: string }>();
  for (const doc of documents) {
    if (doc.collectionId !== "products") continue;
    productById.set(doc.documentId, {
      itemOnly: doc.data.itemOnly === true,
      iconId: readString(doc.data.iconId) || undefined,
    });
  }
  return productById;
}

function refillLineQuantity(line: Record<string, unknown>): number {
  const qty = Number(line.quantity ?? line.qty);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  return qty;
}

function iconCountsAsWaterContainer(
  iconId: string,
  waterContainerIconIds: Set<string>,
): boolean {
  if (waterContainerIconIds.has(iconId)) return true;
  const canonical = canonicalGallonIconId(iconId);
  return Boolean(canonical && waterContainerIconIds.has(canonical));
}

function refillLooksLikeNonWaterContainer(line: {
  name?: string;
  waterTypeId?: string;
  productId?: string;
}): boolean {
  const text = [line.name, line.waterTypeId, line.productId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!text.trim()) return false;
  if (/\bbottle\b/.test(text)) return true;
  if (/\b\d+\s*ml\b/.test(text) || /\b\d+ml\b/.test(text)) return true;
  if (/\b(350-ml|500-ml|1liter-bottle|1-liter|1l-bottle)\b/.test(text)) {
    return true;
  }
  return false;
}

export function classifyTransactionRefillQuantities(
  tx: Record<string, unknown>,
  productById: Map<string, { itemOnly?: boolean; iconId?: string }>,
  waterContainerIconIds: Set<string>,
): { waterContainers: number; other: number } {
  const type = readString(tx.type).toLowerCase();
  const status = readString(tx.deliveryStatus).toLowerCase();
  if (!SALE_TRANSACTION_TYPES.has(type) || SKIP_DELIVERY_STATUSES.has(status)) {
    return { waterContainers: 0, other: 0 };
  }

  let waterContainers = 0;
  let other = 0;
  const refills = Array.isArray(tx.waterRefills) ? tx.waterRefills : [];
  for (const entry of refills) {
    if (!entry || typeof entry !== "object") continue;
    const line = entry as Record<string, unknown>;
    const waterTypeId = readString(line.waterTypeId).toLowerCase();
    if (SKIP_REFILL_WATER_TYPE_IDS.has(waterTypeId)) continue;
    const qty = refillLineQuantity(line);
    if (qty <= 0) continue;
    const productId = readString(line.productId);
    const product = productId ? productById.get(productId) : undefined;
    if (product?.itemOnly) continue;
    const iconId = String(product?.iconId || line.iconId || "").trim();
    const isWaterContainer =
      iconId ?
        iconCountsAsWaterContainer(iconId, waterContainerIconIds)
      : !refillLooksLikeNonWaterContainer({
          name: readString(line.name),
          waterTypeId,
          productId,
        });
    if (isWaterContainer) {
      waterContainers += qty;
    } else {
      other += qty;
    }
  }
  return { waterContainers, other };
}

function buildTransactionDailySeries(
  transactions: UserFirestoreDocumentRow[],
  productById: Map<string, { itemOnly?: boolean; iconId?: string }>,
  waterContainerIconIds: Set<string>,
): BusinessInsightDailyRow[] {
  const window = buildDailyWindow(INSIGHT_CHART_DAYS);
  const byDay = new Map(
    window.map((date) => [
      dayKey(date),
      { transactions: 0, waterContainers: 0, other: 0 },
    ]),
  );

  for (const tx of transactions) {
    const ms = timestampMs(
      tx.data.scheduledAt ?? tx.data.createdAt ?? tx.data.updatedAt,
    );
    if (!ms) continue;
    const key = dayKey(new Date(ms));
    const row = byDay.get(key);
    if (!row) continue;
    row.transactions += 1;
    const qty = classifyTransactionRefillQuantities(
      tx.data,
      productById,
      waterContainerIconIds,
    );
    row.waterContainers += qty.waterContainers;
    row.other += qty.other;
  }

  return window.map((date) => {
    const key = dayKey(date);
    const row = byDay.get(key) ?? {
      transactions: 0,
      waterContainers: 0,
      other: 0,
    };
    return {
      date: key,
      label: shortDayLabel(date),
      transactions: row.transactions,
      waterContainers: row.waterContainers,
      other: row.other,
    };
  });
}

const EMPTY_MIX = {
  deliveryManual: 0,
  deliveryQr: 0,
  walkin: 0,
  direct: 0,
  collection: 0,
};

export function classifyInsightTransactionKind(
  data: Record<string, unknown>,
): keyof typeof EMPTY_MIX | null {
  const type = readString(data.type).toLowerCase();
  if (type === "walkin") return "walkin";
  if (type === "direct_sale") return "direct";
  if (type === "collection") return "collection";
  if (type !== "delivery") return null;
  return isQrDeliveryOrder(data) ? "deliveryQr" : "deliveryManual";
}

function isQrDeliveryOrder(data: Record<string, unknown>): boolean {
  const notes = readString(data.notes).toLowerCase();
  if (
    notes.includes("portal order") ||
    notes.includes("qr order") ||
    notes.includes("customer portal")
  ) {
    return true;
  }
  const source = readString(
    data.source ?? data.sourceChannel ?? data.origin ?? data.createdVia,
  ).toLowerCase();
  return source.includes("portal") || source.includes("qr");
}

function buildTransactionMixDailySeries(
  transactions: UserFirestoreDocumentRow[],
): BusinessInsightMixRow[] {
  const window = buildDailyWindow(INSIGHT_CHART_DAYS);
  const byDay = new Map(window.map((date) => [dayKey(date), { ...EMPTY_MIX }]));

  for (const tx of transactions) {
    const kind = classifyInsightTransactionKind(tx.data);
    if (!kind) continue;
    const ms = timestampMs(
      tx.data.scheduledAt ?? tx.data.createdAt ?? tx.data.updatedAt,
    );
    if (!ms) continue;
    const key = dayKey(new Date(ms));
    const row = byDay.get(key);
    if (!row) continue;
    row[kind] += 1;
  }

  return window.map((date) => {
    const key = dayKey(date);
    const row = byDay.get(key) ?? { ...EMPTY_MIX };
    return {
      date: key,
      label: shortDayLabel(date),
      ...row,
    };
  });
}

export function computeBusinessInsights(input: {
  documents: BusinessFirestoreDocumentRow[];
  transactions: UserFirestoreDocumentRow[];
  collectionCounts?: Record<string, number>;
  productIcons?: ReadonlyArray<{ documentId: string; data: Record<string, unknown> }>;
}): BusinessInsightsSnapshot {
  const { documents, transactions, collectionCounts = {}, productIcons = [] } =
    input;
  const productById = productCatalogFromDocuments(documents);
  const waterContainerIconIds = buildWaterContainerIconIds(productIcons);
  const now = new Date();
  const todayStart = startOfLocalDay(now).getTime();
  const monthStart = startOfLocalMonth(now).getTime();
  const thirtyDaysAgo = todayStart - 29 * 24 * 60 * 60 * 1000;

  const customers = documents.filter((doc) => doc.collectionId === "customers");
  const members = documents.filter((doc) => doc.collectionId === "members");
  const aiRuns = documents.filter((doc) => doc.collectionId === "ai_tool_runs");
  const chatSessions = documents.filter(
    (doc) => doc.collectionId === "chat_sessions",
  );

  const activeCustomers = customers.filter((doc) => isActiveCustomer(doc.data));
  const customerCount =
    customers.length > 0 ?
      activeCustomers.length
    : (collectionCounts.customers ?? 0);
  const memberCount =
    members.length > 0 ? members.length : (collectionCounts.members ?? 0);
  const aiRunCount =
    aiRuns.length > 0 ? aiRuns.length : (collectionCounts.ai_tool_runs ?? 0);
  const chatCount =
    chatSessions.length > 0 ?
      chatSessions.length
    : (collectionCounts.chat_sessions ?? 0);

  const transactionsLast30Days = transactions.filter((doc) => {
    const ms = timestampMs(doc.data.createdAt);
    return ms >= thirtyDaysAgo;
  }).length;
  const aiRunsLast30Days =
    aiRuns.length > 0 ?
      aiRuns.filter((doc) => {
        const ms = timestampMs(doc.data.createdAt);
        return ms >= thirtyDaysAgo;
      }).length
    : aiRunCount;

  const activeSubscription = resolveActiveSubscription(documents);
  const planCode = readString(activeSubscription?.data.planCode) || "free";
  const planName =
    readString(activeSubscription?.data.planName) ||
    planCode.charAt(0).toUpperCase() + planCode.slice(1);
  const quotas = parsePlanQuotas(planCode);

  const aiUsedThisMonth =
    aiRuns.length > 0 ?
      countInWindow(
        documents,
        "ai_tool_runs",
        "createdAt",
        monthStart,
        now.getTime(),
      )
    : aiRunCount;
  const chatUsedThisMonth =
    chatSessions.length > 0 ?
      countInWindow(
        documents,
        "chat_sessions",
        "createdAt",
        monthStart,
        now.getTime(),
      )
    : chatCount;
  const transactionDaily = buildTransactionDailySeries(
    transactions,
    productById,
    waterContainerIconIds,
  );
  const todayKey = dayKey(startOfLocalDay(now));
  const waterContainersToday =
    transactionDaily.find((row) => row.date === todayKey)?.waterContainers ?? 0;

  const stats: BusinessInsightStat[] = [
    {
      id: "customers",
      label: customers.length > 0 ? "Active sukis" : "Customers",
      value: String(customerCount),
    },
    {
      id: "team",
      label: "Team members",
      value: String(memberCount),
    },
    {
      id: "transactions",
      label: "Transactions (30d)",
      value: String(transactionsLast30Days),
    },
    {
      id: "ai-runs",
      label: aiRuns.length > 0 ? "AI runs (30d)" : "AI runs",
      value: String(aiRunsLast30Days),
    },
    {
      id: "chat",
      label: "Chat sessions",
      value: String(chatCount),
    },
    {
      id: "plan",
      label: "Current plan",
      value: planName,
    },
  ];

  const consumption: BusinessInsightConsumptionRow[] = [];

  if (quotas.customersMax !== null) {
    consumption.push({
      id: "customers",
      label: customers.length > 0 ? "Active sukis" : "Customers",
      used: customerCount,
      cap: quotas.customersMax,
      suffix: "on plan",
    });
  }

  if (quotas.aiToolsMonthlyMax !== null) {
    consumption.push({
      id: "ai-tools",
      label: "AI tools",
      used: aiUsedThisMonth,
      cap: quotas.aiToolsMonthlyMax,
      suffix: "this month",
    });
  }

  if (quotas.transactionsDailyMax !== null) {
    consumption.push({
      id: "transactions",
      label: "Water containers",
      used: waterContainersToday,
      cap: quotas.transactionsDailyMax,
      suffix: "today",
    });
  }

  if (quotas.supportChatMax !== null) {
    consumption.push({
      id: "support-chat",
      label: "River AI support chats",
      used: chatUsedThisMonth,
      cap: quotas.supportChatMax,
      suffix: "this month",
    });
  }

  if (quotas.staffMax !== null) {
    consumption.push({
      id: "team",
      label: "Team members",
      used: memberCount,
      cap: quotas.staffMax,
      suffix: "seats",
    });
  }

  return {
    stats,
    transactionDaily,
    mixDaily: buildTransactionMixDailySeries(transactions),
    consumption,
    planLabel: `${planName} (${planCode})`,
  };
}

export function consumptionMeterState(used: number, cap: number) {
  const safeCap = Math.max(cap, 1);
  const clampedUsed = Math.min(Math.max(used, 0), safeCap);
  const percent = Math.round((clampedUsed / safeCap) * 100);
  const isBlocked = used >= cap;
  const isNearLimit = used >= Math.ceil(cap * 0.8) && !isBlocked;
  return { percent, isBlocked, isNearLimit, clampedUsed };
}

export const ALL_BUSINESS_TRANSACTION_TYPES = [
  "delivery",
  "walkin",
  "direct_sale",
  "expense",
  "collection",
] as const;
