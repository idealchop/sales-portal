import type { ActiveOwner, OwnerSubscription } from "@/lib/dashboard/analytics";
import { isTestAccountOwner } from "@/lib/dashboard/test-account-filters";
import { isTrialBillingCycle } from "@/lib/dashboard/subscription-labels";
import {
  isFreeForeverPlan,
  isGrowPlanCode,
  isPaidStarterPlan,
  isScalePlanCode,
  isTrialPlan,
} from "@/lib/dashboard/subscription-plan-codes";

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

export type SubscriptionOpsBucket =
  | "attention"
  | "paying"
  | "voucher"
  | "trial"
  | "free"
  | "ended";

export type SubscriptionPlanTier =
  | "scale"
  | "grow"
  | "starter"
  | "free"
  | "trial"
  | "other";

export type SubscriptionOpsQuery = {
  search?: string;
  bucket?: "all" | SubscriptionOpsBucket;
  plan?: "all" | Exclude<SubscriptionPlanTier, "other">;
  activity?: SubscriptionListFilterKind;
};

export type UserSubscriptionKpis = {
  total: number;
  paying: number;
  trial: number;
  free: number;
  voucher: number;
  attention: number;
  ended: number;
  pending: number;
  monthlyBilled: number;
  scale: number;
  grow: number;
  starter: number;
};

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
  opsBucket: SubscriptionOpsBucket;
  planTier: SubscriptionPlanTier;
  isGrace: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isVoucher: boolean;
};

const RECENT_PAYMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const EXPIRING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export const SUBSCRIPTION_OPS_BUCKET_ORDER: SubscriptionOpsBucket[] = [
  "attention",
  "paying",
  "voucher",
  "trial",
  "free",
  "ended",
];

const BUCKET_SORT: Record<SubscriptionOpsBucket, number> = {
  attention: 0,
  paying: 1,
  voucher: 2,
  trial: 3,
  free: 4,
  ended: 5,
};

const NO_PLAN_SUBSCRIPTION: OwnerSubscription = {
  id: "__none__",
  planName: "No plan",
  status: "none",
  price: 0,
  timeline: "past",
  cancelAtPeriodEnd: false,
  needsApproval: false,
  isDowngrade: false,
  isCancellation: false,
};

const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "superseded",
  "expired",
  "cancelled",
  "canceled",
]);

export function resolvePlanTier(
  subscription: OwnerSubscription,
): SubscriptionPlanTier {
  if (isTrialPlan(subscription) || isTrialBillingCycle(subscription.billingCycle)) {
    return "trial";
  }
  if (isFreeForeverPlan(subscription)) return "free";
  if (isScalePlanCode(subscription.planCode, subscription.planName)) return "scale";
  if (isGrowPlanCode(subscription.planCode, subscription.planName)) return "grow";
  if (isPaidStarterPlan(subscription)) return "starter";
  return "other";
}

function isExpiringSoonSubscription(
  subscription: OwnerSubscription,
  now: number,
): boolean {
  if (!subscription.expiresAt) return false;
  const expiresMs = new Date(subscription.expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return false;
  const remaining = expiresMs - now;
  return remaining >= 0 && remaining <= EXPIRING_SOON_MS;
}

function monthlyBilledAmount(subscription: OwnerSubscription): number {
  const price = Number(subscription.price);
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (isTrialBillingCycle(subscription.billingCycle)) return 0;
  if (isFreeForeverPlan(subscription)) return 0;
  const cycle = String(subscription.billingCycle || "monthly").toLowerCase();
  if (cycle === "yearly") return price / 12;
  return price;
}

export function classifySubscriptionOps(
  item: Pick<
    UserSubscriptionListItem,
    "subscription" | "hasPendingPayment" | "activeSubscriptionCount"
  > & { hasCurrentPlan?: boolean },
  now = Date.now(),
): Pick<
  UserSubscriptionListItem,
  | "opsBucket"
  | "planTier"
  | "isGrace"
  | "isExpired"
  | "isExpiringSoon"
  | "isVoucher"
> {
  const subscription = item.subscription;
  const planTier = resolvePlanTier(subscription);
  const isExpired = isSubscriptionExpiredByDate(subscription, now);
  const isGrace = subscription.status.toLowerCase() === "grace_period";
  const isVoucher =
    planTier !== "trial" &&
    planTier !== "free" &&
    !(Number(subscription.price) > 0) &&
    subscription.id !== NO_PLAN_SUBSCRIPTION.id;
  const isExpiringSoon =
    !isExpired &&
    planTier !== "free" &&
    isExpiringSoonSubscription(subscription, now);

  if (item.hasCurrentPlan === false) {
    return {
      opsBucket: "ended",
      planTier: subscription.id === NO_PLAN_SUBSCRIPTION.id ? "other" : planTier,
      isGrace: false,
      isExpired:
        isExpired ||
        INACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status.toLowerCase()),
      isExpiringSoon: false,
      isVoucher: false,
    };
  }

  const needsAttention =
    item.hasPendingPayment ||
    isGrace ||
    isExpired ||
    item.activeSubscriptionCount !== 1 ||
    isExpiringSoon;

  let opsBucket: SubscriptionOpsBucket = "free";
  if (needsAttention) opsBucket = "attention";
  else if (planTier === "trial") opsBucket = "trial";
  else if (isVoucher) opsBucket = "voucher";
  else if (Number(subscription.price) > 0) opsBucket = "paying";

  return {
    opsBucket,
    planTier,
    isGrace,
    isExpired,
    isExpiringSoon,
    isVoucher,
  };
}

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
  if (code === "free" || name === "free") return 7;
  return 8;
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
    subscriptionActivityMs(subscription) > subscriptionActivityMs(latest) ?
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

