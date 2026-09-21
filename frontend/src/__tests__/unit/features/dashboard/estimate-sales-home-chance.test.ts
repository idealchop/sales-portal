import { describe, expect, it } from "vitest";
import { estimateSalesHomeChance } from "@/features/dashboard/lib/estimate-sales-home-chance";

describe("estimateSalesHomeChance", () => {
  it("gives a higher onboard chance after a demo than a first hello", () => {
    const demo = estimateSalesHomeChance({
      intent: "close_deal",
      stage: "warm",
      assigned: true,
      hasEmail: true,
      attendedDemo: true,
    });
    const hello = estimateSalesHomeChance({
      intent: "hello",
      stage: "warm",
      neverContacted: true,
      hasEmail: true,
    });

    expect(demo.kind).toBe("onboard");
    expect(hello.kind).toBe("onboard");
    expect(demo.percent).toBeGreaterThan(hello.percent);
    expect(demo.percent).toBeGreaterThanOrEqual(45);
    expect(hello.percent).toBeLessThanOrEqual(25);
    expect(demo.label).toBe("Chance they onboard");
  });

  it("treats a still-open trial as continue and an ended trial as return, with a lower percent", () => {
    const open = estimateSalesHomeChance({
      intent: "trial",
      stage: "onboarded",
      trialDays: 2,
      contactedThisWeek: true,
      hasEmail: true,
    });
    const ended = estimateSalesHomeChance({
      intent: "trial",
      stage: "onboarded",
      trialDays: -1,
      daysSinceContact: 14,
      hasEmail: true,
    });

    expect(open.kind).toBe("continue");
    expect(ended.kind).toBe("return");
    expect(open.percent).toBeGreaterThan(ended.percent);
    expect(ended.percent).toBeLessThanOrEqual(20);
  });

  it("scores a quiet station as chance they come back, not a guarantee", () => {
    const quiet = estimateSalesHomeChance({
      intent: "quiet",
      stage: "onboarded",
      isActive: false,
      daysSinceLogin: 10,
    });

    expect(quiet.kind).toBe("return");
    expect(quiet.label).toBe("Chance they come back");
    expect(quiet.percent).toBeGreaterThanOrEqual(10);
    expect(quiet.percent).toBeLessThanOrEqual(35);
    expect(quiet.percent % 5).toBe(0);
  });
});
