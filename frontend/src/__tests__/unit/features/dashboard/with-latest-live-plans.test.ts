import { describe, expect, it } from "vitest";
import { withLatestLivePlans } from "@/features/dashboard/lib/with-latest-live-plans";
import type {
  ActiveOwner,
  ChartBusinessContext,
  OwnerSubscription,
} from "@/lib/dashboard/analytics";

function biz(
  overrides: Partial<ChartBusinessContext> & { id: string },
): ChartBusinessContext {
  return {
    createdAt: null,
    healthTier: "medium",
    price: 0,
    customers: 0,
    transactionsLast30Days: 0,
    usageGoals: [],
    gettingStarted: {},
    ...overrides,
  };
}

function sub(
  overrides: Partial<OwnerSubscription> & { id: string },
): OwnerSubscription {
  return {
    planName: "Scale",
    status: "active",
    price: 1650,
    timeline: "current",
    cancelAtPeriodEnd: false,
    needsApproval: false,
    isDowngrade: false,
    isCancellation: false,
    ...overrides,
  };
}

describe("withLatestLivePlans", () => {
  it("uses newer Starter over an older Scale that is still marked active", () => {
    const owners: ActiveOwner[] = [
      {
        id: "j2o",
        businessName: "J2O WRS",
        ownerEmail: "marivic_domingo04@yahoo.com",
        customers: 261,
        transactionsLast30Days: 0,
        healthTier: "medium",
        onboardingComplete: true,
        monthlyRevenue: 1650,
        planName: "Scale",
        subscriptions: [
          sub({
            id: "old-scale",
            planName: "Scale",
            price: 1650,
            createdAt: "2026-01-01T00:00:00.000Z",
            activatedAt: "2026-01-01T00:00:00.000Z",
            timeline: "current",
          }),
          sub({
            id: "new-starter",
            planName: "Starter",
            planCode: "starter",
            price: 0,
            createdAt: "2026-08-15T00:00:00.000Z",
            activatedAt: "2026-08-15T00:00:00.000Z",
            timeline: "current",
          }),
        ],
      },
    ];

    const rows = withLatestLivePlans(
      [
        biz({
          id: "j2o",
          planName: "Scale",
          price: 1650,
          subscriptionStatus: "active",
        }),
      ],
      owners,
    );

    expect(rows[0]).toMatchObject({
      id: "j2o",
      name: "J2O WRS",
      planName: "Starter",
      price: 0,
      subscriptionStatus: "active",
    });
  });
});
