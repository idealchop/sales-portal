import { formatProfileTimestamp } from "@/lib/admin/user-profile-display";

const GETTING_STARTED_ORDER = [
  "verifyEmail",
  "addPaymentAccount",
  "addInventory",
  "addCustomer",
  "addDelivery",
  "addCollection",
  "addWalkin",
  "addExpense",
  "useAi",
] as const;

const GETTING_STARTED_LABELS: Record<string, string> = {
  verifyEmail: "Verify email",
  addPaymentAccount: "Add payment account",
  addInventory: "Add inventory",
  addCustomer: "Add customer",
  addDelivery: "Add delivery",
  addCollection: "Add collection",
  addWalkin: "Add walk-in sale",
  addExpense: "Add expense",
  useAi: "Use River AI",
};

const QUICK_TOUR_ORDER = [
  "dashboard",
  "customers",
  "inventory",
  "transactions",
  "operations",
  "accounts",
  "profilepopover",
] as const;

const QUICK_TOUR_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  customers: "Customers",
  inventory: "Inventory",
  transactions: "Transactions",
  operations: "Operations",
  accounts: "Accounts",
  profilepopover: "Profile popover",
};

const UI_CONFIG_LABELS: Record<string, string> = {
  gettingStartedCelebrationShown: "Getting started celebration shown",
  gettingStartedReminderSnoozed: "Getting started reminder snoozed",
  workspaceOnboardedAt: "Workspace onboarded at",
  gettingStartedGuideLastAutoShownDate: "Guide last auto-shown date",
  gettingStartedGuideAutoDismissed: "Guide auto-dismissed",
  dormantThresholdDays: "Dormant threshold (days)",
  dormantPushEnabled: "Dormant push enabled",
  dormantPushHour: "Dormant push hour",
  dormantEmailDigestEnabled: "Dormant email digest enabled",
  autoMorningBriefEnabled: "Auto morning brief enabled",
};

const USAGE_GOAL_LABELS: Record<string, string> = {
  sales: "Sales tracking",
  inventory: "Inventory control",
  customers: "Customer management",
  delivery: "Delivery operations",
  expenses: "Expense logging",
  analytics: "Business insights",
};

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
};

export type KeyValueRow = {
  key: string;
  label: string;
  value: string;
};

export type ParsedUserFeedback = {
  hasFeedback: boolean;
  ratingLabel: string;
  recommendLabel: string;
  feedback: string;
  suggestion: string;
  submittedAtLabel: string;
};

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === "true";
}

function readRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    if (
      trimmed.includes("T") &&
      !Number.isNaN(new Date(trimmed).getTime())
    ) {
      return formatProfileTimestamp(trimmed) ?? trimmed;
    }
    return trimmed;
  }
  return String(value);
}

function humanizeToken(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        return (
          readString(record.name) ||
          readString(record.label) ||
          readString(record.id) ||
          readString(record.code)
        );
      }
      return "";
    })
    .filter(Boolean);
}

export type CatalogEntry = {
  key: string;
  label: string;
};

function readCatalogEntries(value: unknown, groupKey: string): CatalogEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (typeof entry === "string") {
      const id = entry.trim();
      return {
        key: `${groupKey}-${index}-${id || "item"}`,
        label: humanizeToken(id) || `Item ${index + 1}`,
      };
    }
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const id = readString(record.id) || readString(record.code);
      const name = readString(record.name) || readString(record.label);
      const label =
        name && id && name !== id ? `${name} (${id})`
        : name || id || `Item ${index + 1}`;
      return {
        key: `${groupKey}-${index}-${id || name || "item"}`,
        label,
      };
    }
    return {
      key: `${groupKey}-${index}`,
      label: `Item ${index + 1}`,
    };
  });
}

