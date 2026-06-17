import { describe, expect, it } from "vitest";
import {
  buildFallbackForecasts,
  reshapeForecastsForActor,
} from "../../../services/generate-dashboard-forecasts";

const EMPTY_AI = {
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

describe("buildFallbackForecasts", () => {
  it("returns platform, smartrefill, and sales portal forecast rows", () => {
    const result = buildFallbackForecasts({
      summary: {
        smartRefillUsers: 120,
        onboardedBusinesses: 40,
        totalBusinesses: 45,
        totalCustomers: 900,
        activeLoginUsers: 80,
        transactionsLast30Days: 500,
        refillVolumeLast30Days: 1200,
      },
      salesInsights: {
        estimatedMrr: 50000,
        pendingPayments: 2,
        upgradeOpportunities: 5,
        atRiskWorkspaces: 3,
        inactiveWorkspaces: 4,
        newWorkspacesThisMonth: 2,
        newSmartRefillUsersThisMonth: 8,
        salesActions: [],
        workspaceHealth: [],
        mrrByPlan: [],
        paymentStatusBreakdown: [],
      },
      proposalPipeline: {
        totalProposals: 10,
        totalClients: 6,
        pipelineValue: 100000,
        acceptedValue: 25000,
        winRate: 30,
        byStatus: [],
        clientsByType: [],
      },
      aiSalesInsights: EMPTY_AI,
    });

    expect(result.platform.length).toBeGreaterThan(0);
    expect(result.smartrefill.length).toBeGreaterThan(0);
    expect(result.salesPortal.length).toBeGreaterThan(0);
    expect(result.aiEnabled).toBe(false);
    expect(result.platform[0]?.projected).toBeTruthy();
  });
});

describe("reshapeForecastsForActor", () => {
  it("returns platform forecasts unchanged for admin scope", () => {
    const forecasts = buildFallbackForecasts({
      summary: {
        smartRefillUsers: 10,
        onboardedBusinesses: 8,
        totalBusinesses: 10,
        totalCustomers: 100,
        activeLoginUsers: 9,
        transactionsLast30Days: 50,
        refillVolumeLast30Days: 40,
      },
      salesInsights: {
        estimatedMrr: 1000,
        pendingPayments: 0,
        upgradeOpportunities: 0,
        atRiskWorkspaces: 0,
        inactiveWorkspaces: 0,
        newWorkspacesThisMonth: 0,
        newSmartRefillUsersThisMonth: 0,
        salesActions: [],
        workspaceHealth: [],
        mrrByPlan: [],
        paymentStatusBreakdown: [],
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
      aiSalesInsights: EMPTY_AI,
    });

    const reshaped = reshapeForecastsForActor(forecasts, {
      pipelineValue: 5000,
      acceptedValue: 1000,
      winRate: 25,
      totalProposals: 3,
      totalClients: 2,
      commissionsMtd: 500,
      scope: "platform",
    });

    expect(reshaped).toEqual(forecasts);
  });

  it("reshapes pipeline metrics for personal scope", () => {
    const forecasts = buildFallbackForecasts({
      summary: {
        smartRefillUsers: 10,
        onboardedBusinesses: 8,
        totalBusinesses: 10,
        totalCustomers: 100,
        activeLoginUsers: 9,
        transactionsLast30Days: 50,
        refillVolumeLast30Days: 40,
      },
      salesInsights: {
        estimatedMrr: 1000,
        pendingPayments: 0,
        upgradeOpportunities: 0,
        atRiskWorkspaces: 0,
        inactiveWorkspaces: 0,
        newWorkspacesThisMonth: 0,
        newSmartRefillUsersThisMonth: 0,
        salesActions: [],
        workspaceHealth: [],
        mrrByPlan: [],
        paymentStatusBreakdown: [],
      },
      proposalPipeline: {
        totalProposals: 10,
        totalClients: 4,
        pipelineValue: 100000,
        acceptedValue: 20000,
        winRate: 30,
        byStatus: [],
        clientsByType: [],
      },
      aiSalesInsights: EMPTY_AI,
    });

    const reshaped = reshapeForecastsForActor(forecasts, {
      pipelineValue: 12000,
      acceptedValue: 3000,
      winRate: 40,
      totalProposals: 2,
      totalClients: 1,
      commissionsMtd: 800,
      scope: "personal",
    });

    const pipelineItem = reshaped.salesPortal.find((row) =>
      row.metric.toLowerCase().includes("pipeline"),
    );
    expect(pipelineItem?.current).toContain("12");
    expect(reshaped.salesPortal.some((row) => row.current === "1")).toBe(true);
  });
});
