import { describe, expect, it } from "vitest";
import {
  excludeSalesConnectedLeads,
  mergeCrmOverlays,
  resolveLeadPlatformRole,
  resolvePipelineStage,
  shouldIncludeAuthUserAsWarmLead,
  stageFromLegacyStation,
} from "../../../services/build-smartrefill-pipeline-leads";
import type { LeadRecord } from "../../../services/leads-service";

function sample(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "sr-business:b1",
    userId: "smartrefill",
    businessName: "Aqua",
    ownerName: "Jane",
    email: "jane@example.com",
    stage: "registered",
    attemptCount: 0,
    platformSource: "smartrefill",
    channels: {
      viber: false,
      email: false,
      messenger: false,
      smsCall: false,
    },
    linkedBusinessId: "b1",
    workspace: { onboardingComplete: false },
    ...overrides,
  };
}

describe("stageFromLegacyStation", () => {
  it("never maps legacy stations to onboarded", () => {
    expect(stageFromLegacyStation({ triageStatus: "open" })).toBe("registered");
    expect(stageFromLegacyStation({ triageStatus: "contacted" })).toBe("cold");
    expect(stageFromLegacyStation({ triageStatus: "ignored" })).toBe("archive");
  });
});

describe("resolvePipelineStage", () => {
  it("puts SmartRefill onboarded workspaces in onboarded", () => {
    expect(
      resolvePipelineStage({
        platformSource: "smartrefill",
        onboardingComplete: true,
        baseStage: "registered",
      }),
    ).toBe("onboarded");
  });

  it("puts SmartRefill not-yet-onboarded workspaces in warm (registered)", () => {
    expect(
      resolvePipelineStage({
        platformSource: "smartrefill",
        onboardingComplete: false,
        baseStage: "onboarded",
      }),
    ).toBe("registered");
  });

  it("keeps inquire and demo in warm stages", () => {
    expect(
      resolvePipelineStage({
        platformSource: "smartrefill",
        onboardingComplete: false,
        baseStage: "inquire",
      }),
    ).toBe("inquire");
    expect(
      resolvePipelineStage({
        platformSource: "smartrefill",
        baseStage: "warm",
        overlayStage: "onboarded",
      }),
    ).toBe("warm");
  });

  it("keeps legacy stations out of onboarded", () => {
    expect(
      resolvePipelineStage({
        platformSource: "smartrefill_legacy",
        onboardingComplete: true,
        baseStage: "registered",
      }),
    ).toBe("registered");
  });

  it("still allows CRM cold/archive overlays", () => {
    expect(
      resolvePipelineStage({
        platformSource: "smartrefill",
        onboardingComplete: true,
        overlayStage: "cold",
        baseStage: "onboarded",
      }),
    ).toBe("cold");
  });
});

describe("resolveLeadPlatformRole", () => {
  it("maps inquire/demo to Prospect and workspaces to Owner", () => {
    expect(
      resolveLeadPlatformRole({
        platformSource: "smartrefill",
        sourceKind: "demo_request",
      }),
    ).toBe("Prospect");
    expect(
      resolveLeadPlatformRole({
        platformSource: "smartrefill",
        leadSource: "SmartRefill workspace",
        isBusinessOwner: true,
      }),
    ).toBe("Owner");
    expect(
      resolveLeadPlatformRole({
        platformSource: "smartrefill",
        leadSource: "Registered account",
      }),
    ).toBe("Registered");
  });

  it("uses Owner or Staff for SmartRefill appAccess", () => {
    expect(
      resolveLeadPlatformRole({
        platformSource: "smartrefill",
        appAccess: [{ appId: "smartrefill", role: "admin" }],
      }),
    ).toBe("Staff");
    expect(
      resolveLeadPlatformRole({
        platformSource: "smartrefill",
        appAccess: [{ appId: "smartrefill", role: "owner" }],
      }),
    ).toBe("Owner");
  });

  it("assumes Owner for all legacy rows", () => {
    expect(
      resolveLeadPlatformRole({
        platformSource: "smartrefill_legacy",
        appAccess: [{ appId: "smartrefill", role: "staff" }],
      }),
    ).toBe("Owner");
    expect(
      resolveLeadPlatformRole({
        platformSource: "smartrefill_legacy",
        leadSource: "SmartRefill legacy station",
      }),
    ).toBe("Owner");
  });
});

