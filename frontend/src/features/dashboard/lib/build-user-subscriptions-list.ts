import type { ActiveOwner, OwnerSubscription } from "@/lib/dashboard/analytics";
import { isTestAccountOwner } from "@/lib/dashboard/test-account-filters";
import { isTrialBillingCycle } from "@/lib/dashboard/subscription-labels";

export type SubscriptionChangeKind =
  | "upgrade"
  | "downgrade"
  | "renewal"
  | "other";

export type SubscriptionListFilterKind =
  | "all"
  | "pending"
  | "upgrade"
  | "downgrade"
  | "renewal";

/** One business / owner card with current plan + full history. */
export type UserSubscriptionListItem = {
  businessId: string;
  businessName: string;
  ownerEmail?: string;
  /** Latest active subscription when present; otherwise newest overall. */
  subscription: OwnerSubscription;
  changeKind: SubscriptionChangeKind;
  activeSubscriptionCount: number;
  /** All subscriptions for this business, newest first. */
  history: OwnerSubscription[];
  /** Lower = higher list priority (Scale → Grow → Scale trial). */
  planSortRank: number;
  /** Any period waiting for payment verification / approval. */
  hasPendingPayment: boolean;
  /** A paid period was recorded recently (verified / approved). */
  justPaid: boolean;
};

const RECENT_PAYMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function subscriptionActivityMs(subscription: OwnerSubscription): number {
  for (const value of [
    subscription.activatedAt,
    subscription.createdAt,
    subscription.activatesAt,
  ]) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

export function isPendingPaymentSubscription(
  subscription: OwnerSubscription,
): boolean {
  if (subscription.needsApproval) return true;
  const paymentStatus = String(subscription.paymentStatus ?? "").toLowerCase();
  if (
    paymentStatus === "pending" ||
    paymentStatus === "pending_verification"
  ) {
    return true;
  }
  const status = String(subscription.status ?? "").toLowerCase();
  return status === "pending";
}

export function isRecentlyPaidSubscription(
  subscription: OwnerSubscription,
  now = Date.now(),
  windowMs = RECENT_PAYMENT_WINDOW_MS,
): boolean {
  const price = Number(subscription.price);
  if (!Number.isFinite(price) || price <= 0) return false;
  if (isTrialBillingCycle(subscription.billingCycle)) return false;

  const paymentStatus = String(subscription.paymentStatus ?? "").toLowerCase();
  const status = String(subscription.status ?? "").toLowerCase();
  const paid =
    paymentStatus === "verified" ||
    paymentStatus === "approved" ||
    ((status === "approved" || status === "active") &&
      paymentStatus !== "pending" &&
      paymentStatus !== "pending_verification" &&
      paymentStatus !== "failed");
  if (!paid) return false;

  const activityMs = subscriptionActivityMs(subscription);
  if (!activityMs) return false;
  return now - activityMs <= windowMs && activityMs <= now + 60_000;
}

export function resolvePaymentIndicators(
  history: OwnerSubscription[],
  now = Date.now(),
): { hasPendingPayment: boolean; justPaid: boolean } {
  const hasPendingPayment = history.some((sub) =>
    isPendingPaymentSubscription(sub),
  );
  const justPaid =
    !hasPendingPayment &&
    history.some((sub) => isRecentlyPaidSubscription(sub, now));
  return { hasPendingPayment, justPaid };
}

const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "superseded",
  "expired",
  "cancelled",
  "canceled",
]);

