import { describe, expect, it } from "vitest";
import {
  filterInactiveOwners,
  inactiveOwnersForList,
  sortInactiveOwners,
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

describe("inactive owners list", () => {
  const now = new Date("2026-07-23T12:00:00.000Z");

  it("keeps only owners with no login in 7+ days", () => {
    const rows = filterInactiveOwners(
      [
        owner("recent", { lastActiveDay: "2026-07-20" }),
        owner("stale", { lastActiveDay: "2026-07-10" }),
        owner("missing"),
      ],
      now,
    );

    expect(rows.map((row) => row.id).sort()).toEqual(["missing", "stale"]);
  });

  it("orders pending first, then longest idle", () => {
    const sorted = sortInactiveOwners([
      owner("newer-idle", {
        lastActiveDay: "2026-07-10",
        healthTier: "high",
      }),
      owner("older-idle", {
        lastActiveDay: "2026-06-01",
        healthTier: "medium",
      }),
      owner("pending-idle", {
        lastActiveDay: "2026-07-01",
        pendingApprovals: 1,
        healthTier: "high",
      }),
    ]);

    expect(sorted.map((row) => row.id)).toEqual([
      "pending-idle",
      "older-idle",
      "newer-idle",
    ]);
  });

  it("limits the inactive list to five owners", () => {
    const rows = inactiveOwnersForList(
      Array.from({ length: 8 }, (_, index) =>
        owner(`owner-${index}`, {
          healthTier: "high",
          lastActiveDay: "2026-06-01",
        }),
      ),
      5,
      now,
    );

    expect(rows).toHaveLength(5);
  });
});