describe("shouldIncludeAuthUserAsWarmLead", () => {
  const emptySales = { uids: new Set<string>(), emails: new Set<string>() };

  it("includes Auth users who are not yet in SmartRefill or sales", () => {
    expect(
      shouldIncludeAuthUserAsWarmLead({
        uid: "u1",
        email: "new@example.com",
        hasSmartRefillAccess: false,
        isBusinessOwner: false,
        sales: emptySales,
        coveredEmails: new Set(),
      }),
    ).toBe(true);
  });

  it("excludes sales, SmartRefill members, owners, and covered emails", () => {
    expect(
      shouldIncludeAuthUserAsWarmLead({
        uid: "sales-1",
        email: "rep@example.com",
        hasSmartRefillAccess: false,
        isBusinessOwner: false,
        sales: { uids: new Set(["sales-1"]), emails: new Set() },
        coveredEmails: new Set(),
      }),
    ).toBe(false);
    expect(
      shouldIncludeAuthUserAsWarmLead({
        uid: "u2",
        email: "owner@example.com",
        hasSmartRefillAccess: true,
        isBusinessOwner: false,
        sales: emptySales,
        coveredEmails: new Set(),
      }),
    ).toBe(false);
    expect(
      shouldIncludeAuthUserAsWarmLead({
        uid: "u3",
        email: "dup@example.com",
        hasSmartRefillAccess: false,
        isBusinessOwner: false,
        sales: emptySales,
        coveredEmails: new Set(["dup@example.com"]),
      }),
    ).toBe(false);
  });
});

describe("excludeSalesConnectedLeads", () => {
  it("drops leads matching sales uid or email", () => {
    const filtered = excludeSalesConnectedLeads(
      [
        sample({ id: "1", userId: "sales-1", email: "a@x.com" }),
        sample({ id: "2", userId: "u2", email: "rep@example.com" }),
        sample({ id: "3", userId: "u3", email: "keep@example.com" }),
      ],
      {
        uids: new Set(["sales-1"]),
        emails: new Set(["rep@example.com"]),
      },
    );
    expect(filtered.map((row) => row.id)).toEqual(["3"]);
  });
});

describe("mergeCrmOverlays", () => {
  it("applies CRM stage overlays onto SmartRefill rows", () => {
    const merged = mergeCrmOverlays(
      [sample()],
      [
        sample({
          id: "crm-1",
          stage: "cold",
          attemptCount: 4,
          linkedBusinessId: "b1",
          notes: "No answer",
        }),
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.stage).toBe("cold");
    expect(merged[0]?.attemptCount).toBe(4);
    expect(merged[0]?.notes).toBe("No answer");
    expect(merged[0]?.id).toBe("sr-business:b1");
    expect(merged[0]?.platformSource).toBe("smartrefill");
  });

  it("forces SmartRefill onboardingComplete into onboarded even without CRM", () => {
    const merged = mergeCrmOverlays(
      [
        sample({
          stage: "registered",
          workspace: { onboardingComplete: true },
        }),
      ],
      [],
    );
    expect(merged[0]?.stage).toBe("onboarded");
  });

  it("does not let CRM mark legacy rows as onboarded", () => {
    const merged = mergeCrmOverlays(
      [
        sample({
          id: "sr-legacy:station:s1",
          platformSource: "smartrefill_legacy",
          linkedBusinessId: undefined,
          email: "legacy@example.com",
          stage: "registered",
          workspace: { onboardingComplete: true },
        }),
      ],
      [
        sample({
          id: "crm-legacy",
          email: "legacy@example.com",
          linkedBusinessId: undefined,
          stage: "onboarded",
        }),
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.stage).toBe("registered");
    expect(merged[0]?.platformSource).toBe("smartrefill_legacy");
  });

  it("keeps manual CRM-only leads", () => {
    const merged = mergeCrmOverlays(
      [sample()],
      [
        sample({
          id: "crm-manual",
          linkedBusinessId: undefined,
          email: "other@example.com",
          stage: "archive",
          businessName: "Manual lead",
        }),
      ],
    );
    expect(merged.map((row) => row.id).sort()).toEqual([
      "crm-manual",
      "sr-business:b1",
    ]);
  });
});