export function parseGettingStartedProgress(data: Record<string, unknown>): {
  done: number;
  total: number;
  items: ChecklistItem[];
} {
  const gettingStarted = readRecord(data.gettingStarted);
  const items = GETTING_STARTED_ORDER.map((key) => ({
    key,
    label: GETTING_STARTED_LABELS[key] ?? humanizeToken(key),
    done: isTruthyFlag(gettingStarted[key]),
  }));
  const done = items.filter((item) => item.done).length;
  return { done, total: items.length, items };
}

export function parseQuickTourProgress(data: Record<string, unknown>): {
  done: number;
  total: number;
  items: ChecklistItem[];
} {
  const quickTourPage = readRecord(data.quickTourPage);
  const items = QUICK_TOUR_ORDER.map((key) => ({
    key,
    label: QUICK_TOUR_LABELS[key] ?? humanizeToken(key),
    done: isTruthyFlag(quickTourPage[key]),
  }));
  const done = items.filter((item) => item.done).length;
  return { done, total: items.length, items };
}

export function parseUiConfigRows(data: Record<string, unknown>): KeyValueRow[] {
  const uiConfig = readRecord(data.uiConfig);
  const keys = Object.keys(uiConfig).sort();
  if (keys.length === 0) return [];

  return keys.map((key) => ({
    key,
    label: UI_CONFIG_LABELS[key] ?? humanizeToken(key),
    value: formatScalar(uiConfig[key]),
  }));
}

export function parseUserFeedback(data: Record<string, unknown>): ParsedUserFeedback {
  const feedback = readRecord(data.userFeedback);
  const rating = Number(feedback.rating ?? feedback.score ?? feedback.stars);
  const recommendRaw = feedback.recommend ?? feedback.wouldRecommend;

  let recommendLabel = "—";
  if (typeof recommendRaw === "boolean") {
    recommendLabel = recommendRaw ? "Yes" : "No";
  } else if (recommendRaw === "true") {
    recommendLabel = "Yes";
  } else if (recommendRaw === "false") {
    recommendLabel = "No";
  }

  const feedbackText = readString(
    feedback.feedback ?? feedback.comment ?? feedback.message,
  );
  const suggestion = readString(
    feedback.nextUpdateSuggestion ?? feedback.suggestion,
  );
  const submittedAtLabel = formatProfileTimestamp(
    feedback.submittedAt ?? feedback.createdAt,
  );

  const hasFeedback =
    (Number.isFinite(rating) && rating >= 1 && rating <= 5) ||
    Boolean(feedbackText) ||
    Boolean(suggestion) ||
    recommendLabel !== "—" ||
    Boolean(submittedAtLabel);

  return {
    hasFeedback,
    ratingLabel:
      Number.isFinite(rating) && rating >= 1 && rating <= 5 ?
        `${Math.round(rating)}/5`
      : "—",
    recommendLabel,
    feedback: feedbackText || "—",
    suggestion: suggestion || "—",
    submittedAtLabel: submittedAtLabel ?? "—",
  };
}

export function parseCatalogSection(data: Record<string, unknown>): {
  waterTypes: CatalogEntry[];
  expenseCategories: CatalogEntry[];
  inventoryCategories: CatalogEntry[];
  usageGoals: CatalogEntry[];
} {
  const usageGoalIds = readStringArray(data.usageGoals);
  return {
    waterTypes: readCatalogEntries(data.waterTypes, "water"),
    expenseCategories: readCatalogEntries(data.expenseCategories, "expense"),
    inventoryCategories: readCatalogEntries(
      data.inventoryCategories,
      "inventory",
    ),
    usageGoals: usageGoalIds.map((id, index) => ({
      key: `goal-${index}-${id || "item"}`,
      label: USAGE_GOAL_LABELS[id] ?? humanizeToken(id),
    })),
  };
}

export const BUSINESS_STRUCTURED_ROOT_FIELD_KEYS = new Set([
  "quickTourPage",
  "gettingStarted",
  "uiConfig",
  "userFeedback",
  "waterTypes",
  "expenseCategories",
  "inventoryCategories",
  "usageGoals",
]);
