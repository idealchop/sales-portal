import type { NewJoinersSummary } from "./build-new-joiners";
import type { OwnerSubscription } from "./map-owner-subscriptions";

export type PlatformAlertKind =
  | "demo_inquiry"
  | "new_user_registration"
  | "subscription_change"
  | "subscription_expiring_soon"
  | "subscription_grace_period";

export type PlatformAlertContactStatus = "need_contact" | "contacted";

export type PlatformAlert = {
  id: string;
  kind: PlatformAlertKind;
  title: string;
  subtitle: string;
  occurredAt: string | null;
  email?: string;
  businessId?: string;
  businessName?: string;
  contactStatus?: PlatformAlertContactStatus;
  /** True until a sales user acknowledges the alert (any contact action). */
  isNew?: boolean;
};

export type PlatformAlertsSummary = {
  items: PlatformAlert[];
  counts: Record<PlatformAlertKind, number>;
};

const RECENT_DAYS = 30;
const EXPIRING_SOON_DAYS = 7;
const GRACE_PERIOD_DAYS = 7;
const MAX_ITEMS = 48;

const EMPTY_COUNTS: Record<PlatformAlertKind, number> = {
  demo_inquiry: 0,
  new_user_registration: 0,
  subscription_change: 0,
  subscription_expiring_soon: 0,
  subscription_grace_period: 0,
};

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    return new Date((value as { _seconds: number })._seconds * 1000).toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinRecentDays(iso: string | null, now: Date, days: number): boolean {
  const date = parseDate(iso);
  if (!date) return false;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return date.getTime() >= cutoff;
}

function describeSubscriptionChange(sub: OwnerSubscription): string {
  if (sub.isCancellation || sub.status === "cancelled" || sub.status === "canceled") {
    return "Cancelled subscription";
  }
  if (sub.changeType === "upgrade") return "Upgraded subscription";
  if (sub.changeType === "downgrade") return "Downgraded subscription";
  if (sub.changeType === "renew") return "Renewed subscription";
  if (sub.changeType) {
    const label = sub.changeType.replace(/_/g, " ");
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} subscription`;
  }
  return "Subscription updated";
}

function isInGracePeriod(sub: OwnerSubscription, now: Date): boolean {
  if (sub.status === "grace_period") return true;
  const expiresAt = parseDate(sub.expiresAt);
  if (!expiresAt) return false;
  const graceEnd = new Date(expiresAt);
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
  return now > expiresAt && now <= graceEnd;
}

function isExpiringWithinDays(
  sub: OwnerSubscription,
  now: Date,
  days: number,
): boolean {
  const expiresAt = parseDate(sub.expiresAt);
  if (!expiresAt) return false;
  const ms = expiresAt.getTime() - now.getTime();
  return ms > 0 && ms <= days * 24 * 60 * 60 * 1000;
}

function formatExpiryLabel(iso: string | null | undefined): string {
  const date = parseDate(iso ?? null);
  if (!date) return "expiry date unknown";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolveCurrentSubscription(
  subscriptions: OwnerSubscription[],
): OwnerSubscription | undefined {
  return (
    subscriptions.find((sub) => sub.timeline === "current") ??
    subscriptions.find(
      (sub) =>
        sub.status === "active" ||
        sub.status === "grace_period" ||
        sub.status === "approved",
    )
  );
}

export function countPlatformAlertsByKind(
  items: PlatformAlert[],
): Record<PlatformAlertKind, number> {
  const counts = { ...EMPTY_COUNTS };
  for (const item of items) {
    counts[item.kind] += 1;
  }
  return counts;
}

export function buildPlatformAlerts(input: {
  inquiries: Array<{ id: string; data: Record<string, unknown> }>;
  newJoiners: NewJoinersSummary;
  subscriptionsByBusiness: Map<string, OwnerSubscription[]>;
  businessNamesById: Map<string, string>;
  now?: Date;
  limit?: number;
}): PlatformAlertsSummary {
  const now = input.now ?? new Date();
  const limit = input.limit ?? MAX_ITEMS;
  const items: PlatformAlert[] = [];

  for (const inquiry of input.inquiries) {
    const data = inquiry.data;
    if (String(data.type || "") !== "request_demo") continue;

    const name = String(data.name || "Prospect").trim();
    const businessName = String(data.businessName || "Unknown business").trim();
    items.push({
      id: `demo-${inquiry.id}`,
      kind: "demo_inquiry",
      title: name,
      subtitle: `Inquire for demo · ${businessName}${
        data.stationCount ? ` · ${String(data.stationCount)} station(s)` : ""
      }`,
      occurredAt: toIso(data.createdAt),
      email: typeof data.email === "string" ? data.email : undefined,
      businessName,
    });
  }

  for (const user of input.newJoiners.platformUsers) {
    if (!isWithinRecentDays(user.joinedAt, now, RECENT_DAYS)) continue;
    items.push({
      id: `user-${user.id}`,
      kind: "new_user_registration",
      title: user.displayName || user.email || user.id,
      subtitle: `New SmartRefill user · ${user.role}${
        user.email ? ` · ${user.email}` : ""
      }`,
      occurredAt: user.joinedAt,
      email: user.email,
    });
  }

  for (const [businessId, subscriptions] of input.subscriptionsByBusiness.entries()) {
    const businessName =
      input.businessNamesById.get(businessId) || "Unnamed business";

    for (const sub of subscriptions) {
      if (!isWithinRecentDays(sub.createdAt ?? null, now, RECENT_DAYS)) continue;

      const hasChangeSignal =
        Boolean(sub.changeType) ||
        sub.isCancellation ||
        sub.isDowngrade ||
        sub.status === "cancelled" ||
        sub.status === "canceled" ||
        sub.cancelAtPeriodEnd;

      if (!hasChangeSignal) continue;

      items.push({
        id: `sub-change-${businessId}-${sub.id}`,
        kind: "subscription_change",
        title: businessName,
        subtitle: `${describeSubscriptionChange(sub)} · ${sub.planName}`,
        occurredAt: sub.createdAt ?? null,
        businessId,
        businessName,
      });
    }

    const current = resolveCurrentSubscription(subscriptions);
    if (!current) continue;

    if (isInGracePeriod(current, now)) {
      items.push({
        id: `sub-grace-${businessId}-${current.id}`,
        kind: "subscription_grace_period",
        title: businessName,
        subtitle: `Grace period · ${current.planName} · expired ${formatExpiryLabel(current.expiresAt)}`,
        occurredAt: current.expiresAt ?? null,
        businessId,
        businessName,
      });
      continue;
    }

    if (isExpiringWithinDays(current, now, EXPIRING_SOON_DAYS)) {
      items.push({
        id: `sub-expiring-${businessId}-${current.id}`,
        kind: "subscription_expiring_soon",
        title: businessName,
        subtitle: `Expires in ≤${EXPIRING_SOON_DAYS} days · ${current.planName} · ${formatExpiryLabel(current.expiresAt)}`,
        occurredAt: current.expiresAt ?? null,
        businessId,
        businessName,
      });
    }
  }

  const sorted = items
    .sort((a, b) =>
      String(b.occurredAt ?? "").localeCompare(String(a.occurredAt ?? "")),
    )
    .slice(0, limit);

  return {
    items: sorted,
    counts: countPlatformAlertsByKind(sorted),
  };
}
