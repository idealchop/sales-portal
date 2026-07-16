import { describe, expect, it } from "vitest";
import {
  formatBillingCycleLabel,
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
