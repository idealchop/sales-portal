import { describe, expect, it } from "vitest";
import type { BusinessSnapshot } from "../../../services/compute-sales-insights";
import type { WorkspaceBehaviorProfile } from "../../../services/compute-workspace-behavior";
import {
  aiInsightsToBreakdownRows,
  buildFallbackInsights,
} from "../../../services/generate-ai-sales-insights";

function profile(
  overrides: Partial<WorkspaceBehaviorProfile> = {},
): WorkspaceBehaviorProfile {
  const snapshot: BusinessSnapshot = {
    id: "biz-1",
    name: "High Risk Station",
    ownerId: "owner-1",
    onboardingComplete: true,
    price: 1650,
    customers: 20,
    transactionsLast30Days: 0,
    gettingStartedCompleted: 2,
    paymentStatus: "pending_verification",
    ...overrides.snapshot,
  };

  return {
    snapshot,
    ownerInactive30d: true,
    daysSinceOwnerLogin: 45,
    healthTier: "low",
    churnRiskScore: 55,
    growthScore: 10,
    churnSignals: ["Payment pending"],
    growthSignals: [],
    ...overrides,
  };
}

describe("generateAiSalesInsights fallback", () => {
  it("builds rule-based priority actions when AI is unavailable", () => {
    const insights = buildFallbackInsights([
      profile(),
      profile({
        snapshot: {
          id: "biz-2",
          name: "Growth Station",
          paymentStatus: "verified",
          planName: "Starter",
          planCode: "starter",
          customers: 60,
          transactionsLast30Days: 25,
          gettingStartedCompleted: 7,
          price: 550,
        },
        churnRiskScore: 5,
        growthScore: 40,
        churnSignals: [],
        growthSignals: ["Starter upsell"],
        ownerInactive30d: false,
      }),
    ]);

    expect(insights.aiEnabled).toBe(false);
    expect(insights.revenueChurnRisk.length).toBeGreaterThan(0);
    expect(insights.growthOpportunities.length).toBeGreaterThan(0);
    expect(insights.priorityActions.length).toBeGreaterThan(0);

    const rows = aiInsightsToBreakdownRows(insights);
    expect(rows.priorityActions[0].label).toBeTruthy();
    expect(rows.priorityActions[0].value).toMatch(/payment|Call/i);
  });

  it("returns empty-state rows when no accounts are flagged", () => {
    const rows = aiInsightsToBreakdownRows(
      buildFallbackInsights([
        profile({
          churnRiskScore: 0,
          growthScore: 0,
          churnSignals: [],
          growthSignals: [],
          ownerInactive30d: false,
          snapshot: {
            id: "healthy",
            name: "Healthy Station",
            paymentStatus: "verified",
            customers: 5,
            transactionsLast30Days: 10,
            gettingStartedCompleted: 8,
          },
        }),
      ]),
    );

    expect(rows.revenueChurnRisk[0].label).toBe("Churn risk");
    expect(rows.growthOpportunities[0].label).toBe("Growth");
  });
});
