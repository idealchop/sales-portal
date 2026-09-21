import type { UserSubscriptionListItem } from "@/features/dashboard/lib/build-user-subscriptions-list";
import { normalizeSubscriptionPlanCode } from "@/lib/admin/subscription-plans-catalog";
import type { OwnerSubscription } from "@/lib/dashboard/analytics";
import {
  isFreeForeverPlan,
  isGrowPlanCode,
  isStarterPlanCode,
  isTrialPlan,
} from "@/lib/dashboard/subscription-plan-codes";
import { isTrialBillingCycle, trialDaysRemainingCount } from "@/lib/dashboard/subscription-labels";

/** Current stations only — ended workspaces do not count toward a catalog plan. */
export function isCurrentPlanSubscriber(item: UserSubscriptionListItem): boolean {
  return item.opsBucket !== "ended";
}

export function isLiveTrialSubscription(subscription: OwnerSubscription): boolean {
  return (
    isTrialPlan(subscription) || isTrialBillingCycle(subscription.billingCycle)
  );
}

/**
 * Map a live subscription onto a Plan management catalog `code`.
 * Unpaid Starter counts as Free. Scale trial stays on Scale.
 */
export function catalogCodeForCurrentSubscription(
  subscription: OwnerSubscription,
): string {
  if (isFreeForeverPlan(subscription)) return "free";

  const code = normalizeSubscriptionPlanCode(subscription.planCode);
  const name = String(subscription.planName || "").toLowerCase();

  if (code === "enterprise" || name.includes("enterprise")) return "enterprise";
  if (code === "scale" || name.includes("scale")) return "scale";
  if (isGrowPlanCode(subscription.planCode, subscription.planName)) return "grow";
  if (isStarterPlanCode(subscription.planCode, subscription.planName)) {
    return "starter";
  }
  if (code) return code;
  return "other";
}

export function groupCurrentSubscribersByCatalogCode(
  items: UserSubscriptionListItem[],
): Map<string, UserSubscriptionListItem[]> {
  const grouped = new Map<string, UserSubscriptionListItem[]>();

  for (const item of items) {
    if (!isCurrentPlanSubscriber(item)) continue;
    const code = catalogCodeForCurrentSubscription(item.subscription);
    const list = grouped.get(code);
    if (list) {
      list.push(item);
    } else {
      grouped.set(code, [item]);
    }
  }

  for (const list of grouped.values()) {
    list.sort((a, b) =>
      a.businessName.localeCompare(b.businessName, undefined, {
        sensitivity: "base",
      }),
    );
  }

  return grouped;
}

export function subscribersForCatalogPlan(
  grouped: Map<string, UserSubscriptionListItem[]>,
  catalogCode: string,
): UserSubscriptionListItem[] {
  return grouped.get(normalizeSubscriptionPlanCode(catalogCode)) ?? [];
}

export function catalogAddonMatchKeys(
  documentId: string,
  data: Record<string, unknown>,
): string[] {
  const keys = new Set<string>();
  const id = documentId.trim().toLowerCase();
  if (id) keys.add(id);
  const code = String(data.code || "").trim();
  if (code) {
    keys.add(code.toUpperCase());
    keys.add(`addon_${code.toLowerCase()}`);
  }
  return [...keys];
}

export function currentSubscriptionAddonKeys(
  subscription: OwnerSubscription,
): string[] {
  const keys = new Set<string>();
  for (const line of subscription.addonLineItems ?? []) {
    const addonId = line.addonId?.trim();
    if (addonId) keys.add(addonId.toLowerCase());
    const code = line.code?.trim();
    if (code) {
      keys.add(code.toUpperCase());
      keys.add(`addon_${code.toLowerCase()}`);
    }
  }
  return [...keys];
}

function sortSubscribersByStationName(rows: UserSubscriptionListItem[]): void {
  rows.sort((a, b) =>
    a.businessName.localeCompare(b.businessName, undefined, {
      sensitivity: "base",
    }),
  );
}

export function groupCurrentSubscribersByAddonKey(
  items: UserSubscriptionListItem[],
): Map<string, UserSubscriptionListItem[]> {
  const grouped = new Map<string, UserSubscriptionListItem[]>();

  for (const item of items) {
    if (!isCurrentPlanSubscriber(item)) continue;
    for (const key of currentSubscriptionAddonKeys(item.subscription)) {
      const list = grouped.get(key);
      if (list) {
        list.push(item);
      } else {
        grouped.set(key, [item]);
      }
    }
  }

  for (const list of grouped.values()) {
    sortSubscribersByStationName(list);
  }

  return grouped;
}

