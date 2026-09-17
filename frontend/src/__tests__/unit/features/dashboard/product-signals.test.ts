import { describe, expect, it } from "vitest";
import {
  computeSetupCompletion,
  computeUserRetention,
  countGettingStartedSteps,
} from "@/features/dashboard/lib/product-signals";
import type { ChartBusinessContext } from "@/lib/dashboard/analytics";

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

describe("product signals", () => {
  it("counts completed getting-started steps", () => {
    expect(
      countGettingStartedSteps({
        addCustomer: true,
        addInventory: true,
        addDelivery: false,
      }),
    ).toBe(2);
  });

  it("uses setup steps instead of a near-always-true onboarding flag", () => {
    const result = computeSetupCompletion([
      biz({
        id: "1",
        gettingStarted: { addCustomer: true, addInventory: true, addDelivery: true },
      }),
      biz({
        id: "2",
        gettingStarted: { addCustomer: true },
      }),
      biz({ id: "3", gettingStarted: {} }),
    ]);

    expect(result).toEqual({ completed: 1, total: 3, percent: 33 });
  });

  it("computes 30d user retention from active logins", () => {
    expect(
      computeUserRetention({
        smartRefillUsers: 100,
        onboardedBusinesses: 50,
        totalBusinesses: 51,
        totalCustomers: 1000,
        activeLoginUsers: 42,
        loginSessionsLast30Days: 300,
        topDevice: "—",
        topBrowser: "—",
        transactionsLast30Days: 0,
        refillVolumeLast30Days: 0,
        totalTransactions: 0,
        transactionBreakdown: { walkIn: 0, directSale: 0, orders: 0 },
        customerBreakdown: { active: 0, deactivated: 0 },
        userRoleCounts: { owners: 0, admins: 0, riders: 0 },
        virtualStaffCounts: { admins: 0, riders: 0 },
        businessTierCounts: { scale: 0, grow: 0, starter: 0, free: 0 },
        totalInventory: 0,
        inventoryBreakdown: {
          generalStock: 0,
          kit: 0,
          container: { shell: 0, round: 0, slim: 0 },
        },
      }),
    ).toEqual({ percent: 42, activeUsers: 42, totalUsers: 100 });
  });
});
