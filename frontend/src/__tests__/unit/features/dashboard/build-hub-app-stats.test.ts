import { describe, expect, it } from "vitest";
import {
  buildHubAppStats,
  countHubLiveStats,
  groupHubStatsByApp,
} from "@/features/dashboard/lib/build-hub-app-stats";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

function minimalAnalytics(
  overrides: Partial<DashboardAnalytics> = {},
): DashboardAnalytics {
  return {
    summary: {
      smartRefillUsers: 10,
      onboardedBusinesses: 8,
      totalBusinesses: 10,
      totalCustomers: 100,
      activeLoginUsers: 9,
      loginSessionsLast30Days: 50,
      topDevice: "Desktop",
      topBrowser: "Chrome",
      transactionsLast30Days: 200,
      refillVolumeLast30Days: 180,
      totalTransactions: 2500,
      transactionBreakdown: { walkIn: 800, directSale: 600, orders: 1100 },
      customerBreakdown: { active: 95, deactivated: 5 },
      userRoleCounts: { owners: 6, admins: 2, riders: 2 },
      virtualStaffCounts: { admins: 1, riders: 1 },
      businessTierCounts: { scale: 2, grow: 3, starter: 4, free: 1 },
      totalInventory: 1305,
      inventoryBreakdown: {
        generalStock: 36,
        kit: 120,
        container: { shell: 50, round: 99, slim: 1000 },
      },
    },
    userGrowth: [],
    businessGrowth: [],
    dailyActiveUsers: [],
    deviceUsage: [],
    browserUsage: [],
    planDistribution: [],
    usageGoals: [],
    featureAdoption: [],
    transactionVolume: [],
    recentBusinesses: [],
    topBusinessesByCustomers: [],
    businessLocations: [],
    salesInsights: {
      estimatedMrr: 10000,
      pendingPayments: 1,
      upgradeOpportunities: 2,
      atRiskWorkspaces: 1,
      inactiveWorkspaces: 1,
      newWorkspacesThisMonth: 1,
      newSmartRefillUsersThisMonth: 2,
      workspaceHealth: [],
      mrrByPlan: [],
      paymentStatusBreakdown: [],
      salesActions: [],
    },
    proposalPipeline: {
      totalProposals: 0,
      totalClients: 0,
      pipelineValue: 0,
      acceptedValue: 0,
      winRate: 0,
      byStatus: [],
      clientsByType: [],
    },
    appFeedback: {
      totalCount: 0,
      averageRating: null,
      recommendRate: null,
      ratingDistribution: [],
      recentFeedback: [],
    },
    growthSalesMetrics: { growth: [], sales: [], activeOwners: [] },
    chartTimeSeries: {
      ownerSignupsDaily: [],
      workspacesDaily: [],
      loginDaily: [],
      transactionsDaily: [],
      deviceSessionsDaily: [],
      browserSessionsDaily: [],
    },
    chartBusinessContext: [],
    aiSalesInsights: {
      revenueChurnRiskSummary: "",
      growthOpportunitySummary: "",
      behavioralReengagementSummary: "",
      priorityActionsSummary: "",
      revenueChurnRisk: [],
      growthOpportunities: [],
      behavioralReengagement: [],
      priorityActions: [],
      aiEnabled: false,
    },
    dashboardForecasts: {
      platform: [],
      smartrefill: [],
      salesPortal: [],
      aiEnabled: false,
    },
    newJoiners: { salesReps: [], businesses: [], platformUsers: [] },
    platformAlerts: {
      items: [],
      counts: {
        demo_inquiry: 0,
        new_user_registration: 0,
        subscription_change: 0,
        subscription_expiring_soon: 0,
        subscription_grace_period: 0,
      },
    },
    ...overrides,
  } as DashboardAnalytics;
}

describe("buildHubAppStats", () => {
  it("groups stats by app including platform rollup", () => {
    const grouped = groupHubStatsByApp(buildHubAppStats(minimalAnalytics()));

    expect(grouped.get("platform")?.length).toBe(4);
    expect(grouped.get("smartrefill")?.length).toBe(6);
    expect(grouped.get("sales-portal")?.length).toBe(6);
  });

  it("counts live stats excluding future-app placeholders", () => {
    const stats = buildHubAppStats(minimalAnalytics());
    expect(countHubLiveStats(stats)).toBe(16);
    expect(stats.some((row) => row.appId === "future-app")).toBe(true);
  });
});
