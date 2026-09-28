import { describe, expect, it } from "vitest";
import { applySubscriptionEditToAnalytics } from "../../../services/patch-dashboard-subscription";

describe("applySubscriptionEditToAnalytics", () => {
  it("updates the cached station without waiting for a full recompute", () => {
    const next = applySubscriptionEditToAnalytics(
      {
        businessLocations: [{ id: "biz-1", planName: "Scale", billingCycle: "trial" }],
        growthSalesMetrics: {
          activeOwners: [
            {
              id: "biz-1",
              planName: "Scale",
              subscriptions: [
                { id: "sub-1", planName: "Scale", billingCycle: "trial", price: 0 },
              ],
            },
          ],
          subscriptionOwners: [
            {
              id: "biz-1",
              planName: "Scale",
              subscriptions: [
                { id: "sub-1", planName: "Scale", billingCycle: "trial", price: 0 },
              ],
            },
          ],
        },
      },
      {
        businessId: "biz-1",
        subscriptionId: "sub-1",
        planCode: "scale",
        planName: "Scale",
        billingCycle: "monthly",
        price: 1650,
        paymentStatus: "approved",
        expiresAt: "2026-10-13T15:59:59.999Z",
      },
    );

    expect(next.growthSalesMetrics.subscriptionOwners[0]?.planName).toBe("Scale");
    expect(next.growthSalesMetrics.subscriptionOwners[0]?.paymentStatus).toBe("approved");
    expect(next.growthSalesMetrics.subscriptionOwners[0]?.subscriptions[0]).toMatchObject({
      billingCycle: "monthly",
      price: 1650,
      paymentStatus: "approved",
    });
    expect(next.businessLocations[0]?.billingCycle).toBe("monthly");
  });
});
