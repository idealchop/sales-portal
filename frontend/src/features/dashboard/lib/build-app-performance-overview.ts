import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { formatPhp } from "@/lib/format";
import type { DashboardAppId } from "@/features/dashboard/config/dashboard-apps";

export type AppPerformanceOverview = {
  appId: DashboardAppId;
  headline: string;
  detail: string;
};

/** One-line performance read for the platform hub. */
export function buildAppPerformanceOverview(
  data: DashboardAnalytics,
): AppPerformanceOverview[] {
  const summary = data.summary;
  const sales = data.salesInsights;
  const personal = data.personalSales;
  const pipeline = data.proposalPipeline;
  const openActions =
    (personal?.draftsNeedingAction ?? 0) +
    (personal?.sentAwaitingResponse ?? 0);
  const pipelineValue = personal?.pipelineValue ?? pipeline.pipelineValue;
  const winRate = personal?.winRate ?? pipeline.winRate;

  return [
    {
      appId: "smartrefill",
      headline: `${summary.totalBusinesses.toLocaleString()} stations · ${summary.transactionsLast30Days.toLocaleString()} txs (30d)`,
      detail:
        sales.atRiskWorkspaces > 0 || sales.upgradeOpportunities > 0 ?
          `${sales.upgradeOpportunities} upgrade-ready · ${sales.atRiskWorkspaces} at-risk · +${sales.newWorkspacesThisMonth} new MTD`
        : `+${sales.newWorkspacesThisMonth} new stations MTD · ${formatPhp(sales.estimatedMrr)} est. MRR`,
    },
    {
      appId: "sales-portal",
      headline: `${formatPhp(pipelineValue)} open pipeline · ${winRate}% win rate`,
      detail:
        openActions > 0 ?
          `${openActions} proposal follow-ups open · ${formatPhp(personal?.commissionsMtd ?? 0)} commissions MTD`
        : `${(personal?.totalClients ?? pipeline.totalClients).toLocaleString()} clients · ${formatPhp(personal?.commissionsMtd ?? 0)} commissions MTD`,
    },
    {
      appId: "smartrefill-old",
      headline: "Legacy station triage & outreach",
      detail:
        "Contact, ignore, or clean up owners still on the older Smart Refill database.",
    },
  ];
}
