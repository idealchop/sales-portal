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
      label: "Est. monthly revenue",
      value: formatPhp(sales.estimatedMrr),
      hint: `${sales.pendingPayments} pending payments`,
    },
    {
      appId: "platform",
      appLabel: "Platform",
      label: "At-risk stations",
      value: sales.atRiskWorkspaces.toLocaleString(),
      hint: `${sales.inactiveWorkspaces} quiet`,
    },
    {
      appId: "platform",
      appLabel: "Platform",
      label: "Upgrade-ready",
      value: sales.upgradeOpportunities.toLocaleString(),
      hint: `${sales.salesActions.length} follow-ups`,
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "Stations",
      value: summary.totalBusinesses.toLocaleString(),
      hint: `${summary.onboardedBusinesses.toLocaleString()} onboarded`,
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "Active users",
      value: summary.activeLoginUsers.toLocaleString(),
      hint: `${summary.smartRefillUsers.toLocaleString()} total users`,
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "Txs (30d)",
      value: summary.transactionsLast30Days.toLocaleString(),
      hint: `${summary.totalCustomers.toLocaleString()} customers`,
    },
    {
      appId: "smartrefill",
      appLabel: "SmartRefill",
      label: "New MTD",
      value: `+${sales.newWorkspacesThisMonth}`,
      hint: `+${sales.newSmartRefillUsersThisMonth} users`,
    },
    {
      appId: "sales-portal",
      appLabel: "Sales Portal",
      label: "Open pipeline",
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
