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
