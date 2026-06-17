import { buildPersonalSalesSummary } from "./build-personal-sales-summary";
import { buildTodaysWorkInbox } from "./build-todays-work-inbox";
import { listClients } from "./clients-service";
import { computeProposalPipeline } from "./compute-sales-insights";
import { listProposals } from "./proposals-service";
import type { SalesActor } from "./sales-scope";
import type { DashboardAnalytics } from "./dashboard-analytics-service";

export type ScopedDashboardAnalytics = DashboardAnalytics & {
  personalSales: Awaited<ReturnType<typeof buildPersonalSalesSummary>>;
  todaysWork: ReturnType<typeof buildTodaysWorkInbox>;
  analyticsScope: "platform" | "team" | "personal";
};

function countPendingApprovals(
  activeOwners: DashboardAnalytics["growthSalesMetrics"]["activeOwners"],
): number {
  return activeOwners.reduce((sum, owner) => {
    const pending = owner.subscriptions.filter((sub) => sub.needsApproval).length;
    return sum + pending;
  }, 0);
}

export async function filterDashboardAnalyticsForActor(
  data: DashboardAnalytics,
  actor: SalesActor,
): Promise<ScopedDashboardAnalytics> {
  const personalSales = await buildPersonalSalesSummary(actor);
  const pendingApprovalCount = countPendingApprovals(
    data.growthSalesMetrics.activeOwners,
  );

  const todaysWork = buildTodaysWorkInbox({
    salesActions: data.salesInsights.salesActions,
    aiSalesInsights: data.aiSalesInsights,
    personalSales,
    pendingApprovalCount,
  });

  if (actor.role === "admin") {
    return {
      ...data,
      personalSales,
      todaysWork,
      analyticsScope: "platform",
    };
  }

  const [proposals, clients] = await Promise.all([
    listProposals(actor),
    listClients(actor),
  ]);
  const proposalPipeline = computeProposalPipeline({ proposals, clients });

  return {
    ...data,
    proposalPipeline,
    personalSales,
    todaysWork,
    analyticsScope: actor.role === "manager" ? "team" : "personal",
  };
}
