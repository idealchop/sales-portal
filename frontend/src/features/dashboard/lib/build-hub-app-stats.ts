import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { formatPhp } from "@/lib/format";

export type HubAppStat = {
  appId: string;
  appLabel: string;
  label: string;
  value: string;
  hint?: string;
};

export function buildHubAppStats(data: DashboardAnalytics): HubAppStat[] {
  const personal = data.personalSales;
  const pipeline = data.proposalPipeline;
  const sales = data.salesInsights;
  const summary = data.summary;
  const refillPerTx =
    summary.transactionsLast30Days > 0 ?
      Math.round(summary.refillVolumeLast30Days / summary.transactionsLast30Days)
    : 0;
  const sentCount =
    pipeline.byStatus.find((row) => row.status === "sent")?.count ?? 0;
  const draftCount =
    pipeline.byStatus.find((row) => row.status === "draft")?.count ?? 0;

  return [
    {
      appId: "platform",
      appLabel: "Platform",
      label: "Customers",
      value: summary.totalCustomers.toLocaleString(),
      hint: `${summary.loginSessionsLast30Days.toLocaleString()} sessions · 30d`,
    },
    {
      appId: "platform",
      appLabel: "Platform",
      label: "Est. MRR",
      value: formatPhp(sales.estimatedMrr),
      hint: `${sales.pendingPayments} pending pay`,
    },
    {
      appId: "platform",
      appLabel: "Platform",
      label: "At-risk",
      value: sales.atRiskWorkspaces.toLocaleString(),
      hint: `${sales.inactiveWorkspaces} inactive`,
    },
    {
      appId: "platform",
      appLabel: "Platform",
      label: "Upsell queue",
      value: sales.upgradeOpportunities.toLocaleString(),
      hint: `${sales.salesActions.length} follow-ups`,
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "Users",
      value: summary.smartRefillUsers.toLocaleString(),
      hint: `${summary.activeLoginUsers.toLocaleString()} active · 30d`,
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "Workspaces",
      value: summary.totalBusinesses.toLocaleString(),
      hint: `${summary.onboardedBusinesses.toLocaleString()} onboarded`,
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "Transactions",
      value: summary.transactionsLast30Days.toLocaleString(),
      hint: `${summary.totalCustomers.toLocaleString()} customers`,
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "Refill vol.",
      value: summary.refillVolumeLast30Days.toLocaleString(),
      hint: refillPerTx > 0 ? `~${refillPerTx}/tx · 30d` : "30d",
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "New MTD",
      value: `+${sales.newSmartRefillUsersThisMonth}`,
      hint: `+${sales.newWorkspacesThisMonth} workspaces`,
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "Top device",
      value: summary.topDevice,
      hint: summary.topBrowser,
    },
    {
      appId: "sales-portal",
      appLabel: "Sales Portal",
      label: "Pipeline",
      value: formatPhp(personal?.pipelineValue ?? pipeline.pipelineValue),
      hint: `${personal?.totalProposals ?? pipeline.totalProposals} proposals`,
    },
    {
      appId: "sales-portal",
      appLabel: "Sales Portal",
      label: "Win rate",
      value: `${personal?.winRate ?? pipeline.winRate}%`,
      hint: formatPhp(personal?.acceptedValue ?? pipeline.acceptedValue),
    },
    {
      appId: "sales-portal",
      appLabel: "Sales Portal",
      label: "Clients",
      value: (personal?.totalClients ?? pipeline.totalClients).toLocaleString(),
      hint: `${sentCount} sent · ${draftCount} drafts`,
    },
    {
      appId: "sales-portal",
      appLabel: "Sales Portal",
      label: "Commissions MTD",
      value: formatPhp(personal?.commissionsMtd ?? 0),
      hint: formatPhp(personal?.pendingCommissions ?? 0) + " pending",
    },
    {
      appId: "sales-portal",
      appLabel: "Sales Portal",
      label: "Closed won",
      value: formatPhp(personal?.acceptedValue ?? pipeline.acceptedValue),
      hint: formatPhp(personal?.paidCommissionsMtd ?? 0) + " paid MTD",
    },
    {
      appId: "sales-portal",
      appLabel: "Sales Portal",
      label: "Open actions",
      value: String(
        (personal?.draftsNeedingAction ?? draftCount) +
          (personal?.sentAwaitingResponse ?? sentCount),
      ),
      hint: `${personal?.draftsNeedingAction ?? draftCount} drafts`,
    },
    {
      appId: "future-app",
      appLabel: "Future apps",
      label: "Integrations",
      value: "—",
      hint: "More platform apps coming soon",
    },
    {
      appId: "future-app",
      appLabel: "Future apps",
      label: "Cross-app ROI",
      value: "—",
      hint: "Unified metrics when apps launch",
    },
  ];
}

export function groupHubStatsByApp(stats: HubAppStat[]) {
  const groups = new Map<string, HubAppStat[]>();
  for (const stat of stats) {
    const bucket = groups.get(stat.appId) ?? [];
    bucket.push(stat);
    groups.set(stat.appId, bucket);
  }
  return groups;
}

export function countHubLiveStats(stats: HubAppStat[]) {
  return stats.filter((row) => row.appId !== "future-app").length;
}
