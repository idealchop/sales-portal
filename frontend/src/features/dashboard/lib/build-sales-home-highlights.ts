import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { trialDaysRemainingCount } from "@/lib/dashboard/subscription-labels";
import { filterInactiveOwners } from "@/features/dashboard/lib/sort-active-owners";
import {
  buildUserSubscriptionsList,
} from "@/features/dashboard/lib/build-user-subscriptions-list";
import { ownersForUserSubscriptions } from "@/lib/dashboard/analytics";
import type { SalesPortalRole } from "@/lib/auth-status";

export type SalesHomeHighlightArea =
  | "Subscriptions"
  | "SmartRefill"
  | "Admin";

export type SalesHomeHighlight = {
  id: string;
  area: SalesHomeHighlightArea;
  title: string;
  count: number;
  hint: string;
  href: string;
  tone: "default" | "warn" | "danger";
};

/**
 * Cross-route watch list for home. Counts of stations/people, not money.
 */
export function buildSalesHomeHighlights(
  analytics: DashboardAnalytics | null,
  role: SalesPortalRole | null,
  now: Date = new Date(),
): SalesHomeHighlight[] {
  if (!analytics) return [];
  const items: SalesHomeHighlight[] = [];
  const owners = ownersForUserSubscriptions(analytics.growthSalesMetrics);
  const subscriptions = buildUserSubscriptionsList(owners);
  const mayDropPlan = subscriptions.filter(
    (row) => row.isGrace || row.isExpiringSoon,
  ).length;
  const inactive = filterInactiveOwners(
    analytics.growthSalesMetrics.activeOwners,
    now,
  ).length;
  const stuckSetup = analytics.salesInsights.salesActions.filter(
    (row) =>
      row.actionType === "onboarding_incomplete" ||
      row.actionType === "low_engagement" ||
      row.actionType === "inactive",
  ).length;
  const newStations = analytics.newJoiners?.businesses.length ?? 0;
  const openAlerts = analytics.platformAlerts.items.filter(
    (row) => row.contactStatus !== "contacted",
  ).length;

  if (mayDropPlan > 0) {
    items.push({
      id: "plan-at-risk",
      area: "Subscriptions",
      title: "Plans ending or lapsed",
      count: mayDropPlan,
      hint: "Stations that may leave if nobody follows up.",
      href: "/webapp/smartrefill",
      tone: "warn",
    });
  }
  if (inactive > 0) {
    items.push({
      id: "inactive-owners",
      area: "SmartRefill",
      title: "Owners quiet 7+ days",
      count: inactive,
      hint: "Open SmartRefill to contact owners who stopped signing in.",
      href: "/webapp/smartrefill",
      tone: "warn",
    });
  }
  if (stuckSetup > 0) {
    items.push({
      id: "stuck-setup",
      area: "SmartRefill",
      title: "Stations stuck in setup",
      count: stuckSetup,
      hint: "Already in the app, but not using it yet.",
      href: "/webapp/smartrefill",
      tone: "warn",
    });
  }
  if (newStations > 0) {
    items.push({
      id: "new-stations",
      area: "SmartRefill",
      title: "New stations this period",
      count: newStations,
      hint: "Say hello while they are still setting up.",
      href: "/webapp/smartrefill",
      tone: "default",
    });
  }
  if ((role === "admin" || role === "manager") && openAlerts > 0) {
    items.push({
      id: "admin-alerts",
      area: "Admin",
      title: "New users and demos",
      count: openAlerts,
      hint: "Contact from Admin alerts, then mark done.",
      href: "/admin/data-management",
      tone: "warn",
    });
  }
  return items.slice(0, 5);
}

export type SalesHomeRouteShortcut = {
  id: string;
  area: string;
  title: string;
  count: number;
  hint: string;
  href: string;
  tone: "default" | "warn" | "danger";
  badge?: string;
};

export type SalesHomeNewUserBadge = {
  appId: string;
  appLabel: string;
  count: number;
  href: string;
};

const MANILA_TZ = "Asia/Manila";

/** Calendar day `YYYY-MM-DD` in Asia/Manila. */
export function manilaDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function countJoinedOnDay(
  rows: Array<{ joinedAt: string | null }> | undefined,
  dayKey: string,
): number {
  if (!rows) return 0;
  let count = 0;
  for (const row of rows) {
    if (!row.joinedAt) continue;
    const parsed = new Date(row.joinedAt);
    if (Number.isNaN(parsed.getTime())) continue;
    if (manilaDayKey(parsed) === dayKey) count += 1;
  }
  return count;
}

/**
 * Accounts created today (Asia/Manila).
 * Prefers the server total when it is still for today, so a capped joiner
 * list cannot freeze the badge. Otherwise counts `joinedAt` on the lists,
 * which drops yesterday as soon as the calendar day rolls over.
 */
