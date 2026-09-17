import { describe, expect, it } from "vitest";
import { withWorkspaceNames } from "@/features/dashboard/lib/with-workspace-names";
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
    planName: "Starter",
    ...overrides,
  };
}

describe("withWorkspaceNames", () => {
  it("fills missing names and emails from location / recent lists", () => {
    const rows = withWorkspaceNames(
      [
        biz({ id: "a" }),
        biz({ id: "b", name: "Already Named" }),
        biz({ id: "c" }),
      ],
      {
        businessLocations: [
          {
            id: "a",
            name: "Aqua Station",
            ownerEmail: "aqua@example.com",
            lat: 0,
            lng: 0,
            onboardingComplete: true,
          },
        ],
        recentBusinesses: [
          {
            id: "c",
            name: "Cool Refill",
            ownerEmail: "cool@example.com",
            createdAt: null,
            onboardingComplete: true,
          },
        ],
        topBusinessesByCustomers: [],
      },
    );

    expect(rows[0]).toMatchObject({
      id: "a",
      name: "Aqua Station",
      ownerEmail: "aqua@example.com",
    });
    expect(rows[1].name).toBe("Already Named");
    expect(rows[2]).toMatchObject({
      id: "c",
      name: "Cool Refill",
      ownerEmail: "cool@example.com",
    });
  });
});
