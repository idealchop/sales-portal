import { describe, expect, it } from "vitest";
import {
  buildSalesMarketReport,
  resolveMarketIdeals,
  trendVsIdeal,
} from "@/features/dashboard/lib/build-sales-market-report";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

function minimalAnalytics(): DashboardAnalytics {
  return {
    summary: {
      smartRefillUsers: 100,
      onboardedBusinesses: 40,
      totalBusinesses: 50,
      totalCustomers: 1000,
      activeLoginUsers: 30,
      loginSessionsLast30Days: 200,
      topDevice: "Desktop",
      topBrowser: "Chrome",
      transactionsLast30Days: 500,
      refillVolumeLast30Days: 400,
      totalTransactions: 5000,
      transactionBreakdown: { walkIn: 1, directSale: 1, orders: 1 },
      customerBreakdown: { active: 1, deactivated: 0 },
      userRoleCounts: { owners: 1, admins: 0, riders: 0 },
      virtualStaffCounts: { admins: 0, riders: 0 },
      businessTierCounts: { scale: 5, grow: 10, starter: 20, free: 15 },
      totalInventory: 0,
      inventoryBreakdown: {
        generalStock: 0,
        kit: 0,
        container: { shell: 0, round: 0, slim: 0 },
      },
    },
    planDistribution: [
      { name: "Starter", count: 20 },
      { name: "Growth", count: 10 },
    ],
    salesInsights: {
      estimatedMrr: 50000,
      pendingPayments: 2,
      upgradeOpportunities: 5,
      atRiskWorkspaces: 3,
      inactiveWorkspaces: 4,
      newWorkspacesThisMonth: 6,
      newSmartRefillUsersThisMonth: 8,
      workspaceHealth: [
        { tier: "high", count: 25 },
        { tier: "medium", count: 15 },
        { tier: "low", count: 10 },
      ],
      mrrByPlan: [
        { plan: "Starter", mrr: 10000, workspaces: 20 },
        { plan: "Growth", mrr: 20000, workspaces: 10 },
        { plan: "Scale", mrr: 20000, workspaces: 5 },
      ],
      paymentStatusBreakdown: [],
      salesActions: [],
    },
    proposalPipeline: {
      totalProposals: 12,
      totalClients: 10,
      pipelineValue: 100000,
      acceptedValue: 40000,
      winRate: 40,
      byStatus: [
        { status: "draft", count: 3, value: 20000 },
        { status: "sent", count: 5, value: 40000 },
        { status: "accepted", count: 4, value: 40000 },
      ],
      clientsByType: [],
    },
    personalSales: {
      pipelineValue: 100000,
      totalProposals: 12,
      totalClients: 10,
      winRate: 40,
      acceptedValue: 40000,
      commissionsMtd: 5000,
      pendingCommissions: 1500,
      paidCommissionsMtd: 3500,
      draftsNeedingAction: 3,
      sentAwaitingResponse: 5,
    },
    appFeedback: {
      totalCount: 10,
      averageRating: 4.5,
      recommendRate: 80,
      ratingDistribution: [],
      recentFeedback: [],
    },
    chartTimeSeries: {
      ownerSignupsDaily: [],
      workspacesDaily: [],
      loginDaily: [],
      transactionsDaily: [],
      deviceSessionsDaily: [],
      browserSessionsDaily: [],
    },
    chartBusinessContext: [
      {
        id: "a",
        createdAt: null,
        healthTier: "high",
        planName: "Starter",
        planCode: "starter",
        price: 0,
        customers: 40,
        transactionsLast30Days: 50,
        usageGoals: [],
        gettingStarted: {},
      },
      {
        id: "b",
        createdAt: null,
        healthTier: "high",
        planName: "Scale",
        planCode: "scale",
        price: 2499,
        customers: 100,
        transactionsLast30Days: 200,
        usageGoals: [],
        gettingStarted: {},
      },
      {
        id: "c",
        createdAt: null,
        healthTier: "medium",
        planName: "Scale",
        planCode: "scale",
        price: 0,
        customers: 5,
        transactionsLast30Days: 0,
        usageGoals: [],
        gettingStarted: {},
      },
    ],
  } as DashboardAnalytics;
}

describe("trendVsIdeal", () => {
  it("classifies up / neutral / down against ideal", () => {
    expect(trendVsIdeal(50, 40)).toBe("up");
    expect(trendVsIdeal(38, 40)).toBe("neutral");
    expect(trendVsIdeal(20, 40)).toBe("down");
  });
});

describe("resolveMarketIdeals", () => {
  it("scales new-logo ideal with period length", () => {
    expect(resolveMarketIdeals(30).newLogos).toBe(15);
    expect(resolveMarketIdeals(7).newLogos).toBeLessThan(
      resolveMarketIdeals(30).newLogos,
    );
  });
});

describe("buildSalesMarketReport", () => {
  it("excludes authAccountTag=test stations from plan mix", () => {
    const data = minimalAnalytics();
    data.chartBusinessContext = [
      ...(data.chartBusinessContext ?? []),
      {
        id: "test-station",
        createdAt: null,
        healthTier: "high",
        planName: "Scale",
        planCode: "scale",
        price: 2499,
        customers: 999,
        transactionsLast30Days: 999,
        authAccountTag: "test",
        usageGoals: [],
        gettingStarted: {},
      },
    ];

    const report = buildSalesMarketReport(data, { preset: "this_month" });
    expect(report.planMix.find((row) => row.plan === "Scale")?.workspaces).toBe(
      1,
    );
  });
});
