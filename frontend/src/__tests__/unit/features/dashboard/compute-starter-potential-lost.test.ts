import { describe, expect, it } from "vitest";
import {
  SCALE_LIST_PRICE_PHP,
  computeStarterPotentialLost,
  mostCommonPositivePrice,
  resolveStarterUpsellTarget,
} from "@/features/dashboard/lib/compute-starter-potential-lost";
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

describe("mostCommonPositivePrice", () => {
  it("picks the mode and breaks ties toward the lower price", () => {
    expect(mostCommonPositivePrice([1650, 1999, 1650, 1710, 1650])).toBe(1650);
    expect(mostCommonPositivePrice([1710, 1650])).toBe(1650);
  });
});

describe("resolveStarterUpsellTarget", () => {
  it("uses Scale list price instead of averaging live Scale invoices", () => {
    const target = resolveStarterUpsellTarget([
      biz({ id: "s1", planName: "Scale", price: 1999 }),
      biz({ id: "s2", planName: "Scale", price: 1710 }),
      biz({ id: "s3", planName: "Scale", price: 1650 }),
      biz({ id: "st", planName: "Starter", price: 0 }),
    ]);

    expect(target).toEqual({
      price: SCALE_LIST_PRICE_PHP,
      label: "Scale",
    });
    expect(target.price).toBe(1650);
  });
});

describe("computeStarterPotentialLost", () => {
  it("labels workspaces by name and prices upside at Scale list", () => {
    const summary = computeStarterPotentialLost([
      biz({ id: "scale", planName: "Scale", price: 1710 }),
      biz({
        id: "a",
        name: "Aqua Station",
        planName: "Starter",
        price: 0,
        customers: 25,
      }),
      biz({
        id: "b",
        name: "Blue Refill",
        planName: "Starter",
        price: 0,
        customers: 2,
      }),
    ]);

    expect(summary.targetPrice).toBe(1650);
    expect(summary.total).toBe(3300);
    expect(summary.upsellCount).toBe(1);
    expect(summary.rows[0]).toMatchObject({
      label: "Aqua Station",
      potentialLost: 1650,
      isUpsellReady: true,
    });
    expect(summary.rows[1].label).toBe("Blue Refill");
  });
});
