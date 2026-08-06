import type { WorkspaceBehaviorProfile } from "./compute-workspace-behavior";

export type AiSalesAccountInsight = {
  businessName: string;
  recommendedAction: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

export type AiSalesInsightsResult = {
  revenueChurnRiskSummary: string;
  growthOpportunitySummary: string;
  behavioralReengagementSummary: string;
  priorityActionsSummary: string;
  revenueChurnRisk: AiSalesAccountInsight[];
  growthOpportunities: AiSalesAccountInsight[];
  behavioralReengagement: AiSalesAccountInsight[];
  priorityActions: AiSalesAccountInsight[];
  aiEnabled: boolean;
};

function buildFallbackInsights(
  profiles: WorkspaceBehaviorProfile[],
): AiSalesInsightsResult {
  const churn = profiles
    .filter((p) => p.churnRiskScore >= 35)
    .sort((a, b) => b.churnRiskScore - a.churnRiskScore)
    .slice(0, 6);
  const growth = profiles
    .filter((p) => p.growthScore >= 30)
    .sort((a, b) => b.growthScore - a.growthScore)
    .slice(0, 6);
  const behavior = profiles
    .filter(
      (p) =>
        p.ownerInactive30d ||
        (p.snapshot.onboardingComplete && p.snapshot.gettingStartedCompleted < 3),
    )
    .slice(0, 6);

  const toInsight = (
    profile: WorkspaceBehaviorProfile,
    action: string,
    signals: string[],
    priority: AiSalesAccountInsight["priority"],
  ): AiSalesAccountInsight => ({
    businessName: profile.snapshot.name,
    recommendedAction: action,
    reason: signals.slice(0, 2).join(" · ") || "Flagged",
    priority,
  });

  const revenueChurnRisk = churn.map((p) =>
    toInsight(
      p,
      p.churnSignals.some((s) => s.includes("Payment")) ?
        "Verify payment" :
        "Call owner",
      p.churnSignals,
      p.churnRiskScore >= 50 ? "high" : "medium",
    ),
  );

  const growthOpportunities = growth.map((p) =>
    toInsight(
      p,
      p.growthSignals.some((s) => s.includes("upsell")) ?
        "Pitch Scale upgrade" :
        "Book growth call",
      p.growthSignals,
      "medium",
    ),
  );

  const behavioralReengagement = behavior.map((p) =>
    toInsight(
      p,
      p.ownerInactive30d ? "Re-engage owner" : "Finish setup",
      [...p.churnSignals, ...p.growthSignals],
      "medium",
    ),
  );

  const priorityActions = [...revenueChurnRisk, ...growthOpportunities]
    .slice(0, 5);

  return {
    revenueChurnRiskSummary: `${churn.length} at-risk · payment + usage + logins`,
    growthOpportunitySummary: `${growth.length} upsides · plan, seats, setup`,
    behavioralReengagementSummary: `${behavior.length} need touch · inactive or low setup`,
    priorityActionsSummary: `${Math.min(revenueChurnRisk.length + growthOpportunities.length, 5)} top calls`,
    revenueChurnRisk,
    growthOpportunities,
    behavioralReengagement,
    priorityActions,
    aiEnabled: false,
  };
}

export async function generateAiSalesInsights(
  profiles: WorkspaceBehaviorProfile[],
): Promise<AiSalesInsightsResult> {
  // Rules-only — Gemini dashboard path removed. Keep aiEnabled false for clients.
  return buildFallbackInsights(profiles);
}

function insightRows(
  insights: AiSalesAccountInsight[],
  emptyLabel: string,
): Array<{ label: string; value: string; detail?: string }> {
  if (insights.length === 0) {
    return [{ label: emptyLabel, value: "0", detail: "None flagged" }];
  }

  return insights.map((item) => ({
    label: item.businessName,
    value: item.recommendedAction,
    detail: `${item.priority.toUpperCase()} · ${item.reason}`,
  }));
}

export function aiInsightsToBreakdownRows(
  insights: AiSalesInsightsResult,
): {
  revenueChurnRisk: Array<{ label: string; value: string; detail?: string }>;
  growthOpportunities: Array<{ label: string; value: string; detail?: string }>;
  behavioralReengagement: Array<{ label: string; value: string; detail?: string }>;
  priorityActions: Array<{ label: string; value: string; detail?: string }>;
} {
  return {
    revenueChurnRisk: insightRows(
      insights.revenueChurnRisk,
      "Churn risk",
    ),
    growthOpportunities: insightRows(
      insights.growthOpportunities,
      "Growth",
    ),
    behavioralReengagement: insightRows(
      insights.behavioralReengagement,
      "Re-engage",
    ),
    priorityActions: insightRows(
      insights.priorityActions,
      "Priority",
    ),
  };
}

export { buildFallbackInsights };
