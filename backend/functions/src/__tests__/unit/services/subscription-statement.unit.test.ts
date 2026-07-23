import { describe, expect, it } from "vitest";
import { subscriptionRowForStatement } from "../../../services/generate-subscription-statement";
import { buildSubscriptionStatementPdf } from "../../../services/subscription-statement-of-account-pdf";

describe("subscriptionRowForStatement", () => {
  it("includes paid periods and excludes free trial", () => {
    expect(
      subscriptionRowForStatement({
        billingCycle: "monthly",
        price: 950,
        paymentStatus: "verified",
      }),
    ).toBe(true);
    expect(
      subscriptionRowForStatement({
        billingCycle: "trial",
        price: 0,
        paymentStatus: "verified",
      }),
    ).toBe(false);
    expect(
      subscriptionRowForStatement({
        billingCycle: "monthly",
        price: 0,
        planCode: "starter",
      }),
    ).toBe(false);
  });
});

describe("buildSubscriptionStatementPdf", () => {
  it("returns a non-empty PDF with multiple payment lines", async () => {
    const buffer = await buildSubscriptionStatementPdf({
      businessName: "Test Station",
      businessEmail: "owner@example.com",
      businessPhone: "09171234567",
      businessAddress: "Parañaque",
      ownerDisplayName: "Alex",
      ownerEmail: "alex@example.com",
      generatedAtLabel: "Jul 23, 2026, 10:30 PM",
      lines: [
        {
          subscriptionId: "sub_2",
          planName: "Grow",
          planCode: "grow",
          billingCycle: "monthly",
          price: 950,
          paymentMethod: "gcash",
          paymentReference: "GC-2",
          paymentStatus: "verified",
          periodStart: "Jul 1, 2026",
          periodEnd: "Jul 31, 2026",
        },
        {
          subscriptionId: "sub_1",
          planName: "Scale",
          planCode: "scale",
          billingCycle: "monthly",
          price: 1650,
          paymentMethod: "bank",
          paymentReference: "BN-1",
          paymentStatus: "verified",
          periodStart: "Jun 1, 2026",
          periodEnd: "Jun 30, 2026",
        },
      ],
    });
    expect(buffer.byteLength).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
