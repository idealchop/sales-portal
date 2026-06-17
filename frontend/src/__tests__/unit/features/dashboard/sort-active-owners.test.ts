import { describe, expect, it } from "vitest";
import {
  activeOwnersForList,
  sortActiveOwners,
} from "@/features/dashboard/lib/sort-active-owners";
import type { ActiveOwner } from "@/lib/dashboard/analytics";

function owner(
  id: string,
  overrides: Partial<ActiveOwner> = {},
): ActiveOwner {
  return {
    id,
    businessName: id,
    customers: 0,
    transactionsLast30Days: 0,
    healthTier: "high",
    onboardingComplete: true,
    monthlyRevenue: 0,
    pendingApprovals: 0,
    ...overrides,
  };
}

describe("sortActiveOwners", () => {
  it("orders pending first, then at risk, then healthy", () => {
    const sorted = sortActiveOwners([
      owner("healthy", { healthTier: "high" }),
      owner("at-risk", { healthTier: "low" }),
      owner("pending", { healthTier: "high", pendingApprovals: 1 }),
      owner("growing", { healthTier: "medium" }),
    ]);

    expect(sorted.map((row) => row.id)).toEqual([
      "pending",
      "at-risk",
      "growing",
      "healthy",
    ]);
  });

  it("limits the list to five owners", () => {
    const rows = activeOwnersForList(
      Array.from({ length: 8 }, (_, index) =>
        owner(`owner-${index}`, { healthTier: "high" }),
      ),
    );

    expect(rows).toHaveLength(5);
  });
});
