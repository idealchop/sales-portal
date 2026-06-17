import { describe, expect, it } from "vitest";
import { buildSubscriptionApprovalQueue } from "@/features/dashboard/lib/build-subscription-approval-queue";
import type { ActiveOwner } from "@/lib/dashboard/analytics";

const owner = (
  id: string,
  subs: ActiveOwner["subscriptions"],
): ActiveOwner => ({
  id,
  businessName: `Business ${id}`,
  customers: 1,
  transactionsLast30Days: 0,
  healthTier: "medium",
  onboardingComplete: true,
  monthlyRevenue: 0,
  subscriptions: subs,
});

describe("buildSubscriptionApprovalQueue", () => {
  it("returns only subscriptions that need approval", () => {
    const queue = buildSubscriptionApprovalQueue([
      owner("b1", [
        {
          id: "s1",
          planName: "Scale",
          status: "pending",
          price: 999,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: true,
          isDowngrade: false,
          isCancellation: false,
          createdAt: "2026-06-01",
        },
        {
          id: "s2",
          planName: "Starter",
          status: "approved",
          price: 499,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
        },
      ]),
    ]);

    expect(queue).toHaveLength(1);
    expect(queue[0]?.subscription.id).toBe("s1");
    expect(queue[0]?.businessId).toBe("b1");
  });

  it("sorts newest approvals first", () => {
    const queue = buildSubscriptionApprovalQueue([
      owner("b1", [
        {
          id: "old",
          planName: "A",
          status: "pending",
          price: 1,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: true,
          isDowngrade: false,
          isCancellation: false,
          createdAt: "2026-05-01",
        },
      ]),
      owner("b2", [
        {
          id: "new",
          planName: "B",
          status: "pending",
          price: 2,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: true,
          isDowngrade: false,
          isCancellation: false,
          createdAt: "2026-06-15",
        },
      ]),
    ]);

    expect(queue.map((row) => row.subscription.id)).toEqual(["new", "old"]);
  });
});
