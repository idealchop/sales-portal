import { describe, expect, it } from "vitest";
import { isPaidSubscribedPlan } from "@/lib/dashboard/subscription-plan-codes";
import {
  displaySubscriptionPlanName,
  formatBillingCycleLabel,
  formatSubscriptionListAmount,
  formatSubscriptionPeriod,
  formatSubscriptionDate,
  formatTrialDaysRemaining,
  trialDaysRemainingCount,
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
    expect(trialDaysRemainingCount(undefined)).toBeNull();
  });

  it("returns a numeric day count for sorting", () => {
    expect(
      trialDaysRemainingCount(
        "2026-07-12T00:00:00.000Z",
        new Date("2026-07-05T12:00:00"),
      ),
    ).toBe(7);
  });

  it("formats ISO timestamps and date-only last-active days", () => {
    expect(formatSubscriptionDate("2026-09-01T00:00:00.000Z")).toMatch(/Sep/);
    expect(formatSubscriptionDate("2026-09-21")).toMatch(/Sep 21/);
    expect(formatSubscriptionDate(undefined)).toBe("—");
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

describe("isPaidSubscribedPlan", () => {
  it("counts paid Starter–Scale only", () => {
    expect(
      isPaidSubscribedPlan({
        planCode: "starter",
        planName: "Starter",
        price: 399,
        billingCycle: "monthly",
      }),
    ).toBe(true);
    expect(
      isPaidSubscribedPlan({
        planCode: "grow",
        planName: "Grow",
        price: 950,
        billingCycle: "monthly",
      }),
    ).toBe(true);
    expect(
      isPaidSubscribedPlan({
        planCode: "scale",
        planName: "Scale",
        price: 1650,
        billingCycle: "monthly",
      }),
    ).toBe(true);
  });

  it("excludes Free, trial, and unpaid Starter", () => {
    expect(
      isPaidSubscribedPlan({
        planCode: "free",
        planName: "Free",
        price: 0,
        billingCycle: "monthly",
      }),
    ).toBe(false);
    expect(
      isPaidSubscribedPlan({
        planCode: "starter",
        planName: "Starter",
        price: 0,
        billingCycle: "monthly",
      }),
    ).toBe(false);
    expect(
      isPaidSubscribedPlan({
        planCode: "scale",
        planName: "Scale",
        price: 0,
        billingCycle: "trial",
      }),
    ).toBe(false);
  });
});