/**
 * Latest plan the workspace is on now — includes Free / trial.
 * Prefer newest status=active (any price) so a newer Free row wins over
 * an older Scale that was never marked superseded.
 */
export function pickLatestCurrentPlanSubscription(
  subscriptions: OwnerSubscription[],
  now = Date.now(),
): OwnerSubscription | undefined {
  const activeNow = subscriptions.filter((subscription) => {
    const status = subscription.status.toLowerCase();
    if (status !== "active") return false;
    if (INACTIVE_SUBSCRIPTION_STATUSES.has(status)) return false;
    if (isSubscriptionExpiredByDate(subscription, now)) return false;
    return true;
  });
  const fromActive = pickLatestSubscription(activeNow);
  if (fromActive) return fromActive;

  const current = subscriptions.find((sub) => sub.timeline === "current");
  if (
    current &&
    !INACTIVE_SUBSCRIPTION_STATUSES.has(current.status.toLowerCase()) &&
    !isSubscriptionExpiredByDate(current, now)
  ) {
    return current;
  }

  return pickLatestSubscription(
    subscriptions.filter((subscription) => {
      const status = subscription.status.toLowerCase();
      if (INACTIVE_SUBSCRIPTION_STATUSES.has(status)) return false;
      if (status === "scheduled") return false;
      if (isSubscriptionExpiredByDate(subscription, now)) return false;
      return true;
    }),
  );
}

/**
 * Latest live paid plan only when the current plan itself is paid.
 * Use {@link pickLatestCurrentPlanSubscription} to know plan tier first.
 */
export function pickLatestLivePaidSubscription(
  subscriptions: OwnerSubscription[],
  now = Date.now(),
): OwnerSubscription | undefined {
  const current = pickLatestCurrentPlanSubscription(subscriptions, now);
  if (
    current &&
    current.status.toLowerCase() === "active" &&
    Number(current.price) > 0 &&
    !isTrialBillingCycle(current.billingCycle)
  ) {
    return current;
  }
  return undefined;
}

export function buildUserSubscriptionsList(
  owners: ActiveOwner[],
  now = Date.now(),
): UserSubscriptionListItem[] {
  const items: UserSubscriptionListItem[] = [];

  for (const owner of owners) {
    if (isTestAccountOwner(owner)) continue;

    const all = owner.subscriptions ?? [];
    const current = pickLatestCurrentPlanSubscription(all, now);
    const subscription = current ?? pickLatestSubscription(all) ?? NO_PLAN_SUBSCRIPTION;
    const hasCurrentPlan = Boolean(current);

    const history = sortSubscriptionsNewestFirst(all);
    const { hasPendingPayment, justPaid } = resolvePaymentIndicators(
      history,
      now,
    );

    const draft: Omit<
      UserSubscriptionListItem,
      | "opsBucket"
      | "planTier"
      | "isGrace"
      | "isExpired"
      | "isExpiringSoon"
      | "isVoucher"
    > = {
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
    };

    items.push({
      ...draft,
      ...classifySubscriptionOps({ ...draft, hasCurrentPlan }, now),
    });
  }

  return items.sort((a, b) => {
    if (BUCKET_SORT[a.opsBucket] !== BUCKET_SORT[b.opsBucket]) {
      return BUCKET_SORT[a.opsBucket] - BUCKET_SORT[b.opsBucket];
    }
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

export function buildUserSubscriptionKpis(
  items: UserSubscriptionListItem[],
): UserSubscriptionKpis {
  const kpis: UserSubscriptionKpis = {
    total: items.length,
    paying: 0,
    trial: 0,
    free: 0,
    voucher: 0,
    attention: 0,
    ended: 0,
    pending: 0,
    monthlyBilled: 0,
    scale: 0,
    grow: 0,
    starter: 0,
  };

  for (const item of items) {
    if (item.opsBucket === "paying") {
      kpis.paying += 1;
      kpis.monthlyBilled += monthlyBilledAmount(item.subscription);
      if (item.planTier === "scale") kpis.scale += 1;
      if (item.planTier === "grow") kpis.grow += 1;
      if (item.planTier === "starter") kpis.starter += 1;
    }
    if (item.opsBucket === "trial") kpis.trial += 1;
    if (item.opsBucket === "free") kpis.free += 1;
    if (item.opsBucket === "voucher") kpis.voucher += 1;
    if (item.opsBucket === "attention") kpis.attention += 1;
    if (item.opsBucket === "ended") kpis.ended += 1;
    if (
      item.hasPendingPayment ||
      item.subscription.needsApproval ||
      item.history.some((sub) => sub.needsApproval)
    ) {
      kpis.pending += 1;
    }
  }

  return kpis;
}

export function filterUserSubscriptionsOps(
  items: UserSubscriptionListItem[],
  query: SubscriptionOpsQuery = {},
): UserSubscriptionListItem[] {
  const search = (query.search || "").trim().toLowerCase();
  const bucket = query.bucket ?? "all";
  const plan = query.plan ?? "all";
  const activity = query.activity ?? "all";

  return items.filter((item) => {
    if (bucket !== "all" && item.opsBucket !== bucket) return false;
    if (plan !== "all" && item.planTier !== plan) return false;
    if (activity !== "all") {
      if (filterUserSubscriptionsList([item], activity).length === 0) return false;
    }
    if (!search) return true;
    const name = item.businessName.toLowerCase();
    const email = (item.ownerEmail || "").toLowerCase();
    return name.includes(search) || email.includes(search);
  });
}
