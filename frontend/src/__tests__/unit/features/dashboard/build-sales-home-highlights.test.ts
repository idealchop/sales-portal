import { describe, expect, it } from "vitest";
import { normalizeDashboardAnalytics } from "@/lib/dashboard/analytics";
import { buildSalesHomeHighlights, buildSalesHomeNewUserBadges, buildSalesHomeRouteShortcuts } from "@/features/dashboard/lib/build-sales-home-highlights";

describe("buildSalesHomeHighlights", () => {
  it("surfaces SmartRefill quiet owners and Admin alerts without money fields", () => {
    const analytics = normalizeDashboardAnalytics({
      growthSalesMetrics: {
        growth: [],
        sales: [],
        activeOwners: [
          {
            id: "b1",
            businessName: "Quiet WRS",
            customers: 0,
            transactionsLast30Days: 0,
            healthTier: "low",
            onboardingComplete: true,
            monthlyRevenue: 0,
            lastActiveDay: "2026-09-01",
          },
        ],
      },
      newJoiners: {
        salesReps: [],
        businesses: [
          {
            id: "n1",
            name: "New Fill",
            onboardingComplete: false,
            joinedAt: null,
          },
        ],
        platformUsers: [],
      },
      platformAlerts: {
        items: [
          {
            id: "a1",
            kind: "demo_inquiry",
            title: "Demo",
            subtitle: "New inquiry",
            occurredAt: null,
            contactStatus: "need_contact",
          },
        ],
        counts: {
          demo_inquiry: 1,
          new_user_registration: 0,
          subscription_change: 0,
          subscription_expiring_soon: 0,
          subscription_grace_period: 0,
        },
      },
    });

    const sales = buildSalesHomeHighlights(analytics, "sales", new Date("2026-09-21"));
    expect(sales.map((row) => row.id)).toEqual(
      expect.arrayContaining(["inactive-owners", "new-stations"]),
    );
    expect(sales.some((row) => row.id === "admin-alerts")).toBe(false);

    const admin = buildSalesHomeHighlights(analytics, "admin", new Date("2026-09-21"));
    expect(admin.some((row) => row.id === "admin-alerts")).toBe(true);
    expect(admin).toHaveLength(3);
    expect(admin.every((row) => row.id !== "trials-ending")).toBe(true);
    expect(JSON.stringify(admin)).not.toMatch(/₱|commission|MRR|pipelineValue/i);
  });

  it("puts station counts on Jump to a list cards", () => {
    const analytics = normalizeDashboardAnalytics({
      summary: { totalBusinesses: 12, onboardedBusinesses: 10 },
      growthSalesMetrics: {
        growth: [],
        sales: [],
        activeOwners: [
          {
            id: "b1",
            businessName: "Quiet WRS",
            customers: 0,
            transactionsLast30Days: 0,
            healthTier: "low",
            onboardingComplete: true,
            monthlyRevenue: 0,
            lastActiveDay: "2026-09-01",
            subscriptions: [
              {
                id: "t1",
                planName: "Grow",
                billingCycle: "trial",
                status: "active",
                price: 0,
                timeline: "current",
                expiresAt: "2026-09-22T00:00:00.000Z",
                cancelAtPeriodEnd: false,
                needsApproval: false,
                isDowngrade: false,
                isCancellation: false,
              },
            ],
          },
        ],
        subscriptionOwners: [
          {
            id: "b1",
            businessName: "Quiet WRS",
            customers: 0,
            transactionsLast30Days: 0,
            healthTier: "low",
            onboardingComplete: true,
            monthlyRevenue: 0,
            lastActiveDay: "2026-09-01",
            subscriptions: [
              {
                id: "t1",
                planName: "Grow",
                billingCycle: "trial",
                status: "active",
                price: 0,
                timeline: "current",
                expiresAt: "2026-09-22T00:00:00.000Z",
                cancelAtPeriodEnd: false,
                needsApproval: false,
                isDowngrade: false,
                isCancellation: false,
              },
            ],
          },
        ],
      },
    });

    const sales = buildSalesHomeRouteShortcuts(
      analytics,
      "sales",
      { voucherProspects: 4 },
      new Date("2026-09-21"),
    );
    const trials = sales.find((row) => row.id === "jump-trials");
    const stations = sales.find((row) => row.id === "jump-smartrefill");
    const vouchers = sales.find((row) => row.id === "jump-vouchers");

    expect(trials?.count).toBe(1);
    expect(stations?.count).toBe(1);
    expect(vouchers?.count).toBe(4);
    expect(sales.some((row) => row.id === "jump-admin")).toBe(false);

    const admin = buildSalesHomeRouteShortcuts(
      analytics,
      "admin",
      {},
      new Date("2026-09-21"),
    );
    expect(admin.find((row) => row.id === "jump-admin")?.count).toBe(12);
    expect(admin.find((row) => row.id === "jump-smartrefill")?.badge).toBeUndefined();
    expect(JSON.stringify(admin)).not.toMatch(/₱|commission|MRR|pipelineValue/i);
  });

  it("labels new users by app for the Manila day only", () => {
    const now = new Date("2026-09-20T04:00:00+08:00");
    const analytics = normalizeDashboardAnalytics({
      newJoiners: {
        salesReps: [
          {
            id: "r1",
            displayName: "Rep",
            onboardingComplete: false,
            joinedAt: "2026-09-19T18:00:00.000Z",
          },
          {
            id: "r-old",
            displayName: "Old",
            onboardingComplete: true,
            joinedAt: "2026-09-18T02:00:00.000Z",
          },
        ],
        businesses: [
          {
            id: "n1",
            name: "New Fill",
            onboardingComplete: false,
            joinedAt: "2026-09-19T18:00:00.000Z",
          },
        ],
        platformUsers: [
          {
            id: "u1",
            role: "owner",
            joinedAt: "2026-09-19T16:30:00.000Z",
          },
          {
            id: "u-old",
            role: "owner",
            joinedAt: "2026-09-01T00:00:00.000Z",
          },
        ],
      },
    });

    const badges = buildSalesHomeNewUserBadges(analytics, "admin", now);
    expect(badges.map((row) => row.appLabel)).toEqual([
      "SmartRefill",
      "Sales Portal",
    ]);
    expect(badges.find((row) => row.appId === "smartrefill")?.count).toBe(1);
    expect(badges.find((row) => row.appId === "sales-portal")?.count).toBe(1);

    const shortcuts = buildSalesHomeRouteShortcuts(analytics, "admin", {}, now);
    expect(shortcuts.find((row) => row.id === "jump-smartrefill")?.badge).toBe(
      "1 new today · SmartRefill",
    );
    expect(shortcuts.find((row) => row.id === "jump-admin")?.badge).toBe(
      "1 new today · Sales Portal",
    );
  });

  it("uses the server today total when that day is still today", () => {
    const now = new Date("2026-10-19T12:00:00+08:00");
    const analytics = normalizeDashboardAnalytics({
      newJoiners: {
        salesReps: [],
        businesses: [],
        platformUsers: [],
        registeredToday: {
          dayKey: "2026-10-19",
          smartrefill: 20,
          salesPortal: 0,
        },
      },
    });

    const badges = buildSalesHomeNewUserBadges(analytics, "admin", now);
    expect(badges).toEqual([
      expect.objectContaining({ appId: "smartrefill", count: 20 }),
    ]);
  });

  it("hides badges when the stored day is stale and nobody joined today", () => {
    const now = new Date("2026-10-19T12:00:00+08:00");
    const analytics = normalizeDashboardAnalytics({
      newJoiners: {
        salesReps: [
          {
            id: "r1",
            displayName: "Rep",
            onboardingComplete: true,
            joinedAt: "2026-10-18T02:00:00.000Z",
          },
        ],
        businesses: [],
        platformUsers: [
          {
            id: "u1",
            role: "owner",
            joinedAt: "2026-10-18T02:00:00.000Z",
          },
        ],
        registeredToday: {
          dayKey: "2026-10-18",
          smartrefill: 24,
          salesPortal: 6,
        },
      },
    });

    expect(buildSalesHomeNewUserBadges(analytics, "admin", now)).toEqual([]);
    const shortcuts = buildSalesHomeRouteShortcuts(analytics, "admin", {}, now);
    expect(
      shortcuts.find((row) => row.id === "jump-smartrefill")?.badge,
    ).toBeUndefined();
    expect(
      shortcuts.find((row) => row.id === "jump-admin")?.badge,
    ).toBeUndefined();
  });
});
