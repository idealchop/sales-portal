import { describe, expect, it } from "vitest";
import {
  assertOverwriteNote,
  assertOverwritePlanCode,
  monthlyPriceFromPlan,
  parseTrialEnd,
  subscriptionOverwritePatch,
} from "../../../services/update-trial-subscription";

describe("overwrite trial subscription", () => {
  it("allows Free through Scale and requires a reason", () => {
    expect(assertOverwritePlanCode(" Scale ")).toBe("scale");
    expect(assertOverwritePlanCode("free")).toBe("free");
    expect(() => assertOverwritePlanCode("custom")).toThrow("PLAN_NOT_ALLOWED");
    expect(() => assertOverwriteNote("short")).toThrow("NOTE_REQUIRED");
    expect(assertOverwriteNote("  Moved from free trial to Scale.  ")).toBe(
      "Moved from free trial to Scale.",
    );
  });

  it("rejects an end date that already passed", () => {
    expect(() => parseTrialEnd("2020-01-01T00:00:00.000Z", new Date("2026-09-29"))).toThrow(
      "EXPIRY_IN_PAST",
    );
  });

  it("reads the monthly catalog price", () => {
    expect(monthlyPriceFromPlan({ pricing: { monthly: 1650 } })).toBe(1650);
    expect(monthlyPriceFromPlan({})).toBe(0);
  });

  it("replaces the trial with the chosen plan and stores the note", () => {
    const expiresAt = new Date("2026-10-20T15:59:59.999Z");
    const patch = subscriptionOverwritePatch({
      planCode: "scale",
      planId: "scale-plan",
      planName: "Scale",
      listPrice: 1650,
      paid: false,
      limitations: { customers: "full" },
      capabilities: { scalePlatform: true },
      expiresAt,
      note: "Moved from free trial to Scale.",
      previousPlanCode: "scale",
      previousBillingCycle: "trial",
      actorUid: "admin-1",
      now: new Date("2026-09-29T00:00:00.000Z"),
    });

    expect(patch.billingCycle).toBe("monthly");
    expect(patch.price).toBe(0);
    expect(patch["metadata.collectedAmount"]).toBe(0);
    expect(patch["metadata.listPrice"]).toBe(1650);
    expect(patch["metadata.overridePayment"]).toBe("granted");
    expect(patch.planCode).toBe("scale");
    expect(patch.paymentStatus).toBe("approved");
    expect(patch.paymentMethod).toBe("manual");
    expect(patch["metadata.overrideNote"]).toBe("Moved from free trial to Scale.");
    expect(patch["metadata.changeType"]).toBe("override");
    expect(patch["metadata.previousBillingCycle"]).toBe("trial");
    expect(patch["metadata.trialState"]).toBe("converted");
    expect(patch.planLimitationsSnapshot).toEqual({ customers: "full" });
  });

  it("records a paid overwrite at the catalog price", () => {
    const patch = subscriptionOverwritePatch({
      planCode: "scale",
      planId: "scale-plan",
      planName: "Scale",
      listPrice: 1650,
      paid: true,
      limitations: {},
      capabilities: {},
      expiresAt: new Date("2026-10-20T15:59:59.999Z"),
      note: "Customer paid for Scale.",
      actorUid: "admin-1",
    });
    expect(patch.price).toBe(1650);
    expect(patch["metadata.overridePayment"]).toBe("paid");
    expect(patch["metadata.collectedAmount"]).toBe(1650);
  });
});
