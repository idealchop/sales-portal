import { geminiGenerateJson } from "./ai/gemini-client";
import type { ProposalPipeline, SalesInsights } from "./compute-sales-insights";
import type { AiSalesInsightsResult } from "./generate-ai-sales-insights";

export type DashboardForecastHorizon = "30d" | "60d" | "90d";

export type DashboardForecastItem = {
  id: string;
  appId: "platform" | "smartrefill" | "sales-portal";
  horizon: DashboardForecastHorizon;
  metric: string;
  current: string;
  projected: string;
  delta: string;
  roiImpact: string;
  action: string;
  priority: "high" | "medium" | "low";
};

export type DashboardForecasts = {
  platform: DashboardForecastItem[];
  smartrefill: DashboardForecastItem[];
  salesPortal: DashboardForecastItem[];
  aiEnabled: boolean;
};

type ForecastInput = {
  summary: {
    smartRefillUsers: number;
    onboardedBusinesses: number;
    totalBusinesses: number;
    totalCustomers: number;
    activeLoginUsers: number;
    transactionsLast30Days: number;
    refillVolumeLast30Days: number;
  };
  salesInsights: SalesInsights;
  proposalPipeline: ProposalPipeline;
  aiSalesInsights: AiSalesInsightsResult;
};

function formatPhp(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function pctDelta(current: number, projected: number): string {
  if (current <= 0) return projected > 0 ? "+100%" : "0%";
  const pct = Math.round(((projected - current) / current) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

export function buildFallbackForecasts(input: ForecastInput): DashboardForecasts {
  const { summary, salesInsights, proposalPipeline } = input;
  const mrr = salesInsights.estimatedMrr;
  const mrr30 = Math.round(mrr * 1.04);
  const mrr60 = Math.round(mrr * 1.09);
  const mrr90 = Math.round(mrr * 1.14);
  const upgradeLift = salesInsights.upgradeOpportunities * 850;
  const churnSave = Math.round(salesInsights.atRiskWorkspaces * 1200);
  const pipeline = proposalPipeline.pipelineValue;
  const winRate = proposalPipeline.winRate || 0;
  const projectedWins30 = Math.round(pipeline * (winRate / 100) * 0.35);
  const projectedWins60 = Math.round(pipeline * (winRate / 100) * 0.55);
  const projectedWins90 = Math.round(pipeline * (winRate / 100) * 0.75);
  const tx30 = summary.transactionsLast30Days;
  const workspaces = summary.totalBusinesses;

  const smartrefill: DashboardForecastItem[] = [
    {
      id: "sr-mrr-30",
      appId: "smartrefill",
      horizon: "30d",
      metric: "MRR",
      current: formatPhp(mrr),
      projected: formatPhp(mrr30),
      delta: pctDelta(mrr, mrr30),
      roiImpact: formatPhp(mrr30 - mrr),
      action: `Close ${salesInsights.upgradeOpportunities} upsells`,
      priority: salesInsights.upgradeOpportunities > 3 ? "high" : "medium",
    },
    {
      id: "sr-ws-60",
      appId: "smartrefill",
      horizon: "60d",
      metric: "Workspaces",
      current: String(workspaces),
      projected: String(workspaces + salesInsights.newWorkspacesThisMonth * 2),
      delta: `+${salesInsights.newWorkspacesThisMonth * 2}`,
      roiImpact: formatPhp(salesInsights.newWorkspacesThisMonth * 2 * 1200),
      action: "Convert trial → paid",
      priority: "medium",
    },
    {
      id: "sr-tx-30",
      appId: "smartrefill",
      horizon: "30d",
      metric: "Transactions",
      current: tx30.toLocaleString(),
      projected: Math.round(tx30 * 1.08).toLocaleString(),
      delta: pctDelta(tx30, tx30 * 1.08),
      roiImpact: "Usage lift",
      action: `Re-engage ${salesInsights.inactiveWorkspaces} inactive`,
      priority: salesInsights.inactiveWorkspaces > 5 ? "high" : "low",
    },
    {
      id: "sr-save-90",
      appId: "smartrefill",
      horizon: "90d",
      metric: "Churn save",
      current: formatPhp(0),
      projected: formatPhp(churnSave),
      delta: `${salesInsights.atRiskWorkspaces} accounts`,
      roiImpact: formatPhp(churnSave),
      action: "Payment + login outreach",
      priority: salesInsights.atRiskWorkspaces > 0 ? "high" : "low",
    },
    {
      id: "sr-up-60",
      appId: "smartrefill",
      horizon: "60d",
      metric: "Upgrade MRR",
      current: formatPhp(0),
      projected: formatPhp(upgradeLift),
      delta: `${salesInsights.upgradeOpportunities} opps`,
      roiImpact: formatPhp(upgradeLift),
      action: "Pitch Scale plans",
      priority: "high",
    },
  ];

  const salesPortal: DashboardForecastItem[] = [
    {
      id: "sp-pipe-30",
      appId: "sales-portal",
      horizon: "30d",
      metric: "Pipeline wins",
      current: formatPhp(proposalPipeline.acceptedValue),
      projected: formatPhp(projectedWins30),
      delta: pctDelta(proposalPipeline.acceptedValue, projectedWins30),
      roiImpact: formatPhp(projectedWins30),
      action: `Win rate ${winRate}%`,
      priority: "high",
    },
    {
      id: "sp-pipe-60",
      appId: "sales-portal",
      horizon: "60d",
      metric: "Pipeline",
      current: formatPhp(pipeline),
      projected: formatPhp(Math.round(pipeline * 1.12)),
      delta: "+12%",
      roiImpact: formatPhp(Math.round(pipeline * 0.12)),
      action: "Send draft proposals",
      priority: "medium",
    },
    {
      id: "sp-clients-90",
      appId: "sales-portal",
      horizon: "90d",
      metric: "Clients",
      current: String(proposalPipeline.totalClients),
      projected: String(
        proposalPipeline.totalClients +
          Math.max(1, Math.round(proposalPipeline.totalProposals * 0.15)),
      ),
      delta: `+${Math.max(1, Math.round(proposalPipeline.totalProposals * 0.15))}`,
      roiImpact: formatPhp(projectedWins90),
      action: "Expand accounts",
      priority: "medium",
    },
    {
      id: "sp-win-30",
      appId: "sales-portal",
      horizon: "30d",
      metric: "Win rate",
      current: `${winRate}%`,
      projected: `${Math.min(95, winRate + 5)}%`,
      delta: "+5 pts",
      roiImpact: formatPhp(Math.round(pipeline * 0.05)),
      action: "48h follow-up on sent",
      priority: winRate < 40 ? "high" : "low",
    },
    {
      id: "sp-roi-60",
      appId: "sales-portal",
      horizon: "60d",
      metric: "Closed won",
      current: formatPhp(proposalPipeline.acceptedValue),
      projected: formatPhp(projectedWins60),
      delta: pctDelta(proposalPipeline.acceptedValue, projectedWins60),
      roiImpact: formatPhp(projectedWins60 - proposalPipeline.acceptedValue),
      action: "Clone top templates",
      priority: "medium",
    },
  ];

  const platform: DashboardForecastItem[] = [
    {
      id: "pl-mrr-90",
      appId: "platform",
      horizon: "90d",
      metric: "Platform MRR",
      current: formatPhp(mrr),
      projected: formatPhp(mrr90),
      delta: pctDelta(mrr, mrr90),
      roiImpact: formatPhp(mrr90 - mrr + upgradeLift),
      action: "Upsell + retain",
      priority: "high",
    },
    {
      id: "pl-roi-60",
      appId: "platform",
      horizon: "60d",
      metric: "Combined ROI",
      current: formatPhp(mrr + proposalPipeline.acceptedValue),
      projected: formatPhp(mrr60 + projectedWins60),
      delta: pctDelta(
        mrr + proposalPipeline.acceptedValue,
        mrr60 + projectedWins60,
      ),
      roiImpact: formatPhp(mrr60 + projectedWins60 - mrr - proposalPipeline.acceptedValue),
      action: "Sync CRM + subs",
      priority: "high",
    },
    {
      id: "pl-users-30",
      appId: "platform",
      horizon: "30d",
      metric: "Active users",
      current: summary.activeLoginUsers.toLocaleString(),
      projected: Math.round(summary.activeLoginUsers * 1.06).toLocaleString(),
      delta: pctDelta(summary.activeLoginUsers, summary.activeLoginUsers * 1.06),
      roiImpact: `${salesInsights.newSmartRefillUsersThisMonth} new MTD`,
      action: "Onboarding nudges",
      priority: "medium",
    },
    {
      id: "pl-pipe-30",
      appId: "platform",
      horizon: "30d",
      metric: "Sales pipeline",
      current: formatPhp(pipeline),
      projected: formatPhp(projectedWins30 + pipeline * 0.4),
      delta: pctDelta(pipeline, projectedWins30 + pipeline * 0.4),
      roiImpact: formatPhp(projectedWins30),
      action: `${proposalPipeline.totalProposals} proposals`,
      priority: "high",
    },
    {
      id: "pl-save-90",
      appId: "platform",
      horizon: "90d",
      metric: "Retention",
      current: formatPhp(0),
      projected: formatPhp(churnSave),
      delta: `${salesInsights.atRiskWorkspaces} at-risk`,
      roiImpact: formatPhp(churnSave),
      action: "Proactive saves",
      priority: salesInsights.atRiskWorkspaces > 0 ? "high" : "medium",
    },
  ];

  return {
    platform,
    smartrefill,
    salesPortal,
    aiEnabled: false,
  };
}

type AiForecastResponse = {
  platform?: DashboardForecastItem[];
  smartrefill?: DashboardForecastItem[];
  salesPortal?: DashboardForecastItem[];
};

function normalizeItems(
  items: DashboardForecastItem[] | undefined,
  appId: DashboardForecastItem["appId"],
  fallback: DashboardForecastItem[],
): DashboardForecastItem[] {
  if (!items?.length) return fallback;
  return items.slice(0, 8).map((item, index) => ({
    id: item.id || `${appId}-${index}`,
    appId,
    horizon: item.horizon || "30d",
    metric: item.metric || "Metric",
    current: item.current || "—",
    projected: item.projected || "—",
    delta: item.delta || "—",
    roiImpact: item.roiImpact || "—",
    action: item.action || "Review",
    priority: item.priority || "medium",
  }));
}

export async function generateDashboardForecasts(
  input: ForecastInput,
): Promise<DashboardForecasts> {
  const fallback = buildFallbackForecasts(input);

  const aiResult = await geminiGenerateJson<AiForecastResponse>({
    system: `Sales Portal analyst. Proactive ROI forecasts for SmartRefill + Sales Portal.
JSON only. Short strings: metric ≤3 words, action ≤5 words, delta with numbers.
Each item needs horizon 30d|60d|90d, priority high|medium|low.`,
    user: JSON.stringify({
      task: "Forecast MRR, pipeline, retention, and cross-app ROI with proactive actions",
      signals: {
        mrr: input.salesInsights.estimatedMrr,
        workspaces: input.summary.totalBusinesses,
        transactions30d: input.summary.transactionsLast30Days,
        upgradeOpportunities: input.salesInsights.upgradeOpportunities,
        atRisk: input.salesInsights.atRiskWorkspaces,
        pipelineValue: input.proposalPipeline.pipelineValue,
        winRate: input.proposalPipeline.winRate,
        proposals: input.proposalPipeline.totalProposals,
        aiPriorityCount: input.aiSalesInsights.priorityActions.length,
      },
      outputSchema: {
        platform: "max 6 items, appId platform",
        smartrefill: "max 6 items, appId smartrefill",
        salesPortal: "max 6 items, appId sales-portal",
        itemShape: {
          id: "string",
          appId: "platform|smartrefill|sales-portal",
          horizon: "30d|60d|90d",
          metric: "string",
          current: "string",
          projected: "string",
          delta: "string",
          roiImpact: "string",
          action: "string",
          priority: "high|medium|low",
        },
      },
    }),
    fallback: {},
    maxOutputTokens: 2048,
  });

  const hasAi =
    Boolean(aiResult.platform?.length) ||
    Boolean(aiResult.smartrefill?.length) ||
    Boolean(aiResult.salesPortal?.length);

  if (!hasAi) return fallback;

  return {
    platform: normalizeItems(aiResult.platform, "platform", fallback.platform),
    smartrefill: normalizeItems(
      aiResult.smartrefill,
      "smartrefill",
      fallback.smartrefill,
    ),
    salesPortal: normalizeItems(
      aiResult.salesPortal,
      "sales-portal",
      fallback.salesPortal,
    ),
    aiEnabled: true,
  };
}

export function reshapeForecastsForActor(
  forecasts: DashboardForecasts,
  input: {
    pipelineValue: number;
    acceptedValue: number;
    winRate: number;
    totalProposals: number;
    totalClients: number;
    commissionsMtd: number;
    scope: "platform" | "team" | "personal";
  },
): DashboardForecasts {
  if (input.scope === "platform") return forecasts;
  // team + personal: align sales-portal and platform pipeline forecasts to actor pipeline

  const format = formatPhp;
  const pipeline = input.pipelineValue;
  const win = input.winRate;
  const wins30 = Math.round(pipeline * (win / 100) * 0.35);

  const salesPortal = forecasts.salesPortal.map((item) => {
    if (item.metric.toLowerCase().includes("pipeline")) {
      return {
        ...item,
        current: format(pipeline),
        projected: format(wins30),
        delta: pctDelta(input.acceptedValue, wins30),
        roiImpact: format(wins30),
      };
    }
    if (item.metric.toLowerCase().includes("win")) {
      return { ...item, current: `${win}%` };
    }
    if (item.metric.toLowerCase().includes("client")) {
      return {
        ...item,
        current: String(input.totalClients),
      };
    }
    return item;
  });

  const platform = forecasts.platform.map((item) => {
    if (item.metric.toLowerCase().includes("pipeline")) {
      return {
        ...item,
        current: format(pipeline),
        projected: format(wins30 + pipeline * 0.25),
        roiImpact: format(wins30),
      };
    }
    return item;
  });

  return { ...forecasts, platform, salesPortal };
}
