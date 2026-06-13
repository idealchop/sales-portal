import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";
import { sortSubscriptionDocuments } from "@/lib/admin/subscription-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

const INSIGHT_CHART_DAYS = 14;

const PLAN_LIMITATION_PATCHES: Record<string, Record<string, unknown>> = {
  starter: {
    customers: { max: 20 },
    transactions: { frequency: "daily", max: 20 },
    aiTools: { max: 5, frequency: "monthly" },
    online_orders: { frequency: "daily", max: 5 },
    staff: { admin: 0, rider: 0 },
    support: { chat: { max: 5, frequency: "monthly" } },
  },
  grow: {
    customers: { max: 200 },
    transactions: { frequency: "daily", max: 100 },
    aiTools: { max: 20, frequency: "monthly" },
    online_orders: { frequency: "daily", max: 25 },
    staff: { admin: 0, rider: 1 },
    support: { chat: { max: 10, frequency: "monthly" } },
  },
  pro: {
    customers: { max: 200 },
    transactions: { frequency: "daily", max: 100 },
    aiTools: { max: 20, frequency: "monthly" },
    online_orders: { frequency: "daily", max: 25 },
    staff: { admin: 0, rider: 1 },
    support: { chat: { max: 10, frequency: "monthly" } },
  },
  scale: {
    customers: "full",
    transactions: "full",
    aiTools: "full",
    online_orders: "full",
    staff: { admin: 1, rider: 2 },
    support: { chat: "full" },
  },
  enterprise: {
    customers: "full",
    transactions: "full",
    aiTools: "full",
    online_orders: "full",
    support: { chat: "full" },
  },
};

export type BusinessInsightStat = {
  id: string;
  label: string;
  value: string;
};

export type BusinessInsightDailyRow = {
  date: string;
  label: string;
  count: number;
};

export type BusinessInsightEngagementRow = {
  date: string;
  label: string;
  aiRuns: number;
  chatSessions: number;
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
  engagementDaily: BusinessInsightEngagementRow[];
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
  const patch = PLAN_LIMITATION_PATCHES[code] ?? PLAN_LIMITATION_PATCHES.starter;
  const staff =
    patch.staff && typeof patch.staff === "object" ?
      (patch.staff as { admin?: number; rider?: number })
    : {};
  const staffCap =
    (Number(staff.admin) || 0) + (Number(staff.rider) || 0) + 1;

  return {
    customersMax: finiteCap(patch.customers),
    transactionsDailyMax: finiteCap(patch.transactions),
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

function buildTransactionDailySeries(
  transactions: UserFirestoreDocumentRow[],
): BusinessInsightDailyRow[] {
  const window = buildDailyWindow(INSIGHT_CHART_DAYS);
  const counts = new Map(window.map((date) => [dayKey(date), 0]));

  for (const tx of transactions) {
    const ms = timestampMs(tx.data.createdAt ?? tx.data.updatedAt);
    if (!ms) continue;
    const key = dayKey(new Date(ms));
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return window.map((date) => {
    const key = dayKey(date);
    return {
      date: key,
      label: shortDayLabel(date),
      count: counts.get(key) ?? 0,
    };
  });
}

function buildEngagementDailySeries(
  documents: BusinessFirestoreDocumentRow[],
): BusinessInsightEngagementRow[] {
  const window = buildDailyWindow(INSIGHT_CHART_DAYS);
  const aiCounts = new Map(window.map((date) => [dayKey(date), 0]));
  const chatCounts = new Map(window.map((date) => [dayKey(date), 0]));

  for (const doc of documents) {
    const ms = timestampMs(doc.data.createdAt ?? doc.data.updatedAt);
    if (!ms) continue;
    const key = dayKey(new Date(ms));
    if (doc.collectionId === "ai_tool_runs" && aiCounts.has(key)) {
      aiCounts.set(key, (aiCounts.get(key) ?? 0) + 1);
    }
    if (doc.collectionId === "chat_sessions" && chatCounts.has(key)) {
      chatCounts.set(key, (chatCounts.get(key) ?? 0) + 1);
    }
  }

  return window.map((date) => {
    const key = dayKey(date);
    return {
      date: key,
      label: shortDayLabel(date),
      aiRuns: aiCounts.get(key) ?? 0,
      chatSessions: chatCounts.get(key) ?? 0,
    };
  });
}

export function computeBusinessInsights(input: {
  documents: BusinessFirestoreDocumentRow[];
  transactions: UserFirestoreDocumentRow[];
}): BusinessInsightsSnapshot {
  const { documents, transactions } = input;
  const now = new Date();
  const todayStart = startOfLocalDay(now).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const monthStart = startOfLocalMonth(now).getTime();
  const thirtyDaysAgo = todayStart - 29 * 24 * 60 * 60 * 1000;

  const customers = documents.filter((doc) => doc.collectionId === "customers");
  const members = documents.filter((doc) => doc.collectionId === "members");
  const aiRuns = documents.filter((doc) => doc.collectionId === "ai_tool_runs");
  const chatSessions = documents.filter(
    (doc) => doc.collectionId === "chat_sessions",
  );

  const activeCustomers = customers.filter((doc) => isActiveCustomer(doc.data));
  const transactionsLast30Days = transactions.filter((doc) => {
    const ms = timestampMs(doc.data.createdAt);
    return ms >= thirtyDaysAgo;
  }).length;
  const aiRunsLast30Days = aiRuns.filter((doc) => {
    const ms = timestampMs(doc.data.createdAt);
    return ms >= thirtyDaysAgo;
  }).length;

  const activeSubscription = resolveActiveSubscription(documents);
  const planCode = readString(activeSubscription?.data.planCode) || "starter";
  const planName =
    readString(activeSubscription?.data.planName) ||
    planCode.charAt(0).toUpperCase() + planCode.slice(1);
  const quotas = parsePlanQuotas(planCode);

  const aiUsedThisMonth = countInWindow(
    documents,
    "ai_tool_runs",
    "createdAt",
    monthStart,
    now.getTime(),
  );
  const chatUsedThisMonth = countInWindow(
    documents,
    "chat_sessions",
    "createdAt",
    monthStart,
    now.getTime(),
  );
  const transactionsToday = transactions.filter((doc) => {
    const ms = timestampMs(doc.data.createdAt);
    return ms >= todayStart && ms <= todayEnd;
  }).length;

  const stats: BusinessInsightStat[] = [
    {
      id: "customers",
      label: "Active sukis",
      value: String(activeCustomers.length),
    },
    {
      id: "team",
      label: "Team members",
      value: String(members.length),
    },
    {
      id: "transactions",
      label: "Transactions (30d)",
      value: String(transactionsLast30Days),
    },
    {
      id: "ai-runs",
      label: "AI runs (30d)",
      value: String(aiRunsLast30Days),
    },
    {
      id: "chat",
      label: "Chat sessions",
      value: String(chatSessions.length),
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
      label: "Active sukis",
      used: activeCustomers.length,
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
      label: "Transaction records",
      used: transactionsToday,
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
      used: members.length,
      cap: quotas.staffMax,
      suffix: "seats",
    });
  }

  return {
    stats,
    transactionDaily: buildTransactionDailySeries(transactions),
    engagementDaily: buildEngagementDailySeries(documents),
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
