import { geminiGenerateJson } from "./ai/gemini-client";
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

type AiResponse = {
  revenueChurnRiskSummary?: string;
  growthOpportunitySummary?: string;
  behavioralReengagementSummary?: string;
  priorityActionsSummary?: string;
  revenueChurnRisk?: AiSalesAccountInsight[];
  growthOpportunities?: AiSalesAccountInsight[];
  behavioralReengagement?: AiSalesAccountInsight[];
  priorityActions?: AiSalesAccountInsight[];
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
  const fallback = buildFallbackInsights(profiles);
  if (profiles.length === 0) return fallback;

  const compactPayload = profiles
    .map((profile) => ({
      businessName: profile.snapshot.name,
      plan: profile.snapshot.planName,
      customers: profile.snapshot.customers,
      tx30d: profile.snapshot.transactionsLast30Days,
      onboardingComplete: profile.snapshot.onboardingComplete,
      gettingStartedSteps: profile.snapshot.gettingStartedCompleted,
      paymentStatus: profile.snapshot.paymentStatus,
      healthTier: profile.healthTier,
      ownerInactive30d: profile.ownerInactive30d,
      daysSinceOwnerLogin: profile.daysSinceOwnerLogin,
      monthlyRevenue: profile.snapshot.price,
      churnRiskScore: profile.churnRiskScore,
      growthScore: profile.growthScore,
      churnSignals: profile.churnSignals,
      growthSignals: profile.growthSignals,
    }))
    .sort(
      (a, b) =>
        Math.max(b.churnRiskScore, b.growthScore) -
        Math.max(a.churnRiskScore, a.growthScore),
    )
    .slice(0, 18);

  const aiResult = await geminiGenerateJson<AiResponse>({
    system: `SmartRefill sales analyst. JSON only.
Keep copy short: summaries under 12 words, actions under 6 words, reasons under 8 words.
Use numbers where possible.`,
    user: JSON.stringify({
      task: "Rank sales actions from workspace behavior",
      workspaces: compactPayload,
      outputSchema: {
        revenueChurnRiskSummary: "short string with counts",
        growthOpportunitySummary: "short string with counts",
        behavioralReengagementSummary: "short string with counts",
        priorityActionsSummary: "short string with action count",
        revenueChurnRisk: [
          {
            businessName: "string",
            recommendedAction: "string",
            reason: "string",
            priority: "high|medium|low",
          },
        ],
        growthOpportunities: "same shape, max 5",
        behavioralReengagement: "same shape, max 5",
        priorityActions: "same shape, max 5",
      },
    }),
    fallback: {},
    maxOutputTokens: 2048,
  });

  if (!aiResult.priorityActions?.length && !aiResult.revenueChurnRisk?.length) {
    return fallback;
  }

  return {
    revenueChurnRiskSummary:
      aiResult.revenueChurnRiskSummary || fallback.revenueChurnRiskSummary,
    growthOpportunitySummary:
      aiResult.growthOpportunitySummary || fallback.growthOpportunitySummary,
    behavioralReengagementSummary:
      aiResult.behavioralReengagementSummary ||
      fallback.behavioralReengagementSummary,
    priorityActionsSummary:
      aiResult.priorityActionsSummary || fallback.priorityActionsSummary,
    revenueChurnRisk: aiResult.revenueChurnRisk?.slice(0, 6) || fallback.revenueChurnRisk,
    growthOpportunities:
      aiResult.growthOpportunities?.slice(0, 6) || fallback.growthOpportunities,
    behavioralReengagement:
      aiResult.behavioralReengagement?.slice(0, 6) ||
      fallback.behavioralReengagement,
    priorityActions: aiResult.priorityActions?.slice(0, 6) || fallback.priorityActions,
    aiEnabled: true,
  };
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
