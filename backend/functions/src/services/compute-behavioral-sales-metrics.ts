import type {
  BreakdownGroup,
  BreakdownRow,
  DashboardMetric,
} from "./compute-growth-sales-metrics";
import {
  buildWorkspaceBehaviorProfiles,
  isBehavioralReengagementProfile,
  isChurnRiskProfile,
  isGrowthOpportunityProfile,
  type WorkspaceBehaviorProfile,
} from "./compute-workspace-behavior";
import type { BusinessSnapshot } from "./compute-sales-insights";
import { isPaymentPending, isUpgradeOpportunity } from "./compute-sales-insights-helpers";
import {
  aiInsightsToBreakdownRows,
  generateAiSalesInsights,
  type AiSalesInsightsResult,
} from "./generate-ai-sales-insights";
import type { SmartRefillUserRecord } from "./build-user-growth-breakdown";
import { SMARTREFILL_APP_ID } from "../constants/smartrefill";
import { resolveSmartRefillUserRole } from "./count-smartrefill-user-roles";

function formatPhp(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildSoloOwnerBusinessIds(
  users: SmartRefillUserRecord[],
  businesses: BusinessSnapshot[],
  businessOwnerIds: Set<string>,
): Set<string> {
  const staffByBusiness = new Map<string, number>();

  users.forEach(({ id, data }) => {
    const appAccess = data.appAccess;
    if (!Array.isArray(appAccess)) return;
    const entry = appAccess.find((row) => {
      if (!row || typeof row !== "object") return false;
      const item = row as { appId?: string; accessRevoked?: boolean; businessId?: string };
      return (
        String(item.appId || "") === SMARTREFILL_APP_ID &&
        item.accessRevoked !== true &&
        typeof item.businessId === "string"
      );
    });
    if (!entry || typeof entry !== "object") return;
    const businessId = (entry as { businessId?: string }).businessId;
    if (!businessId) return;
    const role = resolveSmartRefillUserRole(id, data, businessOwnerIds);
    if (role !== "admin" && role !== "rider") return;
    staffByBusiness.set(businessId, (staffByBusiness.get(businessId) || 0) + 1);
  });

  return new Set(
    businesses
      .filter((b) => b.onboardingComplete && !staffByBusiness.get(b.id))
      .map((b) => b.id),
  );
}

function behaviorSignalRows(
  profiles: WorkspaceBehaviorProfile[],
  kind: "churn" | "growth",
): BreakdownRow[] {
  return profiles.slice(0, 8).map((profile) => ({
    label: profile.snapshot.name,
    value: kind === "churn" ?
      `${profile.churnRiskScore} risk` :
      `${profile.growthScore} upside`,
    detail: (kind === "churn" ? profile.churnSignals : profile.growthSignals)
      .slice(0, 2)
      .join(" · "),
  }));
}

export async function computeBehavioralSalesMetrics(input: {
  businesses: BusinessSnapshot[];
  ownerLastActive: Map<string, string>;
  smartRefillUserRecords: SmartRefillUserRecord[];
  businessOwnerIds: Set<string>;
  activeWindowStartKey: string;
  todayKey: string;
}): Promise<{
  sales: DashboardMetric[];
  aiSalesInsights: AiSalesInsightsResult;
}> {
  const {
    businesses,
    ownerLastActive,
    smartRefillUserRecords,
    businessOwnerIds,
    activeWindowStartKey,
    todayKey,
  } = input;

  const soloOwnerBusinessIds = buildSoloOwnerBusinessIds(
    smartRefillUserRecords,
    businesses,
    businessOwnerIds,
  );

  const profiles = buildWorkspaceBehaviorProfiles({
    businesses,
    ownerLastActive,
    activeWindowStartKey,
    todayKey,
    soloOwnerBusinessIds,
  });

  const churnProfiles = profiles.filter(isChurnRiskProfile);
  const growthProfiles = profiles.filter(isGrowthOpportunityProfile);
  const behaviorProfiles = profiles.filter(isBehavioralReengagementProfile);

  const mrrAtRisk = churnProfiles.reduce(
    (sum, profile) => sum + (profile.snapshot.price || 0),
    0,
  );
  const growthMrrPotential = growthProfiles.reduce((sum, profile) => {
    if (isUpgradeOpportunity(profile.snapshot)) {
      return sum + Math.max(1650 - profile.snapshot.price, 0);
    }
    return sum + Math.round(profile.snapshot.price * 0.15);
  }, 0);

  const paymentBlocked = profiles.filter((p) =>
    isPaymentPending(p.snapshot.paymentStatus),
  ).length;
  const ownerInactive = profiles.filter((p) => p.ownerInactive30d).length;
  const usageStalled = profiles.filter(
    (p) => p.snapshot.customers > 0 && p.snapshot.transactionsLast30Days === 0,
  ).length;

  const upsellReady = profiles.filter((p) =>
    isUpgradeOpportunity(p.snapshot),
  ).length;
  const teamExpansion = profiles.filter((p) =>
    soloOwnerBusinessIds.has(p.snapshot.id),
  ).length;
  const adoptionLift = profiles.filter(
    (p) =>
      p.snapshot.onboardingComplete && p.snapshot.gettingStartedCompleted < 5,
  ).length;

  const aiInsights = await generateAiSalesInsights(profiles);
  const aiRows = aiInsightsToBreakdownRows(aiInsights);

  const highPriority = aiInsights.priorityActions.filter(
    (a) => a.priority === "high",
  ).length;
  const aiTag = aiInsights.aiEnabled ? "AI" : "Auto";

  const sales: DashboardMetric[] = [
    {
      id: "revenue-churn-risk",
      title: "Churn risk",
      variant: "payment",
      value: `${churnProfiles.length}`,
      subtitle: `${formatPhp(mrrAtRisk)} at risk · ${paymentBlocked} payments · ${usageStalled} stalled`,
      highlights: [
        { label: "At risk", value: formatPhp(mrrAtRisk) },
        { label: "Payments", value: `${paymentBlocked}` },
        { label: "Stalled", value: `${usageStalled}` },
      ],
      breakdown: aiRows.revenueChurnRisk,
      breakdownGroups: [
        {
          title: `${aiTag} actions`,
          rows: aiRows.revenueChurnRisk,
        },
        {
          title: "Risk accounts",
          rows:
            behaviorSignalRows(
              churnProfiles.sort((a, b) => b.churnRiskScore - a.churnRiskScore),
              "churn",
            ).length > 0 ?
              behaviorSignalRows(
                churnProfiles.sort((a, b) => b.churnRiskScore - a.churnRiskScore),
                "churn",
              ) :
              [{ label: "Churn risk", value: "0", detail: "None flagged" }],
        },
        {
          title: "Inactive owners (30d)",
          rows: [
            {
              label: "Count",
              value: `${ownerInactive}`,
              detail: "No login in 30 days",
            },
          ],
        },
      ] satisfies BreakdownGroup[],
    },
    {
      id: "growth-opportunities",
      title: "Growth upside",
      variant: "upsell",
      value: `${growthProfiles.length}`,
      subtitle: `${upsellReady} upsell · ${teamExpansion} solo · ${formatPhp(growthMrrPotential)} uplift`,
      highlights: [
        { label: "Upsell", value: `${upsellReady}` },
        { label: "Solo teams", value: `${teamExpansion}` },
        { label: "Uplift", value: formatPhp(growthMrrPotential) },
      ],
      breakdown: aiRows.growthOpportunities,
      breakdownGroups: [
        {
          title: `${aiTag} actions`,
          rows: aiRows.growthOpportunities,
        },
        {
          title: "Growth accounts",
          rows:
            behaviorSignalRows(
              growthProfiles.sort((a, b) => b.growthScore - a.growthScore),
              "growth",
            ).length > 0 ?
              behaviorSignalRows(
                growthProfiles.sort((a, b) => b.growthScore - a.growthScore),
                "growth",
              ) :
              [{ label: "Growth", value: "0", detail: "None flagged" }],
        },
        {
          title: "Low setup",
          rows: [
            {
              label: "Count",
              value: `${adoptionLift}`,
              detail: "Under 5/9 setup steps",
            },
          ],
        },
      ],
    },
    {
      id: "behavioral-re-engagement",
      title: "Re-engage",
      variant: "reengagement",
      value: `${behaviorProfiles.length}`,
      subtitle: `${ownerInactive} inactive · ${adoptionLift} low setup · ${behaviorProfiles.length} accounts`,
      highlights: [
        { label: "Inactive", value: `${ownerInactive}` },
        { label: "Low setup", value: `${adoptionLift}` },
        { label: "Flagged", value: `${behaviorProfiles.length}` },
      ],
      breakdown: aiRows.behavioralReengagement,
      breakdownGroups: [
        {
          title: `${aiTag} actions`,
          rows: aiRows.behavioralReengagement,
        },
        {
          title: "Activity",
          rows: behaviorProfiles.slice(0, 6).map((profile) => ({
            label: profile.snapshot.name,
            value: profile.ownerInactive30d ? "Inactive" : "Low setup",
            detail: [
              profile.ownerLastActiveDay ?
                `Last login ${profile.ownerLastActiveDay}` :
                "No login",
              `${profile.snapshot.gettingStartedCompleted}/9 steps`,
            ].join(" · "),
          })),
        },
      ],
    },
    {
      id: "ai-sales-priority",
      title: "Priority calls",
      variant: "pipeline",
      value: `${aiInsights.priorityActions.length}`,
      subtitle: `${highPriority} high · ${aiInsights.priorityActions.length} total · ${aiTag}`,
      highlights: [
        { label: "High", value: `${highPriority}` },
        { label: "Growth", value: `${aiInsights.growthOpportunities.length}` },
        { label: "Source", value: aiInsights.aiEnabled ? "AI" : "Auto" },
      ],
      breakdown: aiRows.priorityActions,
      breakdownGroups: [
        {
          title: "Call list",
          rows: aiRows.priorityActions,
        },
        {
          title: "Scoring",
          rows: [
            {
              label: "Payment + plan",
              value: "Yes",
              detail: "Pending pay, plan status",
            },
            {
              label: "Logins + usage",
              value: "Yes",
              detail: "Owner logins, tx, setup steps",
            },
            {
              label: "Ranking",
              value: aiInsights.aiEnabled ? "AI" : "Auto",
              detail: aiInsights.aiEnabled ?
                "Gemini ranks by risk + growth" :
                "Ranked by payment, logins, and usage",
            },
          ],
        },
      ],
    },
  ];

  return { sales, aiSalesInsights };
}
