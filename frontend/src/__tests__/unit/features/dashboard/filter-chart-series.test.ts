import { describe, expect, it } from "vitest";
import { filterBusinessesInRange } from "@/features/dashboard/lib/filter-chart-series";
import type { ChartBusinessContext } from "@/lib/dashboard/analytics";

function biz(
  overrides: Partial<ChartBusinessContext> & Pick<ChartBusinessContext, "id">,
): ChartBusinessContext {
  return {
    createdAt: "2026-07-01T00:00:00.000Z",
    healthTier: "high",
    planName: "Starter",
    planCode: "starter",
    price: 999,
    customers: 1,
    transactionsLast30Days: 1,
    usageGoals: [],
    gettingStarted: {},
    ...overrides,
  };
}

describe("filterBusinessesInRange", () => {
  const range = {
    start: new Date("2026-07-01T00:00:00.000Z"),
    end: new Date("2026-07-31T23:59:59.999Z"),
  };

  it("excludes authAccountTag=test businesses", () => {
    const rows = filterBusinessesInRange(
      [
        biz({ id: "live" }),
        biz({ id: "test", authAccountTag: "test" }),
      ],
      range,
    );
    expect(rows.map((row) => row.id)).toEqual(["live"]);
  });
});
