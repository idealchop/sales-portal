/**
 * Canonical SmartRefill `subscription_plans` catalog for Sales Portal.
 * Keep in sync with `smartrefill/backend/functions/src/config/subscription-plans-catalog.ts`.
 *
 * Lineup: Free ₱0 · Starter ₱399 · Grow ₱950 · Scale ₱1,650.
 * Enterprise is sales-led (contact sales), not a fifth self-serve card.
 */

const CHANNELS_DISABLED = {
  messenger: { max: 0, frequency: "monthly" },
  whatsapp: { max: 0, frequency: "monthly" },
  sms: { max: 0, frequency: "monthly" },
  webhooks: { max: 0, frequency: "monthly" },
} as const;

const SUPPORT_CHAT_ONLY = {
  chat: { max: 0, frequency: "monthly" },
  attachments: false,
  agentChat: true,
} as const;

export type SubscriptionPlanCatalogRow = {
  code: string;
  name: string;
  pricing: { monthly: number; yearly: number };
  limitations: Record<string, unknown>;
};

export const SUBSCRIPTION_PLAN_CATALOG_ROWS: Record<
  string,
  SubscriptionPlanCatalogRow
> = {
  free: {
    code: "free",
    name: "Free",
    pricing: { monthly: 0, yearly: 0 },
    limitations: {
      customers: { max: 100 },
      containers: { frequency: "daily", max: 50 },
      transactions: { frequency: "daily", max: 50 },
      aiTools: { max: 0, frequency: "monthly" },
      online_orders: { frequency: "daily", max: 0 },
      channels: CHANNELS_DISABLED,
      staff: { admin: 0, rider: 0 },
      support: SUPPORT_CHAT_ONLY,
    },
  },
  starter: {
    code: "starter",
    name: "Starter",
    pricing: { monthly: 399, yearly: 3990 },
    limitations: {
      customers: "full",
      containers: { frequency: "daily", max: 150 },
      transactions: { frequency: "daily", max: 150 },
      aiTools: { max: 0, frequency: "monthly" },
      online_orders: { frequency: "daily", max: 10 },
      channels: CHANNELS_DISABLED,
      staff: { admin: 0, rider: 0 },
      support: SUPPORT_CHAT_ONLY,
    },
  },
  grow: {
    code: "grow",
    name: "Grow",
    pricing: { monthly: 950, yearly: 9500 },
    limitations: {
      customers: "full",
      containers: { frequency: "daily", max: 350 },
      transactions: { frequency: "daily", max: 350 },
      aiTools: { max: 0, frequency: "monthly" },
      online_orders: { frequency: "daily", max: 25 },
      channels: CHANNELS_DISABLED,
      staff: { admin: 0, rider: 1 },
      support: SUPPORT_CHAT_ONLY,
    },
  },
  pro: {
    code: "pro",
    name: "Grow",
    pricing: { monthly: 950, yearly: 9500 },
    limitations: {
      customers: "full",
      containers: { frequency: "daily", max: 350 },
      transactions: { frequency: "daily", max: 350 },
      aiTools: { max: 0, frequency: "monthly" },
      online_orders: { frequency: "daily", max: 25 },
      channels: CHANNELS_DISABLED,
      staff: { admin: 0, rider: 1 },
      support: SUPPORT_CHAT_ONLY,
    },
  },
  scale: {
    code: "scale",
    name: "Scale",
    pricing: { monthly: 1650, yearly: 16500 },
    limitations: {
      customers: "full",
      containers: "full",
      transactions: "full",
      aiTools: "full",
      online_orders: "full",
      channels: CHANNELS_DISABLED,
      staff: { admin: 1, rider: 2 },
      support: {
        chat: "full",
        attachments: true,
        agentChat: true,
        trial: {
          chat: { max: 5, frequency: "daily" },
          attachments: { enabled: true, max: 5, frequency: "daily" },
          agentChat: true,
        },
      },
    },
  },
  enterprise: {
    code: "enterprise",
    name: "Enterprise",
    pricing: { monthly: 0, yearly: 0 },
    limitations: {
      customers: "full",
      containers: "full",
      transactions: "full",
      aiTools: "full",
      online_orders: "full",
      channels: CHANNELS_DISABLED,
      support: {
        chat: "full",
        attachments: true,
        agentChat: true,
      },
    },
  },
};

export const SUBSCRIPTION_PLAN_LIMITATION_PATCHES: Record<
  string,
  Record<string, unknown>
> = Object.fromEntries(
  Object.entries(SUBSCRIPTION_PLAN_CATALOG_ROWS).map(([code, row]) => [
    code,
    row.limitations,
  ]),
);

export const SUBSCRIPTION_PLAN_CATALOG_HINT =
  "Canonical: Free ₱0 · Starter ₱399 / ₱3,990 yr · Grow ₱950 / ₱9,500 · Scale ₱1,650 / ₱16,500. Enterprise is custom — contact sales.";

export function normalizeSubscriptionPlanCode(
  planCode: string | undefined | null,
): string {
  const code = String(planCode || "").toLowerCase().trim();
  return code === "pro" ? "grow" : code;
}

export function lookupSubscriptionPlanCatalogRow(
  planCode: string | undefined | null,
): SubscriptionPlanCatalogRow | null {
  const code = String(planCode || "").toLowerCase().trim();
  return SUBSCRIPTION_PLAN_CATALOG_ROWS[code] ?? null;
}
