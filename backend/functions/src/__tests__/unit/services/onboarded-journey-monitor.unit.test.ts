import { describe, expect, it } from "vitest";
import {
  computeJourneyDay,
  evaluateOnboardedJourney,
  isOnboardedActive,
} from "../../../services/onboarded-journey-monitor";

describe("onboarded-journey-monitor", () => {
  const onboardedAt = "2026-09-01T00:00:00.000Z";

  it("computes 1-based journey day from onboardedAt", () => {
    expect(computeJourneyDay(onboardedAt, new Date("2026-09-01T12:00:00.000Z"))).toBe(1);
    expect(computeJourneyDay(onboardedAt, new Date("2026-09-08T12:00:00.000Z"))).toBe(8);
    expect(computeJourneyDay(onboardedAt, new Date("2026-09-15T12:00:00.000Z"))).toBe(15);
  });

  it("is active only when GS≥3 and activity days >7", () => {
    expect(
      isOnboardedActive({ gettingStartedCompleted: 3, activityDayCount: 8 }),
    ).toBe(true);
    expect(
      isOnboardedActive({ gettingStartedCompleted: 2, activityDayCount: 10 }),
    ).toBe(false);
    expect(
      isOnboardedActive({ gettingStartedCompleted: 5, activityDayCount: 7 }),
    ).toBe(false);
  });

  it("day 7 inactive has no journey flags", () => {
    const result = evaluateOnboardedJourney({
      onboardedAt,
      gettingStartedCompleted: 0,
      activityDayCount: 0,
      now: new Date("2026-09-07T12:00:00.000Z"),
    });
    expect(result.journeyDay).toBe(7);
    expect(result.journeyPhase).toBe("day1_7");
    expect(result.flags).toEqual([]);
  });

  it("day 8 inactive flags journey_inactive_day8", () => {
    const result = evaluateOnboardedJourney({
      onboardedAt,
      gettingStartedCompleted: 1,
      activityDayCount: 2,
      now: new Date("2026-09-08T12:00:00.000Z"),
    });
    expect(result.journeyPhase).toBe("day8_14");
    expect(result.flags).toEqual(["journey_inactive_day8"]);
  });

  it("day 15+ inactive flags recommend_move_to_cold (flag-only)", () => {
    const result = evaluateOnboardedJourney({
      onboardedAt,
      gettingStartedCompleted: 1,
      activityDayCount: 2,
      now: new Date("2026-09-16T12:00:00.000Z"),
      subscription: {
        status: "active",
        expiresAt: "2026-09-20T00:00:00.000Z",
      },
    });
    expect(result.journeyPhase).toBe("day15_plus");
    expect(result.flags).toContain("recommend_move_to_cold");
    expect(result.flags).toContain("subscription_expiring_soon");
  });

  it("active graduates and surfaces subscription flags without journey flags", () => {
    const result = evaluateOnboardedJourney({
      onboardedAt,
      gettingStartedCompleted: 5,
      activityDayCount: 10,
      now: new Date("2026-09-10T12:00:00.000Z"),
      subscription: {
        status: "grace_period",
        expiresAt: "2026-09-05T00:00:00.000Z",
      },
      recentSubscriptionChanges: [
        {
          changeType: "renew",
          createdAt: "2026-09-09T00:00:00.000Z",
        },
      ],
    });
    expect(result.isActive).toBe(true);
    expect(result.journeyPhase).toBe("graduated");
    expect(result.flags).not.toContain("journey_inactive_day8");
    expect(result.flags).not.toContain("recommend_move_to_cold");
    expect(result.flags).toContain("subscription_grace_period");
    expect(result.flags).toContain("subscription_renew");
  });

  it("does not auto-mutate stage (evaluator returns flags only)", () => {
    const result = evaluateOnboardedJourney({
      onboardedAt,
      gettingStartedCompleted: 0,
      activityDayCount: 0,
      now: new Date("2026-09-20T12:00:00.000Z"),
    });
    expect(result.flags).toEqual(["recommend_move_to_cold"]);
    expect(result).not.toHaveProperty("stage");
  });
});
