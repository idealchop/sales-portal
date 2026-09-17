import { describe, expect, it } from "vitest";
import {
  applyContentTouchesToPipeline,
  contentLeadDocId,
  formatContentLeadSource,
  isContentOnlyLead,
  isContentPipelineLead,
  mergeContentTouches,
  type ContentTouch,
} from "../../../services/content-pipeline-leads";
import type { LeadRecord } from "../../../services/leads-service";

function touch(overrides: Partial<ContentTouch> = {}): ContentTouch {
  return {
    email: "guest@example.com",
    displayName: "Guest",
    sources: ["webinar"],
    titles: ["Scale demo"],
    occurredAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "sr-business:b1",
    userId: "owner-1",
    businessName: "Aqua",
    ownerName: "Jane",
    email: "jane@example.com",
    stage: "onboarded",
    attemptCount: 0,
    warmAttemptCount: 0,
    coldAttemptCount: 0,
    channels: {
      viber: false,
      email: false,
      messenger: false,
      smsCall: false,
    },
    leadSource: "SmartRefill workspace",
    sourceKind: "manual",
    platformSource: "smartrefill",
    ...overrides,
  };
}

describe("content-pipeline-leads", () => {
  it("merges the same email across webinar, training, article, and story", () => {
    const merged = mergeContentTouches([
      touch({ sources: ["webinar"], titles: ["Live Q&A"] }),
      touch({
        sources: ["training"],
        titles: ["Setup tutorial"],
        occurredAt: "2026-09-12T00:00:00.000Z",
      }),
      touch({ sources: ["article"], titles: ["Owner hub"] }),
      touch({ sources: ["story"], titles: ["WRS story"] }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].sources).toEqual([
      "webinar",
      "training",
      "article",
      "story",
    ]);
    expect(merged[0].titles).toEqual([
      "Live Q&A",
      "Setup tutorial",
      "Owner hub",
      "WRS story",
    ]);
    expect(merged[0].occurredAt).toBe("2026-09-12T00:00:00.000Z");
    expect(formatContentLeadSource(merged[0].sources)).toBe(
      "Webinar · Training · Article · Story",
    );
  });

  it("skips invalid emails", () => {
    expect(mergeContentTouches([touch({ email: "not-an-email" })])).toEqual([]);
  });

  it("inserts content-only leads and stamps existing pipeline rows", () => {
    const pipeline = applyContentTouchesToPipeline(
      [lead()],
      [
        touch({ email: "jane@example.com", userId: "owner-1" }),
        touch({ email: "guest@example.com" }),
      ],
    );
    expect(pipeline).toHaveLength(2);
    expect(pipeline[0].sourceKind).toBe("manual");
    expect(pipeline[0].contentSources).toEqual(["webinar"]);
    expect(isContentPipelineLead(pipeline[0])).toBe(true);
    expect(isContentOnlyLead(pipeline[0])).toBe(false);

    const guest = pipeline[1];
    expect(guest.id).toBe(contentLeadDocId("guest@example.com"));
    expect(guest.sourceKind).toBe("content");
    expect(guest.leadSource).toBe("Webinar");
    expect(guest.platformRole).toBe("Content");
    expect(isContentOnlyLead(guest)).toBe(true);
  });
});
