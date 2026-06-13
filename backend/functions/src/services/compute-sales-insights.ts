import {
  classifyHealthForSnapshot,
  isPaymentPending,
  isUpgradeOpportunity,
} from "./compute-sales-insights-helpers";

export type BusinessSnapshot = {
  id: string;
  name: string;
  ownerId?: string;
  ownerEmail?: string;
  address?: string;
  createdAt: Date | null;
  onboardingComplete: boolean;
  planName?: string;
  planCode?: string;
  subscriptionStatus?: string;
  paymentStatus?: string;
  price: number;
  customers: number;
  transactionsLast30Days: number;
  gettingStartedCompleted: number;
};

export type SalesActionType =
  | "payment_pending"
  | "upgrade_opportunity"
  | "low_engagement"
  | "inactive"
  | "onboarding_incomplete";

export type SalesAction = {
  id: string;
  businessId: string;
  businessName: string;
  ownerEmail?: string;
  actionType: SalesActionType;
  priority: "high" | "medium" | "low";
  headline: string;
  detail: string;
  planName?: string;
  customers?: number;
  transactionsLast30Days?: number;
};

export type SalesInsights = {
  estimatedMrr: number;
  pendingPayments: number;
  upgradeOpportunities: number;
  atRiskWorkspaces: number;
  inactiveWorkspaces: number;
  newWorkspacesThisMonth: number;
  newSmartRefillUsersThisMonth: number;
  workspaceHealth: { tier: "high" | "medium" | "low"; count: number }[];
  mrrByPlan: { plan: string; mrr: number; workspaces: number }[];
  paymentStatusBreakdown: { status: string; count: number }[];
  salesActions: SalesAction[];
};

export type ProposalPipeline = {
  totalProposals: number;
  totalClients: number;
  pipelineValue: number;
  acceptedValue: number;
  winRate: number;
  byStatus: { status: string; count: number; value: number }[];
  clientsByType: { type: string; count: number }[];
};

function countGettingStartedDone(gettingStarted: Record<string, unknown>): number {
  return Object.values(gettingStarted).filter(
    (value) => value === true || value === "true",
  ).length;
}

