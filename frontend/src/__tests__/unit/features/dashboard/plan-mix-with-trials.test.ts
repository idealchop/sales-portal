import { describe, expect, it } from "vitest";
import { computePlanMixWithTrials } from "@/features/dashboard/lib/build-growth-chart-insights";
import type { ChartBusinessContext } from "@/lib/dashboard/analytics";

function biz(
  overrides: Partial<ChartBusinessContext> & { id: string },
): ChartBusinessContext {
  return {
    createdAt: "2026-09-01T00:00:00.000Z",
    healthTier: "medium",
    price: 0,
    customers: 0,
    transactionsLast30Days: 0,
    usageGoals: [],
    gettingStarted: {},
    ...overrides,
  };
}

describe("computePlanMixWithTrials", () => {
  it("splits trial plans into orange-labeled slices", () => {
    const rows = computePlanMixWithTrials([
      biz({
        id: "1",
        planName: "Starter",
        billingCycle: "monthly",
        subscriptionStatus: "active",
        price: 499,
      }),
      biz({
        id: "2",
        planName: "Starter",
        billingCycle: "trial",
        subscriptionStatus: "active",
        price: 0,
      }),
      biz({
        id: "3",
        planName: "Starter",
        billingCycle: "trial",
        subscriptionStatus: "active",
        price: 0,
      }),
      biz({
        id: "4",
        planName: "Growth",
        billingCycle: "monthly",
        subscriptionStatus: "active",
        price: 1499,
      }),
      biz({
        id: "5",
        planName: "Starter",
        billingCycle: "trial",
        subscriptionStatus: "cancelled",
        price: 0,
      }),
    ]);

    expect(rows).toEqual([
      { name: "Starter · Trial", count: 2, color: "#EA580C" },
      { name: "Starter", count: 1, color: undefined },
      { name: "Growth", count: 1, color: undefined },
    ]);
  });
});
