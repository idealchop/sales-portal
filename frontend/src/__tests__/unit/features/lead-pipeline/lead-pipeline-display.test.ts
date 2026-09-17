import { describe, expect, it } from "vitest";
import {
  attemptSeverity,
  autoQueueMoveHint,
  displayAttemptCount,
  formatContentSourcesLine,
  formatLeadSourceLine,
  groupWarmStatusOptions,
  isContentPipelineLead,
  LEAD_QUEUE_TABS,
  parseWarmStatus,
  previewAttemptCounts,
  resolveAttemptBumpTrack,
  resolveStageAfterStatusUpdate,
  resolveStageForWarmStatus,
  resolveWarmStatusAfterDemoChange,
  shouldAutoMoveLeadToArchive,
  shouldAutoMoveLeadToCold,
  WARM_STATUS_RESULT_OPTIONS,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";

describe("lead pipeline tabs", () => {
  it("orders queues All → Content → Warm → Cold → Onboarded → Archives", () => {
    expect(LEAD_QUEUE_TABS.map((tab) => tab.id)).toEqual([
      "all",
      "content",
      "warm",
      "cold",
      "onboarded",
      "archive",
    ]);
  });
});

describe("lead attempt tracks", () => {
  it("counts warm and cold transitions only when allowed", () => {
    expect(resolveAttemptBumpTrack("warm", "warm")).toBe("warm");
    expect(resolveAttemptBumpTrack("warm", "cold")).toBe("warm");
    expect(resolveAttemptBumpTrack("onboarded", "warm")).toBe("warm");
    expect(resolveAttemptBumpTrack("cold", "cold")).toBe("cold");

    expect(resolveAttemptBumpTrack("cold", "warm")).toBe("none");
    expect(resolveAttemptBumpTrack("cold", "onboarded")).toBe("none");
    expect(resolveAttemptBumpTrack("warm", "onboarded")).toBe("none");
    expect(resolveAttemptBumpTrack("onboarded", "cold")).toBe("none");
  });

  it("previews attempt bumps and archives by track", () => {
    expect(
      previewAttemptCounts({
        fromStage: "warm",
        toStage: "cold",
        warmAttemptCount: 2,
        coldAttemptCount: 0,
        countAsNewAttempt: true,
      }),
    ).toEqual({
      warmAttemptCount: 3,
      coldAttemptCount: 0,
      track: "warm",
    });

    expect(
      previewAttemptCounts({
        fromStage: "cold",
        toStage: "warm",
        warmAttemptCount: 2,
        coldAttemptCount: 1,
        countAsNewAttempt: true,
      }).track,
    ).toBe("none");

    expect(
      shouldAutoMoveLeadToArchive({
        warmAttemptCount: 8,
        coldAttemptCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldAutoMoveLeadToArchive({
        warmAttemptCount: 2,
        coldAttemptCount: 3,
      }),
    ).toBe(true);
    expect(
      shouldAutoMoveLeadToArchive({
        warmAttemptCount: 7,
        coldAttemptCount: 2,
      }),
    ).toBe(false);

    expect(
      resolveStageAfterStatusUpdate({
        warmStatusValue: "other",
        currentStage: "cold",
        attendedDemo: "attended",
        warmAttemptCount: 1,
        coldAttemptCount: 3,
      }),
    ).toBe("archive");

    expect(
      resolveStageAfterStatusUpdate({
        warmStatusValue: "decision_pending",
        currentStage: "warm",
        attendedDemo: "missed",
        warmAttemptCount: 2,
        coldAttemptCount: 0,
      }),
    ).toBe("cold");

    expect(
      resolveWarmStatusAfterDemoChange({
        attendedDemo: "missed",
        warmStatusValue: "decision_pending",
        warmAttemptCount: 1,
        coldAttemptCount: 0,
      }),
    ).toBe("missed_demo");

    expect(shouldAutoMoveLeadToCold({ attendedDemo: "missed" })).toBe(true);
    expect(
      shouldAutoMoveLeadToCold({
        attendedDemo: "missed",
        warmStatusValue: "demo_scheduled",
      }),
    ).toBe(false);
    expect(
      resolveStageAfterStatusUpdate({
        warmStatusValue: "demo_scheduled",
        currentStage: "cold",
        attendedDemo: "missed",
        warmAttemptCount: 2,
        coldAttemptCount: 0,
      }),
    ).toBe("warm");
    expect(
      resolveWarmStatusAfterDemoChange({
        attendedDemo: "missed",
        warmStatusValue: "demo_scheduled",
        warmAttemptCount: 1,
        coldAttemptCount: 0,
      }),
    ).toBe("missed_demo");
    expect(
      resolveWarmStatusAfterDemoChange({
        attendedDemo: "",
        warmStatusValue: "demo_scheduled",
        warmAttemptCount: 1,
        coldAttemptCount: 0,
      }),
    ).toBe("demo_scheduled");
    expect(autoQueueMoveHint({
      attendedDemo: null,
      warmAttemptCount: 8,
      coldAttemptCount: 0,
    })).toMatch(/warm attempts/);
    expect(autoQueueMoveHint({
      attendedDemo: null,
      warmAttemptCount: 1,
      coldAttemptCount: 3,
    })).toMatch(/cold attempts/);
  });

  it("maps severity mild → warning → severe", () => {
    expect(attemptSeverity(1, "warm")).toBe("mild");
    expect(attemptSeverity(4, "warm")).toBe("warning");
    expect(attemptSeverity(7, "warm")).toBe("severe");
    expect(attemptSeverity(1, "cold")).toBe("mild");
    expect(attemptSeverity(2, "cold")).toBe("warning");
    expect(attemptSeverity(3, "cold")).toBe("severe");
    expect(displayAttemptCount({
      stage: "cold",
      warmAttemptCount: 5,
      coldAttemptCount: 2,
    })).toEqual({ count: 2, track: "cold", threshold: 3 });
  });

  it("keeps destination stage mapping", () => {
    expect(resolveStageForWarmStatus("decision_pending", "cold")).toBe("warm");
    expect(resolveStageForWarmStatus("no_response", "warm")).toBe("cold");
    expect(resolveStageForWarmStatus("closed_found_alternative", "warm")).toBe(
      "archive",
    );
    expect(resolveStageForWarmStatus("duplicate_record", "cold")).toBe(
      "archive",
    );
    expect(parseWarmStatus("Missed Demo").value).toBe("missed_demo");
    expect(parseWarmStatus("Duplicate Record: keep sr-business:b1").value).toBe(
      "duplicate_record",
    );
    expect(
      resolveStageAfterStatusUpdate({
        warmStatusValue: "closed_found_alternative",
        currentStage: "warm",
        attendedDemo: "missed",
        warmAttemptCount: 1,
        coldAttemptCount: 0,
      }),
    ).toBe("archive");
    expect(groupWarmStatusOptions(WARM_STATUS_RESULT_OPTIONS).map((g) => g.id)).toEqual([
      "warm",
      "cold",
      "onboarded",
      "archive",
      "general",
    ]);
  });

  it("formats webinar, training, article, and story sources", () => {
    expect(
      formatContentSourcesLine(["webinar", "story", "article", "training"]),
    ).toBe("Webinar · Story · Article · Training");
    expect(
      formatLeadSourceLine({
        leadSource: "SmartRefill workspace",
        contentSources: ["article"],
      }),
    ).toBe("SmartRefill workspace · Article");
    expect(
      formatLeadSourceLine({
        leadSource: "Webinar",
        contentSources: ["webinar"],
      }),
    ).toBe("Webinar");
    expect(
      isContentPipelineLead({
        sourceKind: "content",
        contentSources: ["webinar"],
      }),
    ).toBe(true);
    expect(
      isContentPipelineLead({
        sourceKind: "existing",
        contentSources: ["article"],
      }),
    ).toBe(true);
    expect(isContentPipelineLead({ sourceKind: "existing" })).toBe(false);
  });
});
