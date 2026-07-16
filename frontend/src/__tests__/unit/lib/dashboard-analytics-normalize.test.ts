import { describe, expect, it } from "vitest";
import { normalizeDashboardAnalytics } from "@/lib/dashboard/analytics";

describe("normalizeDashboardAnalytics", () => {
  it("fills empty newJoiners when missing from payload", () => {
    const normalized = normalizeDashboardAnalytics({
      growthSalesMetrics: {
        growth: [],
        sales: [],
        activeOwners: [],
      },
      salesInsights: {
        newWorkspaces: 0,
        newSmartRefillUsers: 0,
        newSalesReps: 0,
        pendingProposals: 0,
        openCommissions: 0,
      },
      proposalPipeline: {
        draft: 0,
        sent: 0,
        accepted: 0,
        declined: 0,
      },
      appFeedback: [],
      businessLocations: [],
      recentBusinesses: [],
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
    });

    expect(normalized.newJoiners).toEqual({
      salesReps: [],
      businesses: [],
      platformUsers: [],
    });
  });

  it("fills KPI breakdown defaults when missing from summary", () => {
    const normalized = normalizeDashboardAnalytics({
      summary: { totalCustomers: 42 },
      growthSalesMetrics: {
        growth: [],
        sales: [],
        activeOwners: [],
      },
    });

    expect(normalized.summary.customerBreakdown).toEqual({
      active: 42,
      deactivated: 0,
    });
    expect(normalized.summary.userRoleCounts).toEqual({
      owners: 0,
      admins: 0,
      riders: 0,
    });
    expect(normalized.summary.virtualStaffCounts).toEqual({
      admins: 0,
      riders: 0,
    });
    expect(normalized.summary.businessTierCounts).toEqual({
      scale: 0,
      grow: 0,
      starter: 0,
      free: 0,
    });
    expect(normalized.summary.totalInventory).toBe(0);
    expect(normalized.summary.inventoryBreakdown).toEqual({
      generalStock: 0,
      kit: 0,
      container: { shell: 0, round: 0, slim: 0 },
    });
  });

  it("fills empty dashboardForecasts when missing from payload", () => {
    const normalized = normalizeDashboardAnalytics({
      growthSalesMetrics: {
        growth: [],
        sales: [],
        activeOwners: [],
      },
      salesInsights: {
        newWorkspaces: 0,
        newSmartRefillUsers: 0,
        newSalesReps: 0,
        pendingProposals: 0,
        openCommissions: 0,
      },
      proposalPipeline: {
        draft: 0,
        sent: 0,
        accepted: 0,
        declined: 0,
      },
      appFeedback: [],
      businessLocations: [],
      recentBusinesses: [],
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
    });

    expect(normalized.dashboardForecasts).toEqual({
      platform: [],
      smartrefill: [],
      salesPortal: [],
      aiEnabled: false,
    });
  });
});
