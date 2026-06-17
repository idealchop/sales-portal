export type UsageBreakdownRow = {
  name: string;
  sessions: number;
  uniqueUsers: number;
};

export type DailyCountRow = { date: string; count: number };
export type DailyLoginRow = {
  date: string;
  sessions: number;
  uniqueUsers: number;
};
export type DailyTransactionRow = {
  date: string;
  count: number;
  amount: number;
};
export type UsageDailyRow = {
  date: string;
  name: string;
  sessions: number;
};

export type ChartTimeSeries = {
  ownerSignupsDaily: DailyCountRow[];
  workspacesDaily: DailyCountRow[];
  loginDaily: DailyLoginRow[];
  transactionsDaily: DailyTransactionRow[];
  deviceSessionsDaily: UsageDailyRow[];
  browserSessionsDaily: UsageDailyRow[];
};

export type ChartBusinessContext = {
  id: string;
  createdAt: string | null;
  healthTier: "high" | "medium" | "low";
  planName?: string;
  planCode?: string;
  paymentStatus?: string;
  price: number;
  customers: number;
  transactionsLast30Days: number;
  usageGoals: string[];
  gettingStarted: Record<string, boolean>;
};

export type BusinessMapLocation = {
  id: string;
  name: string;
  ownerEmail?: string;
  ownerId?: string;
  lat: number;
  lng: number;
  address?: string;
  onboardingComplete: boolean;
  planName?: string;
  planCode?: string;
  healthTier?: "high" | "medium" | "low";
  customers?: number;
  transactionsLast30Days?: number;
  lastActiveDay?: string;
};

export type OwnerSubscriptionTimeline = "past" | "current" | "future";

export type OwnerSubscription = {
  id: string;
  planName: string;
  planCode?: string;
  status: string;
  billingCycle?: string;
  price: number;
  paymentStatus?: string;
  paymentReference?: string;
  timeline: OwnerSubscriptionTimeline;
  createdAt?: string;
  activatedAt?: string;
  activatesAt?: string;
  expiresAt?: string;
  cancelledAt?: string;
  cancelAtPeriodEnd: boolean;
  changeType?: string;
  downgradeReasonCode?: string;
  downgradeReasonDetail?: string;
  needsApproval: boolean;
  isDowngrade: boolean;
  isCancellation: boolean;
};

export type DashboardAnalytics = {
  summary: {
    smartRefillUsers: number;
    onboardedBusinesses: number;
    totalBusinesses: number;
    totalCustomers: number;
    activeLoginUsers: number;
    loginSessionsLast30Days: number;
    topDevice: string;
    topBrowser: string;
    transactionsLast30Days: number;
    refillVolumeLast30Days: number;
  };
  userGrowth: { month: string; count: number }[];
  businessGrowth: { month: string; count: number }[];
  dailyActiveUsers: {
    date: string;
    sessions: number;
    uniqueUsers: number;
  }[];
  deviceUsage: UsageBreakdownRow[];
  browserUsage: UsageBreakdownRow[];
  planDistribution: { name: string; count: number }[];
  usageGoals: { goal: string; count: number }[];
  featureAdoption: {
    feature: string;
    rate: number;
    completed: number;
    total: number;
  }[];
  transactionVolume: { month: string; count: number; amount: number }[];
  recentBusinesses: {
    id: string;
    name: string;
    ownerEmail?: string;
    createdAt: string | null;
    onboardingComplete: boolean;
    planName?: string;
  }[];
  topBusinessesByCustomers: {
    id: string;
    name: string;
    customers: number;
  }[];
  businessLocations: BusinessMapLocation[];
  salesInsights: SalesInsights;
  proposalPipeline: ProposalPipeline;
  appFeedback: AppFeedbackSummary;
  growthSalesMetrics: GrowthSalesMetrics;
  chartTimeSeries: ChartTimeSeries;
  chartBusinessContext: ChartBusinessContext[];
  aiSalesInsights: AiSalesInsights;
  newJoiners: NewJoinersSummary;
};

export type BreakdownRow = {
  label: string;
  value: string;
  detail?: string;
};

