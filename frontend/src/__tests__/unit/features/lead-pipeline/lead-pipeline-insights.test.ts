import { describe, expect, it } from "vitest";
import {
  attemptIntensityBand,
  buildLeadPipelineInsights,
} from "@/features/lead-pipeline/lib/lead-pipeline-insights";
import type { Lead } from "@/lib/definitions";

function sampleLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "1",
    userId: "u1",
    businessName: "Aqua",
    ownerName: "Jane",
    stage: "warm",
    attemptCount: 0,
    warmAttemptCount: 0,
    coldAttemptCount: 0,
    channels: {
      viber: false,
      email: false,
      messenger: false,
      smsCall: false,
    },
    ...overrides,
  };
}

describe("buildLeadPipelineInsights", () => {
  it("builds KPIs and queue mix from leads", () => {
    const now = Date.parse("2026-09-15T12:00:00.000Z");
    const model = buildLeadPipelineInsights(
      [
        sampleLead({
          id: "a",
          stage: "warm",
          warmStatus: "Decision Pending",
          platformSource: "smartrefill",
          assignedToUid: "sales-1",
          nextFollowUpAt: "2026-09-10T12:00:00.000Z",
          channels: { viber: true, email: false, messenger: false, smsCall: false },
        }),
        sampleLead({
          id: "b",
          stage: "cold",
          warmStatus: "No Response",
          platformSource: "smartrefill_legacy",
          warmAttemptCount: 0,
          coldAttemptCount: 2,
        }),
        sampleLead({
          id: "c",
          stage: "archive",
          warmStatus: "Duplicate Record: keep sr-business:x",
        }),
      ],
      {
        nowMs: now,
        assigneeNames: { "sales-1": "Alex Sales" },
      },
    );

    expect(model.kpis.total).toBe(3);
    expect(model.kpis.unassigned).toBe(2);
    expect(model.kpis.overdueFollowUps).toBe(1);
    expect(model.kpis.neverContacted).toBe(3);
    expect(model.byQueue).toEqual([
      { name: "Content", count: 0 },
      { name: "Warm", count: 1 },
      { name: "Cold", count: 1 },
      { name: "Onboarded", count: 0 },
      { name: "Archives", count: 1 },
    ]);
    expect(model.byPlatform.map((row) => row.name).sort()).toEqual([
      "Legacy SmartRefill",
      "SmartRefill",
      "Unknown",
    ]);
    expect(model.byAssignee[0]).toMatchObject({
      name: "Unassigned",
      count: 2,
    });
    expect(model.byAssignee).toContainEqual({
      name: "Alex Sales",
      count: 1,
      overdueFollowUps: 1,
    });
    expect(model.followUpHealth.find((row) => row.name === "Overdue")?.count).toBe(
      1,
    );
    expect(model.byChannel).toEqual([{ name: "Viber", count: 1 }]);
    expect(model.byStatus.some((row) => row.name === "Decision Pending")).toBe(
      true,
    );
    expect(model.attemptsByQueue.find((row) => row.band === "0")).toMatchObject({
      warm_Warm: 1,
      warm_Cold: 1, // cold-queue lead still has 0 warm attempts
      warm_Archives: 1,
      cold_Warm: 1,
      cold_Cold: 0,
      cold_Archives: 1,
    });
    // Cold lead with 2 cold attempts → 50–99% of cold limit (3)
    expect(
      model.attemptsByQueue.find((row) => row.band === "50–99%"),
    ).toMatchObject({
      cold_Cold: 1,
    });
    expect(model.queueHealthRadar.map((row) => row.queue)).toEqual([
      "Content",
      "Warm",
      "Cold",
      "Onboarded",
      "Archives",
    ]);
  });

  it("maps warm and cold attempts onto a shared % of limit scale", () => {
    expect(attemptIntensityBand(0, 8)).toBe("0");
    expect(attemptIntensityBand(1, 8)).toBe("<50%");
    expect(attemptIntensityBand(4, 8)).toBe("50–99%");
    expect(attemptIntensityBand(8, 8)).toBe("At limit");
    expect(attemptIntensityBand(1, 3)).toBe("<50%");
    expect(attemptIntensityBand(2, 3)).toBe("50–99%");
    expect(attemptIntensityBand(3, 3)).toBe("At limit");
  });
});
