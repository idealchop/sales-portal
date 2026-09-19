import { describe, expect, it } from "vitest";
import {
  displaySubscriptionPlanName,
  formatBillingCycleLabel,
  formatSubscriptionListAmount,
  formatSubscriptionPeriod,
  formatTrialDaysRemaining,
  isTrialBillingCycle,
} from "@/lib/dashboard/subscription-labels";

describe("subscription-labels trial helpers", () => {
  it("identifies trial billing cycle", () => {
    expect(isTrialBillingCycle("trial")).toBe(true);
    expect(isTrialBillingCycle("monthly")).toBe(false);
    expect(isTrialBillingCycle(undefined)).toBe(false);
  });

  it("formats trial billing as Free Trial", () => {
    expect(formatBillingCycleLabel("trial")).toBe("Free Trial");
    expect(formatBillingCycleLabel("monthly")).toBe("monthly");
    expect(formatBillingCycleLabel(undefined)).toBeUndefined();
  });

  it("calculates days left for a 7-day trial window", () => {
    const referenceDate = new Date("2026-07-05T12:00:00");
    const expiresAt = "2026-07-12T00:00:00.000Z";

    expect(formatTrialDaysRemaining(expiresAt, referenceDate)).toBe("7 days left");
  });

  it("shows last day and ended states", () => {
    const expiresAt = "2026-07-12T00:00:00.000Z";

    expect(
      formatTrialDaysRemaining(expiresAt, new Date("2026-07-12T08:00:00")),
    ).toBe("Last day of trial");
    expect(
      formatTrialDaysRemaining(expiresAt, new Date("2026-07-13T08:00:00")),
    ).toBe("Trial ended");
  });

  it("returns null when expiry is missing", () => {
    expect(formatTrialDaysRemaining(undefined)).toBeNull();
  });
});

describe("formatSubscriptionPeriod", () => {
  it("shows Free as indefinite and paid Starter with dates", () => {
    expect(
      formatSubscriptionPeriod({
        planCode: "free",
        planName: "Free",
        createdAt: "2026-09-01T00:00:00.000Z",
      }),
    ).toMatch(/indefinite/);
    expect(
      formatSubscriptionPeriod({
        planCode: "starter",
        planName: "Starter",
        billingCycle: "monthly",
        createdAt: "2026-09-01T00:00:00.000Z",
        expiresAt: "2026-10-01T00:00:00.000Z",
      }),
    ).not.toMatch(/indefinite/);
  });

  it("labels unpaid Starter as Free and voucher Scale as a peso amount", () => {
    expect(
      displaySubscriptionPlanName({
        planCode: "starter",
        planName: "Starter",
        price: 0,
      }),
    ).toBe("Free");
    expect(
      formatSubscriptionListAmount({
        planCode: "starter",
        planName: "Starter",
        price: 0,
      }),
    ).toBe("Free");
    expect(
      formatSubscriptionListAmount({
        planCode: "scale",
        planName: "Scale",
        price: 0,
        billingCycle: "monthly",
      }),
    ).toMatch(/₱0/);
    expect(
      formatSubscriptionListAmount({
        planCode: "scale",
        planName: "Scale",
        price: 1650,
        billingCycle: "monthly",
      }),
    ).toMatch(/1,650/);
  });
});
