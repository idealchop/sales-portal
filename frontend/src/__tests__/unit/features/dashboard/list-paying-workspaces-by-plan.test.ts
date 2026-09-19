import { describe, expect, it } from "vitest";
import { listPayingWorkspacesByPlan } from "@/features/dashboard/lib/build-growth-chart-insights";
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

describe("listPayingWorkspacesByPlan", () => {
  it("lists each paying Scale/Grow/Starter workspace by name", () => {
    const groups = listPayingWorkspacesByPlan([
      biz({
        id: "1",
        name: "North Scale",
        ownerEmail: "north@example.com",
        planName: "Scale",
        price: 1650,
      }),
      biz({
        id: "2",
        name: "South Scale",
        planName: "Scale",
        price: 1999,
      }),
      biz({
        id: "3",
        name: "Grow Co",
        ownerEmail: "grow@example.com",
        planName: "Grow",
        price: 950,
      }),
      biz({
        id: "5",
        name: "Paid Starter",
        planName: "Starter",
        planCode: "starter",
        price: 399,
        subscriptionStatus: "active",
      }),
      biz({
        id: "4",
        name: "Free station",
        planName: "Free",
        planCode: "free",
        price: 0,
      }),
    ]);

    expect(groups).toHaveLength(3);
    expect(groups[0]).toMatchObject({
      plan: "Scale",
      mrr: 3649,
    });
    expect(groups[0].workspaces.map((ws) => ws.label)).toEqual([
      "South Scale",
      "North Scale",
    ]);
    expect(groups[1].workspaces).toEqual([
      expect.objectContaining({
        label: "Grow Co",
        ownerEmail: "grow@example.com",
        price: 950,
      }),
    ]);
    expect(groups[2]).toMatchObject({
      plan: "Starter",
      mrr: 399,
    });
  });
});