export type BreakdownGroup = {
  title: string;
  rows: BreakdownRow[];
};

export type DashboardMetricVariant =
  | "users"
  | "devices"
  | "workspaces"
  | "engagement"
  | "payment"
  | "upsell"
  | "reengagement"
  | "pipeline";

export type DashboardMetricHighlight = {
  label: string;
  value: string;
};

export type DashboardMetric = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  variant: DashboardMetricVariant;
  highlights?: DashboardMetricHighlight[];
  breakdown: BreakdownRow[];
  breakdownGroups?: BreakdownGroup[];
};

export type ActiveOwner = {
  id: string;
  ownerId?: string;
  businessName: string;
  ownerEmail?: string;
  planName?: string;
  customers: number;
  transactionsLast30Days: number;
  healthTier: "high" | "medium" | "low";
  paymentStatus?: string;
  onboardingComplete: boolean;
  address?: string;
  lastActiveDay?: string;
  monthlyRevenue: number;
  subscriptions?: OwnerSubscription[];
  pendingApprovals?: number;
};

export type GrowthSalesMetrics = {
  growth: DashboardMetric[];
  sales: DashboardMetric[];
  activeOwners: ActiveOwner[];
};

export type AppFeedbackEntry = {
  id: string;
  source: "platform" | "workspace";
  businessId?: string;
  businessName?: string;
  ownerEmail?: string;
  userId?: string;
  rating?: number;
  recommend?: boolean;
  feedback?: string;
  suggestion?: string;
  submittedAt: string | null;
  appId?: string;
};

export type AppFeedbackSummary = {
  totalCount: number;
  averageRating: number | null;
  recommendRate: number | null;
  ratingDistribution: { rating: number; count: number }[];
  recentFeedback: AppFeedbackEntry[];
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

export type AiSalesAccountInsight = {
  businessName: string;
  recommendedAction: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

export type AiSalesInsights = {
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

export type NewSalesRepJoiner = {
  id: string;
  displayName: string;
  email?: string;
  role?: string;
  team?: string;
  onboardingComplete: boolean;
  joinedAt: string | null;
};

export type NewBusinessJoiner = {
  id: string;
  name: string;
  ownerEmail?: string;
  planName?: string;
  onboardingComplete: boolean;
  joinedAt: string | null;
};

export type NewPlatformUserJoiner = {
  id: string;
  displayName?: string;
  email?: string;
  role: string;
  joinedAt: string | null;
};

export type NewJoinersSummary = {
  salesReps: NewSalesRepJoiner[];
  businesses: NewBusinessJoiner[];
  platformUsers: NewPlatformUserJoiner[];
};

const EMPTY_NEW_JOINERS: NewJoinersSummary = {
  salesReps: [],
  businesses: [],
  platformUsers: [],
};

const EMPTY_AI_SALES_INSIGHTS: AiSalesInsights = {
  revenueChurnRiskSummary: "",
  growthOpportunitySummary: "",
  behavioralReengagementSummary: "",
  priorityActionsSummary: "",
  revenueChurnRisk: [],
  growthOpportunities: [],
  behavioralReengagement: [],
  priorityActions: [],
  aiEnabled: false,
};

const EMPTY_SALES_INSIGHTS: SalesInsights = {
  estimatedMrr: 0,
  pendingPayments: 0,
  upgradeOpportunities: 0,
  atRiskWorkspaces: 0,
  inactiveWorkspaces: 0,
  newWorkspacesThisMonth: 0,
  newSmartRefillUsersThisMonth: 0,
  workspaceHealth: [
    { tier: "high", count: 0 },
    { tier: "medium", count: 0 },
    { tier: "low", count: 0 },
  ],
  mrrByPlan: [],
  paymentStatusBreakdown: [],
  salesActions: [],
};

const EMPTY_CHART_TIME_SERIES: ChartTimeSeries = {
  ownerSignupsDaily: [],
  workspacesDaily: [],
  loginDaily: [],
  transactionsDaily: [],
  deviceSessionsDaily: [],
  browserSessionsDaily: [],
};

const EMPTY_GROWTH_SALES_METRICS: GrowthSalesMetrics = {
  growth: [],
  sales: [],
  activeOwners: [],
};

const EMPTY_APP_FEEDBACK: AppFeedbackSummary = {
  totalCount: 0,
  averageRating: null,
  recommendRate: null,
  ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 })),
  recentFeedback: [],
};