export function subscribersForCatalogAddon(
  grouped: Map<string, UserSubscriptionListItem[]>,
  matchKeys: string[],
): UserSubscriptionListItem[] {
  const seen = new Set<string>();
  const rows: UserSubscriptionListItem[] = [];

  for (const key of matchKeys) {
    for (const item of grouped.get(key) ?? []) {
      if (seen.has(item.businessId)) continue;
      seen.add(item.businessId);
      rows.push(item);
    }
  }

  sortSubscribersByStationName(rows);
  return rows;
}

function addNormalizedOfferCodeKeys(keys: Set<string>, raw: string | undefined): void {
  const code = raw?.trim();
  if (!code) return;
  keys.add(code.toUpperCase());
  keys.add(`voucher_${code.toLowerCase()}`);
  keys.add(`affiliate_${code.toLowerCase()}`);
}

export function catalogOfferMatchKeys(
  documentId: string,
  data: Record<string, unknown>,
): string[] {
  const keys = new Set<string>();
  const id = documentId.trim().toLowerCase();
  if (id) keys.add(id);
  addNormalizedOfferCodeKeys(keys, String(data.code || ""));
  return [...keys];
}

export function currentSubscriptionOfferKeys(
  subscription: OwnerSubscription,
): string[] {
  const keys = new Set<string>();
  addNormalizedOfferCodeKeys(keys, subscription.voucherCode);
  addNormalizedOfferCodeKeys(keys, subscription.affiliateCode);
  const affiliateDocId = subscription.affiliateDocId?.trim();
  if (affiliateDocId) keys.add(affiliateDocId.toLowerCase());
  return [...keys];
}

export function groupCurrentSubscribersByOfferKey(
  items: UserSubscriptionListItem[],
): Map<string, UserSubscriptionListItem[]> {
  const grouped = new Map<string, UserSubscriptionListItem[]>();

  for (const item of items) {
    if (!isCurrentPlanSubscriber(item)) continue;
    for (const key of currentSubscriptionOfferKeys(item.subscription)) {
      const list = grouped.get(key);
      if (list) {
        list.push(item);
      } else {
        grouped.set(key, [item]);
      }
    }
  }

  for (const list of grouped.values()) {
    sortSubscribersByStationName(list);
  }

  return grouped;
}

export function subscribersForCatalogOffer(
  grouped: Map<string, UserSubscriptionListItem[]>,
  catalogDoc: { documentId: string; data: Record<string, unknown> },
  catalogDocuments: Array<{ documentId: string; data: Record<string, unknown> }> = [],
): UserSubscriptionListItem[] {
  const keys = catalogOfferMatchKeys(catalogDoc.documentId, catalogDoc.data);
  if (String(catalogDoc.data.kind || "") === "affiliate") {
    for (const other of catalogDocuments) {
      const linked = String(other.data.affiliateDocId || "").trim();
      if (linked && linked === catalogDoc.documentId) {
        keys.push(...catalogOfferMatchKeys(other.documentId, other.data));
      }
    }
  }
  return subscribersForCatalogAddon(grouped, keys);
}

export function trialStartedAt(subscription: OwnerSubscription): string | undefined {
  return subscription.activatesAt || subscription.activatedAt || subscription.createdAt;
}

/** Live trial stations, soonest to expire first. Ended trials are omitted. */
export function currentTrialSubscribers(
  items: UserSubscriptionListItem[],
  now = new Date(),
): UserSubscriptionListItem[] {
  return items
    .filter((item) => {
      if (!isCurrentPlanSubscriber(item)) return false;
      if (!isLiveTrialSubscription(item.subscription)) return false;
      const daysLeft = trialDaysRemainingCount(item.subscription.expiresAt, now);
      return daysLeft === null || daysLeft >= 0;
    })
    .sort((a, b) => {
      const aDays = trialDaysRemainingCount(a.subscription.expiresAt, now);
      const bDays = trialDaysRemainingCount(b.subscription.expiresAt, now);
      if (aDays === null && bDays === null) {
        return a.businessName.localeCompare(b.businessName, undefined, {
          sensitivity: "base",
        });
      }
      if (aDays === null) return 1;
      if (bDays === null) return -1;
      if (aDays !== bDays) return aDays - bDays;
      return a.businessName.localeCompare(b.businessName, undefined, {
        sensitivity: "base",
      });
    });
}
