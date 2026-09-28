import type { DashboardAnalytics, ActiveOwner } from "@/lib/dashboard/analytics";

export const SMARTREFILL_TRIAL_APP_LABEL = "Smart Refill";

const TRIALABLE_PLAN_CODES = new Set(["starter", "grow", "scale", "enterprise"]);

export function manilaDateInputValue(iso?: string | null, now = new Date()): string {
  const date = iso ? new Date(iso) : now;
  const source = Number.isNaN(date.getTime()) ? now : date;
  const manila = new Date(source.getTime() + 8 * 60 * 60 * 1000);
  const year = manila.getUTCFullYear();
  const month = String(manila.getUTCMonth() + 1).padStart(2, "0");
  const day = String(manila.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** End of the chosen Manila calendar day. */
export function trialEndsAtFromManilaDate(yyyyMmDd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim());
  if (!match) throw new Error("Enter a trial end date.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day, 15, 59, 59, 999)).toISOString();
}

export function isTrialablePlanCode(planCode: string): boolean {
  return TRIALABLE_PLAN_CODES.has(planCode.trim().toLowerCase());
}

export type TrialStationEdit = {
  businessId: string;
  subscriptionId: string;
  planCode: string;
  planName: string;
  expiresAt: string;
  billingCycle?: string;
  price?: number;
  overridePayment?: "paid" | "granted";
};

function patchOwner(owner: ActiveOwner, edit: TrialStationEdit): ActiveOwner {
  if (owner.id !== edit.businessId) return owner;
  const granted = edit.overridePayment === "granted";
  const price = granted ? 0 : edit.price ?? undefined;
  return {
    ...owner,
    planName: edit.planName,
    ...(price !== undefined ? { monthlyRevenue: price } : {}),
    subscriptions: owner.subscriptions?.map((subscription) =>
      subscription.id === edit.subscriptionId ?
        {
          ...subscription,
          planCode: edit.planCode,
          planName: edit.planName,
          expiresAt: edit.expiresAt,
          billingCycle: edit.billingCycle ?? "monthly",
          ...(price !== undefined ? { price } : {}),
          ...(edit.overridePayment ?
            {
              overridePayment: edit.overridePayment,
              changeType: "override",
              paymentStatus: "approved",
              paymentMethod: "manual",
            }
          : {}),
        }
      : subscription,
    ),
  };
}

export function applyTrialStationEdit(
  analytics: DashboardAnalytics,
  edit: TrialStationEdit,
): DashboardAnalytics {
  const metrics = analytics.growthSalesMetrics;
  return {
    ...analytics,
    growthSalesMetrics: {
      ...metrics,
      activeOwners: metrics.activeOwners.map((owner) => patchOwner(owner, edit)),
      subscriptionOwners: metrics.subscriptionOwners?.map((owner) =>
        patchOwner(owner, edit),
      ),
    },
  };
}