const EMPTY_PROPOSAL_PIPELINE: ProposalPipeline = {
  totalProposals: 0,
  totalClients: 0,
  pipelineValue: 0,
  acceptedValue: 0,
  winRate: 0,
  byStatus: [],
  clientsByType: [],
};

type PartialDashboardAnalytics = Partial<DashboardAnalytics> & {
  summary?: Partial<DashboardAnalytics["summary"]> & {
    activeUsersLast30Days?: number;
  };
  dailyActiveUsers?: Array<{
    date: string;
    sessions: number;
    uniqueUsers?: number;
  }>;
};

export function normalizeDashboardAnalytics(
  raw: PartialDashboardAnalytics,
): DashboardAnalytics {
  const summary = raw.summary;

  return {
    summary: {
      smartRefillUsers: summary?.smartRefillUsers ?? 0,
      onboardedBusinesses: summary?.onboardedBusinesses ?? 0,
      totalBusinesses: summary?.totalBusinesses ?? 0,
      totalCustomers: summary?.totalCustomers ?? 0,
      activeLoginUsers:
        summary?.activeLoginUsers ?? summary?.activeUsersLast30Days ?? 0,
      loginSessionsLast30Days: summary?.loginSessionsLast30Days ?? 0,
      topDevice: summary?.topDevice ?? "—",
      topBrowser: summary?.topBrowser ?? "—",
      transactionsLast30Days: summary?.transactionsLast30Days ?? 0,
      refillVolumeLast30Days: summary?.refillVolumeLast30Days ?? 0,
    },
    userGrowth: raw.userGrowth ?? [],
    businessGrowth: raw.businessGrowth ?? [],
    dailyActiveUsers: (raw.dailyActiveUsers ?? []).map((row) => ({
      date: row.date,
      sessions: row.sessions ?? 0,
      uniqueUsers: row.uniqueUsers ?? 0,
    })),
    deviceUsage: raw.deviceUsage ?? [],
    browserUsage: raw.browserUsage ?? [],
    planDistribution: raw.planDistribution ?? [],
    usageGoals: raw.usageGoals ?? [],
    featureAdoption: raw.featureAdoption ?? [],
    transactionVolume: raw.transactionVolume ?? [],
    recentBusinesses: raw.recentBusinesses ?? [],
    topBusinessesByCustomers: raw.topBusinessesByCustomers ?? [],
    businessLocations: raw.businessLocations ?? [],
    salesInsights: raw.salesInsights ?? EMPTY_SALES_INSIGHTS,
    proposalPipeline: raw.proposalPipeline ?? EMPTY_PROPOSAL_PIPELINE,
    appFeedback: raw.appFeedback ?? EMPTY_APP_FEEDBACK,
    growthSalesMetrics: raw.growthSalesMetrics ?? EMPTY_GROWTH_SALES_METRICS,
    chartTimeSeries: raw.chartTimeSeries ?? EMPTY_CHART_TIME_SERIES,
    chartBusinessContext: (raw.chartBusinessContext ?? []).map((biz) => ({
      id: biz.id,
      createdAt: biz.createdAt ?? null,
      healthTier: biz.healthTier ?? "medium",
      planName: biz.planName,
      planCode: biz.planCode,
      paymentStatus: biz.paymentStatus,
      price: biz.price ?? 0,
      customers: biz.customers ?? 0,
      transactionsLast30Days: biz.transactionsLast30Days ?? 0,
      usageGoals: biz.usageGoals ?? [],
      gettingStarted: biz.gettingStarted ?? {},
    })),
    aiSalesInsights: raw.aiSalesInsights ?? EMPTY_AI_SALES_INSIGHTS,
    newJoiners: raw.newJoiners ?? EMPTY_NEW_JOINERS,
  };
}