export function subscriptionCreatedMs(
  subscription: OwnerSubscription,
): number {
  if (!subscription.createdAt) return 0;
  const ms = new Date(subscription.createdAt).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function isSubscriptionExpiredByDate(
  subscription: OwnerSubscription,
  now = Date.now(),
): boolean {
  if (!subscription.expiresAt) return false;
  const expiresMs = new Date(subscription.expiresAt).getTime();
  if (Number.isNaN(expiresMs) || expiresMs >= now) return false;
  return subscription.status.toLowerCase() !== "grace_period";
}

export function isSubscriptionActive(
  subscription: OwnerSubscription,
  now = Date.now(),
): boolean {
  if (subscription.timeline === "past") return false;
  const status = subscription.status.toLowerCase();
  if (INACTIVE_SUBSCRIPTION_STATUSES.has(status)) return false;
  if (isSubscriptionExpiredByDate(subscription, now)) return false;
  return true;
}

export function countActiveSubscriptions(
  subscriptions: OwnerSubscription[],
  now = Date.now(),
): number {
  return subscriptions.filter((subscription) =>
    isSubscriptionActive(subscription, now),
  ).length;
}

export function resolveSubscriptionChangeKind(
  subscription: OwnerSubscription,
): SubscriptionChangeKind {
  const changeType = (subscription.changeType || "").toLowerCase();
  if (changeType === "upgrade") return "upgrade";
  if (changeType === "downgrade" || subscription.isDowngrade) return "downgrade";
  if (changeType === "renew") return "renewal";
  return "other";
}

/**
 * List priority for the latest active plan:
 * 1 Scale (paid) → 2 Grow → 3 Scale trial → other trials / plans after.
 */
export function resolvePlanSortRank(subscription: OwnerSubscription): number {
  const code = (subscription.planCode || "").toLowerCase();
  const name = (subscription.planName || "").toLowerCase();
  const isTrial =
    isTrialBillingCycle(subscription.billingCycle) || name.includes("trial");

  const isScale = code === "scale" || name === "scale" || name.startsWith("scale ");
  const isGrow =
    code === "grow" ||
    code === "growth" ||
    name === "grow" ||
    name === "growth" ||
    name.startsWith("grow ");

  if (isTrial) {
    if (isScale) return 3;
    if (isGrow) return 4;
    return 5;
  }
  if (isScale) return 1;
  if (isGrow) return 2;
  if (code === "starter" || name === "starter") return 6;
  return 7;
}

export function sortSubscriptionsNewestFirst(
  subscriptions: OwnerSubscription[],
): OwnerSubscription[] {
  return [...subscriptions].sort(
    (a, b) => subscriptionCreatedMs(b) - subscriptionCreatedMs(a),
  );
}

export function pickLatestSubscription(
  subscriptions: OwnerSubscription[],
): OwnerSubscription | undefined {
  if (subscriptions.length === 0) return undefined;

  return subscriptions.reduce((latest, subscription) =>
    subscriptionCreatedMs(subscription) > subscriptionCreatedMs(latest) ?
      subscription
    : latest,
  );
}

/** Prefers newest active row; falls back to newest overall. */
export function pickLatestActiveSubscription(
  subscriptions: OwnerSubscription[],
  now = Date.now(),
): OwnerSubscription | undefined {
  const active = subscriptions.filter((subscription) =>
    isSubscriptionActive(subscription, now),
  );
  return pickLatestSubscription(active) ?? pickLatestSubscription(subscriptions);
}

export function buildUserSubscriptionsList(
  owners: ActiveOwner[],
  now = Date.now(),
): UserSubscriptionListItem[] {
  const items: UserSubscriptionListItem[] = [];

  for (const owner of owners) {
    if (isTestAccountOwner(owner)) continue;

    const all = owner.subscriptions ?? [];
    const subscription = pickLatestActiveSubscription(all, now);
    if (!subscription) continue;

    const history = sortSubscriptionsNewestFirst(all);
    const { hasPendingPayment, justPaid } = resolvePaymentIndicators(
      history,
      now,
    );

    items.push({
      businessId: owner.id,
      businessName: owner.businessName,
      ownerEmail: owner.ownerEmail,
      subscription,
      changeKind: resolveSubscriptionChangeKind(subscription),
      activeSubscriptionCount: countActiveSubscriptions(all, now),
      history,
      planSortRank: resolvePlanSortRank(subscription),
      hasPendingPayment,
      justPaid,
    });
  }

  return items.sort((a, b) => {
    if (a.planSortRank !== b.planSortRank) {
      return a.planSortRank - b.planSortRank;
    }
    return (
      subscriptionCreatedMs(b.subscription) -
      subscriptionCreatedMs(a.subscription)
    );
  });
}

export function filterUserSubscriptionsList(
  items: UserSubscriptionListItem[],
  filter: SubscriptionListFilterKind,
): UserSubscriptionListItem[] {
  if (filter === "all") return items;
  if (filter === "pending") {
    return items.filter(
      (item) =>
        item.subscription.needsApproval ||
        item.history.some((sub) => sub.needsApproval),
    );
  }
  return items.filter((item) => item.changeKind === filter);
}

export function countUserSubscriptionsByFilter(
  items: UserSubscriptionListItem[],
): Record<SubscriptionListFilterKind, number> {
  return {
    all: items.length,
    pending: items.filter(
      (item) =>
        item.subscription.needsApproval ||
        item.history.some((sub) => sub.needsApproval),
    ).length,
    upgrade: items.filter((item) => item.changeKind === "upgrade").length,
    downgrade: items.filter((item) => item.changeKind === "downgrade").length,
    renewal: items.filter((item) => item.changeKind === "renewal").length,
  };
}
