import { describe, expect, it } from "vitest";
import {
  inferPrivateAudience,
  memberPlanAllowsPrivateVideo,
  privateAudienceAccess,
} from "@/features/events-training/lib/private-audience";

describe("private-audience", () => {
  it("maps presets to allowAllMembers / allowedPlanCodes", () => {
    expect(privateAudienceAccess("all")).toEqual({
      allowAllMembers: true,
      allowedPlanCodes: [],
    });
    expect(privateAudienceAccess("paid")).toEqual({
      allowAllMembers: false,
      allowedPlanCodes: ["grow", "pro", "scale"],
    });
    expect(privateAudienceAccess("scale")).toEqual({
      allowAllMembers: false,
      allowedPlanCodes: ["scale"],
    });
  });

  it("infers preset from stored fields", () => {
    expect(
      inferPrivateAudience({ allowAllMembers: true, allowedPlanCodes: [] }),
    ).toBe("all");
    expect(
      inferPrivateAudience({
        allowAllMembers: false,
        allowedPlanCodes: ["scale"],
      }),
    ).toBe("scale");
    expect(
      inferPrivateAudience({
        allowAllMembers: false,
        allowedPlanCodes: ["grow", "pro", "scale"],
      }),
    ).toBe("paid");
  });

  it("matches grow/pro aliases and scale for paid gates", () => {
    expect(
      memberPlanAllowsPrivateVideo({
        memberPlanCode: "grow",
        allowedPlanCodes: ["grow", "pro", "scale"],
      }),
    ).toBe(true);
    expect(
      memberPlanAllowsPrivateVideo({
        memberPlanCode: "pro",
        allowedPlanCodes: ["grow", "pro", "scale"],
      }),
    ).toBe(true);
    expect(
      memberPlanAllowsPrivateVideo({
        memberPlanCode: "starter",
        allowedPlanCodes: ["grow", "pro", "scale"],
      }),
    ).toBe(false);
    expect(
      memberPlanAllowsPrivateVideo({
        memberPlanCode: "grow",
        allowedPlanCodes: ["scale"],
      }),
    ).toBe(false);
    expect(
      memberPlanAllowsPrivateVideo({
        memberPlanCode: "scale",
        allowedPlanCodes: ["scale"],
      }),
    ).toBe(true);
  });
});
