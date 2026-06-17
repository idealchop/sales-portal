import { describe, expect, it } from "vitest";
import { buildTodaysWorkInbox } from "../../../services/build-todays-work-inbox";

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

const EMPTY_PERSONAL = {
  totalProposals: 0,
  totalClients: 0,
  pipelineValue: 0,
  acceptedValue: 0,
  winRate: 0,
  commissionsMtd: 0,
  pendingCommissions: 0,
  paidCommissionsMtd: 0,
  draftsNeedingAction: 0,
  sentAwaitingResponse: 0,
};

describe("buildTodaysWorkInbox", () => {
  it("dedupes sales actions and AI insights for the same business", () => {
    const items = buildTodaysWorkInbox({
      salesActions: [
        {
          id: "a1",
          businessId: "b1",
          businessName: "Acme Water",
          actionType: "payment_pending",
          priority: "high",
          headline: "Verify payment",
          detail: "Pending",
          ownerEmail: "owner@acme.com",
        },
      ],
      aiSalesInsights: {
        ...EMPTY_AI,
        priorityActions: [
          {
            businessName: "Acme Water",
            recommendedAction: "Verify payment",
            reason: "AI",
            priority: "high",
          },
        ],
      },
      personalSales: EMPTY_PERSONAL,
      pendingApprovalCount: 0,
    });

    expect(items.filter((row) => row.title === "Acme Water")).toHaveLength(1);
  });

  it("includes approvals and proposal follow-ups", () => {
    const items = buildTodaysWorkInbox({
      salesActions: [],
      aiSalesInsights: EMPTY_AI,
      personalSales: {
        ...EMPTY_PERSONAL,
        draftsNeedingAction: 2,
        sentAwaitingResponse: 1,
      },
      pendingApprovalCount: 3,
    });

    expect(items.some((row) => row.source === "approval")).toBe(true);
    expect(items.some((row) => row.source === "proposal")).toBe(true);
  });
});
