import type { ActiveOwner, OwnerSubscription } from "@/lib/dashboard/analytics";

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

export type UserSubscriptionListItem = {
  businessId: string;
  businessName: string;
  ownerEmail?: string;
  subscription: OwnerSubscription;
  changeKind: SubscriptionChangeKind;
  activeSubscriptionCount: number;
};

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

export function buildUserSubscriptionsList(
  owners: ActiveOwner[],
  now = Date.now(),
): UserSubscriptionListItem[] {
  const items: UserSubscriptionListItem[] = [];

  for (const owner of owners) {
    const subscription = pickLatestSubscription(owner.subscriptions ?? []);
    if (!subscription) continue;

    items.push({
      businessId: owner.id,
      businessName: owner.businessName,
      ownerEmail: owner.ownerEmail,
      subscription,
      changeKind: resolveSubscriptionChangeKind(subscription),
      activeSubscriptionCount: countActiveSubscriptions(
        owner.subscriptions ?? [],
        now,
      ),
    });
  }

  return items.sort(
    (a, b) =>
      subscriptionCreatedMs(b.subscription) - subscriptionCreatedMs(a.subscription),
  );
}

export function filterUserSubscriptionsList(
  items: UserSubscriptionListItem[],
  filter: SubscriptionListFilterKind,
): UserSubscriptionListItem[] {
  if (filter === "all") return items;
  if (filter === "pending") {
    return items.filter((item) => item.subscription.needsApproval);
  }
  return items.filter((item) => item.changeKind === filter);
}

export function countUserSubscriptionsByFilter(
  items: UserSubscriptionListItem[],
): Record<SubscriptionListFilterKind, number> {
  return {
    all: items.length,
    pending: items.filter((item) => item.subscription.needsApproval).length,
    upgrade: items.filter((item) => item.changeKind === "upgrade").length,
    downgrade: items.filter((item) => item.changeKind === "downgrade").length,
    renewal: items.filter((item) => item.changeKind === "renewal").length,
  };
}
