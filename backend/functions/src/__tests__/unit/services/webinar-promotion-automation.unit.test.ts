import { describe, expect, it } from "vitest";
import { WEBINAR_PROMOTION_MILESTONES } from "../../../services/events-training/webinar-promotion-automation";

describe("webinar promotion automation milestones", () => {
  it("defines publish, weekly, countdown, and ongoing with correct channels", () => {
    const byKey = Object.fromEntries(
      WEBINAR_PROMOTION_MILESTONES.map((m) => [m.key, m]),
    );

    expect(byKey.publish?.channels).toEqual(
      expect.arrayContaining(["email", "meta"]),
    );
    expect(byKey.weekly?.timing).toEqual({ kind: "weekly" });
    expect(byKey.d7?.channels).toEqual(
      expect.arrayContaining(["email", "meta"]),
    );
    expect(byKey.d3?.channels).toEqual(
      expect.arrayContaining(["email", "meta"]),
    );
    expect(byKey.d2?.channels).toEqual(["meta"]);
    expect(byKey.d2?.channels).not.toContain("email");
    expect(byKey.d1?.channels).toEqual(
      expect.arrayContaining(["email", "meta"]),
    );
    expect(byKey.h1?.timing).toEqual({ kind: "hours_before", hours: 1 });
    expect(byKey.h1?.channels).toEqual(
      expect.arrayContaining(["email", "meta"]),
    );
    expect(byKey.ongoing?.timing).toEqual({ kind: "at_start" });
    expect(byKey.ongoing?.channels).toEqual(
      expect.arrayContaining(["email", "meta"]),
    );
  });
});