function newUserCounts(
  analytics: DashboardAnalytics | null,
  now: Date,
): {
  smartrefill: number;
  salesPortal: number;
} {
  const todayKey = manilaDayKey(now);
  const joiners = analytics?.newJoiners;
  const registered = joiners?.registeredToday;
  if (registered && registered.dayKey === todayKey) {
    return {
      smartrefill: registered.smartrefill,
      salesPortal: registered.salesPortal,
    };
  }
  return {
    smartrefill: countJoinedOnDay(joiners?.platformUsers, todayKey),
    salesPortal: countJoinedOnDay(joiners?.salesReps, todayKey),
  };
}

/**
 * People who registered today, labeled by app — SmartRefill vs Sales Portal.
 * Empty when nobody registered today.
 */
export function buildSalesHomeNewUserBadges(
  analytics: DashboardAnalytics | null,
  role: SalesPortalRole | null,
  now: Date = new Date(),
): SalesHomeNewUserBadge[] {
  const counts = newUserCounts(analytics, now);
  const items: SalesHomeNewUserBadge[] = [];
  if (counts.smartrefill > 0) {
    items.push({
      appId: "smartrefill",
      appLabel: "SmartRefill",
      count: counts.smartrefill,
      href: "/webapp/smartrefill",
    });
  }
  if (counts.salesPortal > 0) {
    items.push({
      appId: "sales-portal",
      appLabel: "Sales Portal",
      count: counts.salesPortal,
      href:
        role === "manager" ?
          "/dashboard/my-team"
        : role === "admin" ?
          "/admin/permissions"
        : "/dashboard",
    });
  }
  return items;
}

/**
 * Always-on Jump-to cards with station/people counts. No prices.
 */
export function buildSalesHomeRouteShortcuts(
  analytics: DashboardAnalytics | null,
  role: SalesPortalRole | null,
  extra: { voucherProspects?: number } = {},
  now: Date = new Date(),
): SalesHomeRouteShortcut[] {
  const owners = analytics
    ? ownersForUserSubscriptions(analytics.growthSalesMetrics)
    : [];
  const subscriptions = analytics ? buildUserSubscriptionsList(owners) : [];
  const trials = subscriptions.filter((row) => row.planTier === "trial");
  const trialEnding = trials.filter((row) => {
    const days = trialDaysRemainingCount(row.subscription.expiresAt, now);
    return days !== null && days <= 3;
  }).length;
  const voucherStations = subscriptions.filter((row) => row.isVoucher).length;
  const inactive = analytics
    ? filterInactiveOwners(analytics.growthSalesMetrics.activeOwners, now).length
    : 0;
  const stations =
    owners.length || analytics?.summary.totalBusinesses || 0;
  const adminStations =
    analytics?.summary.totalBusinesses ||
    analytics?.summary.onboardedBusinesses ||
    owners.length;
  const voucherProspects = extra.voucherProspects ?? 0;
  const voucherCount = voucherStations + voucherProspects;

  const newUsers = newUserCounts(analytics, now);

  const items: SalesHomeRouteShortcut[] = [
    {
      id: "jump-trials",
      area: "Subscriptions",
      title: "Free trial roster",
      count: trials.length,
      hint:
        trialEnding > 0 ?
          `${trialEnding} ending in the next 3 days.`
        : "Who still has days left, and who needs a next step today.",
      href: "/subscriptions/trial",
      tone: trialEnding > 0 ? "danger" : "default",
    },
    {
      id: "jump-smartrefill",
      area: "Web apps",
      title: "SmartRefill stations",
      count: stations,
      hint:
        inactive > 0 ?
          `${inactive} quiet 7+ days.`
        : "See who is live, quiet, or still finishing setup.",
      href: "/webapp/smartrefill",
      tone: inactive > 0 ? "warn" : "default",
      badge:
        newUsers.smartrefill > 0 ?
          `${newUsers.smartrefill} new today · SmartRefill`
        : undefined,
    },
    {
      id: "jump-vouchers",
      area: "Subscriptions",
      title: "Vouchers & affiliates",
      count: voucherCount,
      hint:
        voucherProspects > 0 ?
          `${voucherProspects} prospects may need a code.`
        : "Give a checkout or close-the-deal code when that will help.",
      href: "/subscriptions/vouchers-affiliates",
      tone: voucherCount > 0 ? "warn" : "default",
    },
  ];

  if (role === "admin") {
    items.push({
      id: "jump-admin",
      area: "Admin",
      title: "Station records",
      count: adminStations,
      hint: "Open a live station from Admin.",
      href: "/admin/data-management",
      tone: "default",
      badge:
        newUsers.salesPortal > 0 ?
          `${newUsers.salesPortal} new today · Sales Portal`
        : newUsers.smartrefill > 0 ?
          `${newUsers.smartrefill} new today · SmartRefill`
        : undefined,
    });
  }

  return items;
}
