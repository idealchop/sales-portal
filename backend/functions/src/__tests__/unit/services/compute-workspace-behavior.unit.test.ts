import { describe, expect, it } from "vitest";
import type { BusinessSnapshot } from "../../../services/compute-sales-insights";
import {
  buildWorkspaceBehaviorProfiles,
  isBehavioralReengagementProfile,
  isChurnRiskProfile,
  isGrowthOpportunityProfile,
} from "../../../services/compute-workspace-behavior";

function snapshot(overrides: Partial<BusinessSnapshot> = {}): BusinessSnapshot {
  return {
    id: "biz-1",
    name: "Test Station",
    ownerId: "owner-1",
    onboardingComplete: true,
    price: 550,
    customers: 10,
    transactionsLast30Days: 5,
    gettingStartedCompleted: 6,
    ...overrides,
  };
}

function requireProfile<T extends { snapshot: { id: string } }>(
  profiles: T[],
  id: string,
): T {
  const profile = profiles.find((p) => p.snapshot.id === id);
  expect(profile).toBeDefined();
  if (!profile) {
    throw new Error(`Expected workspace profile "${id}"`);
  }
  return profile;
}

describe("computeWorkspaceBehavior", () => {
  it("flags payment pending and usage stall as churn risk", () => {
    const profiles = buildWorkspaceBehaviorProfiles({
      businesses: [
        snapshot({
          id: "pending",
          paymentStatus: "pending_verification",
        }),
        snapshot({
          id: "stalled",
          customers: 12,
          transactionsLast30Days: 0,
        }),
      ],
      ownerLastActive: new Map([["owner-1", "2026-06-10"]]),
      activeWindowStartKey: "2026-05-13",
      todayKey: "2026-06-12",
      soloOwnerBusinessIds: new Set(),
    });

    const pending = requireProfile(profiles, "pending");
    const stalled = requireProfile(profiles, "stalled");

    expect(isChurnRiskProfile(pending)).toBe(true);
    expect(pending.churnSignals).toContain("Payment pending");
    expect(isChurnRiskProfile(stalled)).toBe(true);
    expect(stalled.churnSignals).toContain("0 tx in 30d");
  });

  it("flags upsell and solo-owner workspaces as growth opportunities", () => {
    const profiles = buildWorkspaceBehaviorProfiles({
      businesses: [
        snapshot({
          id: "upsell",
          planName: "Starter",
          planCode: "starter",
          customers: 80,
          transactionsLast30Days: 40,
          price: 550,
        }),
        snapshot({
          id: "solo",
          name: "Solo Station",
        }),
      ],
      ownerLastActive: new Map([["owner-1", "2026-06-11"]]),
      activeWindowStartKey: "2026-05-13",
      todayKey: "2026-06-12",
      soloOwnerBusinessIds: new Set(["solo"]),
    });

    const upsell = requireProfile(profiles, "upsell");
    const solo = requireProfile(profiles, "solo");

    expect(isGrowthOpportunityProfile(upsell)).toBe(true);
    expect(upsell.growthSignals.some((s) => s.includes("upsell"))).toBe(true);
    expect(isGrowthOpportunityProfile(solo)).toBe(true);
    expect(solo.growthSignals).toContain("Solo owner — add seats");
  });

  it("flags inactive owners for behavioral re-engagement", () => {
    const profiles = buildWorkspaceBehaviorProfiles({
      businesses: [
        snapshot({
          id: "inactive-owner",
          gettingStartedCompleted: 2,
        }),
      ],
      ownerLastActive: new Map(),
      activeWindowStartKey: "2026-05-13",
      todayKey: "2026-06-12",
      soloOwnerBusinessIds: new Set(),
    });

    const profile = profiles[0];

    expect(profile.ownerInactive30d).toBe(true);
    expect(isBehavioralReengagementProfile(profile)).toBe(true);
  });
});
