import { describe, expect, it } from "vitest";
import { subscriptionRowEligibleForOfficialReceipt } from "../../../utils/subscription-official-receipt-eligibility";
import { buildSubscriptionOfficialReceiptPdf } from "../../../services/subscription-official-receipt-pdf";

describe("subscriptionRowEligibleForOfficialReceipt", () => {
  it("allows verified paid subscriptions", () => {
    expect(
      subscriptionRowEligibleForOfficialReceipt({
        planCode: "growth",
        billingCycle: "monthly",
        price: 999,
        paymentStatus: "verified",
        status: "approved",
      }),
    ).toBe(true);
  });

  it("rejects trial, starter, and pending payment", () => {
    expect(
      subscriptionRowEligibleForOfficialReceipt({
        planCode: "growth",
        billingCycle: "trial",
        price: 0,
        paymentStatus: "verified",
      }),
    ).toBe(false);
    expect(
      subscriptionRowEligibleForOfficialReceipt({
        planCode: "starter",
        billingCycle: "monthly",
        price: 0,
        paymentStatus: "verified",
      }),
    ).toBe(false);
    expect(
      subscriptionRowEligibleForOfficialReceipt({
        planCode: "growth",
        billingCycle: "monthly",
        price: 999,
        paymentStatus: "pending_verification",
      }),
    ).toBe(false);
  });
});

describe("buildSubscriptionOfficialReceiptPdf", () => {
  it("returns a non-empty PDF buffer", async () => {
    const buffer = await buildSubscriptionOfficialReceiptPdf({
      businessName: "Test Station",
      businessEmail: "owner@example.com",
      businessPhone: "09171234567",
      businessAddress: "Parañaque",
      ownerDisplayName: "Alex",
      ownerEmail: "alex@example.com",
      subscriptionId: "sub_1",
      planName: "Growth",
      planCode: "growth",
      billingCycle: "monthly",
      price: 1499,
      paymentMethod: "gcash",
      paymentReference: "GC-123",
      paymentStatus: "verified",
      voucherCode: "",
      periodStart: "Jul 1, 2026",
      periodEnd: "Jul 31, 2026",
      renewalDate: "Aug 1, 2026",
    });
    expect(buffer.byteLength).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
