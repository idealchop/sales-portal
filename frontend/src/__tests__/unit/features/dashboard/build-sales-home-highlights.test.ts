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

  it("labels new users by app", () => {
    const analytics = normalizeDashboardAnalytics({
      newJoiners: {
        salesReps: [
          {
            id: "r1",
            displayName: "Rep",
            onboardingComplete: false,
            joinedAt: "2026-09-20T00:00:00.000Z",
          },
        ],
        businesses: [
          {
            id: "n1",
            name: "New Fill",
            onboardingComplete: false,
            joinedAt: "2026-09-20T00:00:00.000Z",
          },
        ],
        platformUsers: [
          {
            id: "u1",
            role: "owner",
            joinedAt: "2026-09-20T00:00:00.000Z",
          },
        ],
      },
    });

    const badges = buildSalesHomeNewUserBadges(analytics, "admin");
    expect(badges.map((row) => row.appLabel)).toEqual([
      "SmartRefill",
      "Sales Portal",
    ]);
    expect(badges.find((row) => row.appId === "smartrefill")?.count).toBe(2);
    expect(badges.find((row) => row.appId === "sales-portal")?.count).toBe(1);
  });
});