export function computeSalesInsights(input: {
  businesses: BusinessSnapshot[];
  newSmartRefillUsersThisMonth: number;
  monthStart: Date;
}): SalesInsights {
  const { businesses, newSmartRefillUsersThisMonth, monthStart } = input;

  let estimatedMrr = 0;
  let pendingPayments = 0;
  let upgradeOpportunities = 0;
  let atRiskWorkspaces = 0;
  let inactiveWorkspaces = 0;
  let newWorkspacesThisMonth = 0;

  const healthCounts = { high: 0, medium: 0, low: 0 };
  const mrrByPlanMap = new Map<string, { mrr: number; workspaces: number }>();
  const paymentStatusMap = new Map<string, number>();
  const salesActions: SalesAction[] = [];

  businesses.forEach((snapshot) => {
    if (snapshot.createdAt && snapshot.createdAt >= monthStart) {
      newWorkspacesThisMonth += 1;
    }

    const isActiveSub = snapshot.subscriptionStatus === "active";
    if (isActiveSub && snapshot.price > 0) {
      estimatedMrr += snapshot.price;
      const plan = snapshot.planName || "Unknown";
      const bucket = mrrByPlanMap.get(plan) || { mrr: 0, workspaces: 0 };
      bucket.mrr += snapshot.price;
      bucket.workspaces += 1;
      mrrByPlanMap.set(plan, bucket);
    }

    const paymentKey = snapshot.paymentStatus || "not_set";
    paymentStatusMap.set(paymentKey, (paymentStatusMap.get(paymentKey) || 0) + 1);

    const health = classifyHealthForSnapshot(snapshot);
    healthCounts[health] += 1;

    if (snapshot.transactionsLast30Days === 0) {
      inactiveWorkspaces += 1;
    }

    if (health === "low") {
      atRiskWorkspaces += 1;
    }

    if (isPaymentPending(snapshot.paymentStatus)) {
      pendingPayments += 1;
      salesActions.push({
        id: `${snapshot.id}-payment`,
        businessId: snapshot.id,
        businessName: snapshot.name,
        ownerEmail: snapshot.ownerEmail,
        actionType: "payment_pending",
        priority: "high",
        headline: "Verify subscription payment",
        detail: `Payment status is "${snapshot.paymentStatus}". Follow up to avoid service interruption.`,
        planName: snapshot.planName,
        customers: snapshot.customers,
        transactionsLast30Days: snapshot.transactionsLast30Days,
      });
    }

    if (!snapshot.onboardingComplete) {
      salesActions.push({
        id: `${snapshot.id}-onboarding`,
        businessId: snapshot.id,
        businessName: snapshot.name,
        ownerEmail: snapshot.ownerEmail,
        actionType: "onboarding_incomplete",
        priority: "high",
        headline: "Complete workspace onboarding",
        detail: "Owner has not finished workspace setup — offer onboarding support.",
        planName: snapshot.planName,
        customers: snapshot.customers,
      });
    }

    if (
      snapshot.customers > 0 &&
      snapshot.transactionsLast30Days === 0 &&
      !isPaymentPending(snapshot.paymentStatus)
    ) {
      salesActions.push({
        id: `${snapshot.id}-inactive`,
        businessId: snapshot.id,
        businessName: snapshot.name,
        ownerEmail: snapshot.ownerEmail,
        actionType: "inactive",
        priority: "high",
        headline: "Re-engage inactive workspace",
        detail: `${snapshot.customers} customers on file but no transactions in 30 days.`,
        planName: snapshot.planName,
        customers: snapshot.customers,
      });
    }

    if (isUpgradeOpportunity(snapshot)) {
      upgradeOpportunities += 1;
      salesActions.push({
        id: `${snapshot.id}-upgrade`,
        businessId: snapshot.id,
        businessName: snapshot.name,
        ownerEmail: snapshot.ownerEmail,
        actionType: "upgrade_opportunity",
        priority: "medium",
        headline: "Upsell to Scale plan",
        detail: `High usage on Starter (${snapshot.customers} customers, ${snapshot.transactionsLast30Days} tx/30d).`,
        planName: snapshot.planName,
        customers: snapshot.customers,
        transactionsLast30Days: snapshot.transactionsLast30Days,
      });
    }

    if (
      snapshot.gettingStartedCompleted < 3 &&
      snapshot.onboardingComplete &&
      !isPaymentPending(snapshot.paymentStatus)
    ) {
      salesActions.push({
        id: `${snapshot.id}-engagement`,
        businessId: snapshot.id,
        businessName: snapshot.name,
        ownerEmail: snapshot.ownerEmail,
        actionType: "low_engagement",
        priority: "medium",
        headline: "Boost product adoption",
        detail: `Only ${snapshot.gettingStartedCompleted}/9 getting-started steps completed.`,
        planName: snapshot.planName,
        customers: snapshot.customers,
      });
    }
  });

  const priorityRank = { high: 0, medium: 1, low: 2 };
  salesActions.sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority],
  );

  return {
    estimatedMrr,
    pendingPayments,
    upgradeOpportunities,
    atRiskWorkspaces,
    inactiveWorkspaces,
    newWorkspacesThisMonth,
    newSmartRefillUsersThisMonth,
    workspaceHealth: [
      { tier: "high", count: healthCounts.high },
      { tier: "medium", count: healthCounts.medium },
      { tier: "low", count: healthCounts.low },
    ],
    mrrByPlan: [...mrrByPlanMap.entries()]
      .map(([plan, value]) => ({
        plan,
        mrr: value.mrr,
        workspaces: value.workspaces,
      }))
      .sort((a, b) => b.mrr - a.mrr),
    paymentStatusBreakdown: [...paymentStatusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    salesActions: salesActions.slice(0, 12),
  };
}

export function computeProposalPipeline(input: {
  proposals: Array<{
    status: string;
    amount: number;
    clientId?: string;
  }>;
  clients: Array<{ clientType?: string }>;
}): ProposalPipeline {
  const { proposals, clients } = input;

  const byStatusMap = new Map<string, { count: number; value: number }>();
  let pipelineValue = 0;
  let acceptedValue = 0;
  let sentOrBeyond = 0;
  let accepted = 0;

  proposals.forEach((proposal) => {
    const status = proposal.status || "unknown";
    const amount = Number(proposal.amount || 0);
    const bucket = byStatusMap.get(status) || { count: 0, value: 0 };
    bucket.count += 1;
    bucket.value += amount;
    byStatusMap.set(status, bucket);

    if (status !== "draft" && status !== "rejected") {
      pipelineValue += amount;
    }
    if (status === "sent" || status === "accepted" || status === "finalized") {
      sentOrBeyond += 1;
    }
    if (status === "accepted" || status === "finalized") {
      accepted += 1;
      acceptedValue += amount;
    }
  });

  const clientTypeMap = new Map<string, number>();
  clients.forEach((client) => {
    const type = client.clientType || "unknown";
    clientTypeMap.set(type, (clientTypeMap.get(type) || 0) + 1);
  });

  const winRate =
    sentOrBeyond > 0 ? Math.round((accepted / sentOrBeyond) * 100) : 0;

  return {
    totalProposals: proposals.length,
    totalClients: clients.length,
    pipelineValue,
    acceptedValue,
    winRate,
    byStatus: [...byStatusMap.entries()]
      .map(([status, value]) => ({
        status,
        count: value.count,
        value: value.value,
      }))
      .sort((a, b) => b.count - a.count),
    clientsByType: [...clientTypeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export { countGettingStartedDone };
