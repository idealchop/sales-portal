import { describe, expect, it } from "vitest";
import {
  subscriptionEligibleForOfficialReceipt,
  subscriptionHistoryHasStatementPayments,
} from "@/features/dashboard/lib/subscription-official-receipt-eligibility";

describe("subscriptionEligibleForOfficialReceipt", () => {
  it("allows verified paid rows", () => {
    expect(
      subscriptionEligibleForOfficialReceipt({
        planName: "Growth",
        planCode: "growth",
        billingCycle: "monthly",
        price: 999,
        paymentStatus: "verified",
        status: "approved",
      }),
    ).toBe(true);
  });

  it("blocks trial and pending", () => {
    expect(
      subscriptionEligibleForOfficialReceipt({
        planName: "Growth",
        billingCycle: "trial",
        price: 0,
        status: "active",
      }),
    ).toBe(false);
    expect(
      subscriptionEligibleForOfficialReceipt({
        planName: "Growth",
        planCode: "growth",
        billingCycle: "monthly",
        price: 999,
        paymentStatus: "pending_verification",
        status: "pending",
      }),
    ).toBe(false);
  });
});

describe("subscriptionHistoryHasStatementPayments", () => {
  it("detects paid history for statement of account", () => {
    expect(
      subscriptionHistoryHasStatementPayments([
        { billingCycle: "trial", price: 0 },
        { billingCycle: "monthly", price: 950 },
      ]),
    ).toBe(true);
    expect(
      subscriptionHistoryHasStatementPayments([
        { billingCycle: "trial", price: 0 },
      ]),
    ).toBe(false);
  });
});
