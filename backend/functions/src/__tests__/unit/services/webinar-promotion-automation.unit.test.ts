import { describe, expect, it } from "vitest";
import { WEBINAR_PROMOTION_MILESTONES } from "../../../services/events-training/webinar-promotion-automation";

describe("webinar promotion automation milestones", () => {
  it("defines publish, weekly, countdown, and ongoing as email channels only", () => {
    const byKey = Object.fromEntries(
      WEBINAR_PROMOTION_MILESTONES.map((m) => [m.key, m]),
    );

    expect(byKey.d2).toBeUndefined();
    for (const milestone of WEBINAR_PROMOTION_MILESTONES) {
      expect(milestone.channels).toContain("email");
      expect(milestone.channels).not.toContain("meta");
    }

    expect(byKey.publish?.channels).toEqual(
      expect.arrayContaining(["email", "in_app"]),
    );
    expect(byKey.weekly?.timing).toEqual({ kind: "weekly" });
    expect(byKey.d7?.timing).toEqual({ kind: "days_before", days: 7 });
    expect(byKey.d3?.timing).toEqual({ kind: "days_before", days: 3 });
    expect(byKey.d1?.timing).toEqual({ kind: "days_before", days: 1 });
    expect(byKey.h1?.timing).toEqual({ kind: "hours_before", hours: 1 });
    expect(byKey.ongoing?.timing).toEqual({ kind: "at_start" });
  });
});
