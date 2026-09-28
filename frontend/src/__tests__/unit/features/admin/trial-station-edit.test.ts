import { describe, expect, it } from "vitest";
import {
  applyTrialStationEdit,
  manilaDateInputValue,
  trialEndsAtFromManilaDate,
} from "@/features/admin/lib/trial-station-edit";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

describe("trial station edit", () => {
  it("stores the end date as the close of that Manila day", () => {
    expect(trialEndsAtFromManilaDate("2026-10-15")).toBe("2026-10-15T15:59:59.999Z");
    expect(manilaDateInputValue("2026-10-15T15:59:59.999Z")).toBe("2026-10-15");
  });

  it("updates the station plan and expiry in the analytics roster", () => {
    const analytics = {
      growthSalesMetrics: {
        activeOwners: [],
        subscriptionOwners: [
          {
            id: "biz-1",
            businessName: "Alqua Stream",
            customers: 0,
            transactionsLast30Days: 0,
            healthTier: "low",
            onboardingComplete: true,
            monthlyRevenue: 0,
            planName: "Scale",
            subscriptions: [
              {
                id: "sub-1",
                planName: "Scale",
                planCode: "scale",
                status: "active",
                billingCycle: "trial",
                price: 0,
                timeline: "current",
                expiresAt: "2026-10-01T00:00:00.000Z",
                cancelAtPeriodEnd: false,
                needsApproval: false,
                isDowngrade: false,
                isCancellation: false,
              },
            ],
          },
        ],
      },
    } as unknown as DashboardAnalytics;

    const next = applyTrialStationEdit(analytics, {
      businessId: "biz-1",
      subscriptionId: "sub-1",
      planCode: "grow",
      planName: "Grow",
      expiresAt: "2026-10-20T15:59:59.999Z",
    });

    const owner = next.growthSalesMetrics.subscriptionOwners?.[0];
    expect(owner?.planName).toBe("Grow");
    expect(owner?.subscriptions?.[0]?.planCode).toBe("grow");
    expect(owner?.subscriptions?.[0]?.expiresAt).toBe("2026-10-20T15:59:59.999Z");
    expect(owner?.subscriptions?.[0]?.billingCycle).toBe("monthly");
  });

  it("records a free-trial overwrite as granted and not paid", () => {
    const analytics = {
      growthSalesMetrics: {
        activeOwners: [],
        subscriptionOwners: [
          {
            id: "biz-1",
            businessName: "Alqua Stream",
            customers: 0,
            transactionsLast30Days: 0,
            healthTier: "low",
            onboardingComplete: true,
            monthlyRevenue: 1650,
            planName: "Scale",
            subscriptions: [
              {
                id: "sub-1",
                planName: "Scale",
                planCode: "scale",
                status: "active",
                billingCycle: "trial",
                price: 0,
                timeline: "current",
                expiresAt: "2026-10-01T00:00:00.000Z",
                cancelAtPeriodEnd: false,
                needsApproval: false,
                isDowngrade: false,
                isCancellation: false,
              },
            ],
          },
        ],
      },
    } as unknown as DashboardAnalytics;

    const next = applyTrialStationEdit(analytics, {
      businessId: "biz-1",
      subscriptionId: "sub-1",
      planCode: "scale",
      planName: "Scale",
      expiresAt: "2026-10-13T15:59:59.999Z",
      billingCycle: "monthly",
      price: 0,
      overridePayment: "granted",
    });

    const owner = next.growthSalesMetrics.subscriptionOwners?.[0];
    const subscription = owner?.subscriptions?.[0];
    expect(subscription?.overridePayment).toBe("granted");
    expect(subscription?.changeType).toBe("override");
    expect(subscription?.price).toBe(0);
    expect(owner?.monthlyRevenue).toBe(0);
  });
});
