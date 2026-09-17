import { describe, expect, it } from "vitest";
import {
  applyLeadAutoQueueRules,
  buildLeadHistoryChanges,
  buildLeadsAnalytics,
  daysLeftFromExpiresAt,
  filterLeads,
  normalizeLead,
  queueForStage,
  resolveAttemptBumpTrack,
  stagesForQueue,
  summarizeLeadHistory,
  type LeadRecord,
} from "../../../services/leads-service";

function sampleLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    userId: "sales-1",
    businessName: "Aqua Station",
    ownerName: "Jane Owner",
    stage: "warm",
    attemptCount: 1,
    warmAttemptCount: 1,
    coldAttemptCount: 0,
    channels: {
      viber: true,
      email: false,
      messenger: false,
      smsCall: false,
    },
    leadSource: "FB Ads",
    ...overrides,
  };
}

describe("leads-service helpers", () => {
  it("maps flow stages to warm, cold, onboarded, and archive queues", () => {
    expect(stagesForQueue("warm")).toEqual(["inquire", "warm", "registered"]);
    expect(stagesForQueue("cold")).toEqual(["cold"]);
    expect(stagesForQueue("onboarded")).toEqual(["onboarded"]);
    expect(stagesForQueue("archive")).toEqual(["archive"]);
    expect(stagesForQueue("content")).toBeNull();
    expect(queueForStage("inquire")).toBe("warm");
    expect(queueForStage("registered")).toBe("warm");
    expect(queueForStage("cold")).toBe("cold");
    expect(queueForStage("onboarded")).toBe("onboarded");
    expect(queueForStage("archive")).toBe("archive");
  });

  it("normalizes unknown stage to inquire", () => {
    const lead = normalizeLead("x", {
      userId: "u1",
      businessName: "Biz",
      ownerName: "Own",
      stage: "mystery",
      channels: { viber: 1 },
    });
    expect(lead.stage).toBe("inquire");
    expect(lead.channels.viber).toBe(true);
    expect(lead.channels.email).toBe(false);
  });

  it("migrates legacy demo values and keeps source detail fields", () => {
    const lead = normalizeLead("x", {
      userId: "u1",
      businessName: "Biz",
      ownerName: "Own",
      attendedDemo: "live",
      leadSource: "Website",
      sourceWebsite: "smartrefill.app",
      referredBy: "should stay if present",
    });
    expect(lead.attendedDemo).toBe("attended");
    expect(lead.sourceWebsite).toBe("smartrefill.app");
    expect(lead.referredBy).toBe("should stay if present");
    expect(
      normalizeLead("y", { attendedDemo: "no", businessName: "A", ownerName: "B" })
        .attendedDemo,
    ).toBe("missed");
  });

  it("filters by queue, assignee, and query", () => {
    const leads = [
      sampleLead({ id: "1", stage: "cold", assignedToUid: "a" }),
      sampleLead({
        id: "2",
        stage: "warm",
        assignedToUid: "b",
        businessName: "Danum Fresh",
      }),
      sampleLead({ id: "3", stage: "registered", assignedToUid: "a" }),
      sampleLead({ id: "4", stage: "onboarded", assignedToUid: "a" }),
      sampleLead({ id: "5", stage: "archive", assignedToUid: "a" }),
      sampleLead({ id: "6", stage: "inquire", assignedToUid: "b" }),
      sampleLead({
        id: "7",
        stage: "inquire",
        sourceKind: "content",
        contentSources: ["webinar"],
        email: "guest@example.com",
      }),
    ];

    expect(
      filterLeads(leads, { queue: "warm" }).map((row) => row.id).sort(),
    ).toEqual(["2", "3", "6"]);
    expect(filterLeads(leads, { queue: "cold" }).map((row) => row.id)).toEqual([
      "1",
    ]);
    expect(
      filterLeads(leads, { queue: "onboarded" }).map((row) => row.id),
    ).toEqual(["4"]);
    expect(
      filterLeads(leads, { queue: "archive" }).map((row) => row.id),
    ).toEqual(["5"]);
    expect(
      filterLeads(leads, { queue: "content" }).map((row) => row.id),
    ).toEqual(["7"]);
    expect(
      filterLeads(
        [
          ...leads,
          sampleLead({
            id: "8",
            stage: "onboarded",
            sourceKind: "manual",
            contentSources: ["article"],
            email: "owner@example.com",
          }),
        ],
        { queue: "content" },
      )
        .map((row) => row.id)
        .sort(),
    ).toEqual(["7", "8"]);
    expect(
      filterLeads(leads, { q: "danum" }).map((row) => row.id),
    ).toEqual(["2"]);
  });

  it("computes trial days left from expiry", () => {
    const now = Date.parse("2026-09-15T00:00:00.000Z");
    expect(
      daysLeftFromExpiresAt("2026-09-15T12:00:00.000Z", now),
    ).toBe(1);
    expect(daysLeftFromExpiresAt("2026-09-14T00:00:00.000Z", now)).toBe(0);
    expect(daysLeftFromExpiresAt(undefined, now)).toBeNull();
  });

  it("builds funnel and queue analytics", () => {
    const now = Date.parse("2026-09-15T00:00:00.000Z");
    const analytics = buildLeadsAnalytics(
      [
        sampleLead({ id: "1", stage: "inquire", leadSource: "FB Ads" }),
        sampleLead({
          id: "2",
          stage: "warm",
          leadSource: "FB Ads",
          stallReason: "Waiting for rider app",
          assignedToUid: "rep-1",
          nextFollowUpAt: "2026-09-10T00:00:00.000Z",
        }),
        sampleLead({
          id: "3",
          stage: "registered",
          leadSource: "Website",
          assignedToUid: "rep-1",
          workspace: { trialDaysLeft: 0 },
        }),
        sampleLead({
          id: "4",
          stage: "onboarded",
          leadSource: "Website",
          workspace: { trialDaysLeft: 2 },
        }),
        sampleLead({ id: "5", stage: "cold", leadSource: "FB Ads" }),
        sampleLead({ id: "6", stage: "archive", leadSource: "Referrals" }),
      ],
      now,
    );

    expect(analytics.queueCounts.warm).toBe(3);
    expect(analytics.queueCounts.content).toBe(0);
    expect(analytics.queueCounts.cold).toBe(1);
    expect(analytics.queueCounts.onboarded).toBe(1);
    expect(analytics.queueCounts.archive).toBe(1);
    expect(analytics.funnel.find((row) => row.stage === "warm")?.count).toBe(1);
    expect(analytics.bySource[0]).toEqual({ name: "FB Ads", count: 3 });
    expect(analytics.trialRisk).toEqual({ daysLeftZero: 1, daysLeftLte3: 2 });
    expect(analytics.byAssignee.find((row) => row.assignedToUid === "rep-1")).toEqual({
      assignedToUid: "rep-1",
      count: 2,
      overdueFollowUps: 1,
    });
    expect(analytics.stallReasons[0]?.name).toBe("Waiting for rider app");
  });

  it("builds lead history change summaries", () => {
    const existing = sampleLead({
      stage: "warm",
      assignedToUid: "a",
      attemptCount: 1,
      attendedDemo: "missed",
      email: "old@example.com",
    });
    const changes = buildLeadHistoryChanges(existing, {
      stage: "cold",
      assignedToUid: "b",
      attemptCount: 2,
      attendedDemo: "attended",
      updatedAt: "ignore",
    });
    expect(changes).toEqual(
      expect.arrayContaining([
        { field: "stage", from: "warm", to: "cold" },
        { field: "assignedToUid", from: "a", to: "b" },
        { field: "attemptCount", from: "1", to: "2" },
        { field: "attendedDemo", from: "missed", to: "attended" },
      ]),
    );
    expect(summarizeLeadHistory(changes, "updated")).toBe("Updated status");
    expect(
      summarizeLeadHistory(
        [{ field: "email", from: "a@x.com", to: "b@x.com" }],
        "updated",
      ),
    ).toBe("Updated details");
    expect(summarizeLeadHistory([], "tracking_started")).toBe(
      "CRM tracking started",
    );
  });

  it("applies auto queue rules for missed demo and attempt tracks", () => {
    const missedPatch: Record<string, unknown> = {
      attendedDemo: "missed",
      stage: "warm",
      warmStatus: "Decision Pending",
    };
    applyLeadAutoQueueRules({
      existing: sampleLead({
        attemptCount: 2,
        warmAttemptCount: 2,
        coldAttemptCount: 0,
      }),
      patch: missedPatch,
    });
    expect(missedPatch.stage).toBe("cold");
    expect(missedPatch.warmStatus).toBe("Missed Demo");

    const reschedulePatch: Record<string, unknown> = {
      attendedDemo: "missed",
      stage: "warm",
      warmStatus: "Demo Scheduled",
    };
    applyLeadAutoQueueRules({
      existing: sampleLead({
        stage: "cold",
        attendedDemo: "missed",
        warmStatus: "Missed Demo",
        warmAttemptCount: 2,
        coldAttemptCount: 0,
      }),
      patch: reschedulePatch,
    });
    expect(reschedulePatch.stage).toBe("warm");
    expect(reschedulePatch.attendedDemo).toBeNull();
    expect(reschedulePatch.warmStatus).toBe("Demo Scheduled");

    const warmArchivePatch: Record<string, unknown> = {
      warmAttemptCount: 8,
      coldAttemptCount: 0,
      stage: "warm",
    };
    applyLeadAutoQueueRules({
      existing: sampleLead({
        attemptCount: 7,
        warmAttemptCount: 7,
        coldAttemptCount: 0,
      }),
      patch: warmArchivePatch,
    });
    expect(warmArchivePatch.stage).toBe("archive");

    const coldArchivePatch: Record<string, unknown> = {
      warmAttemptCount: 1,
      coldAttemptCount: 3,
      stage: "cold",
    };
    applyLeadAutoQueueRules({
      existing: sampleLead({
        stage: "cold",
        attemptCount: 3,
        warmAttemptCount: 1,
        coldAttemptCount: 2,
      }),
      patch: coldArchivePatch,
    });
    expect(coldArchivePatch.stage).toBe("archive");

    expect(resolveAttemptBumpTrack("warm", "cold")).toBe("warm");
    expect(resolveAttemptBumpTrack("cold", "warm")).toBe("none");
    expect(resolveAttemptBumpTrack("cold", "cold")).toBe("cold");
  });
});
