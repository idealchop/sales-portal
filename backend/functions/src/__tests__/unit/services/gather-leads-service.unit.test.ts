import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetAll, mockBatchSet, mockBatchCommit, mockCollectionGet } =
  vi.hoisted(() => ({
    mockGetAll: vi.fn(),
    mockBatchSet: vi.fn(),
    mockBatchCommit: vi.fn(),
    mockCollectionGet: vi.fn(),
  }));

vi.mock("../../../config/firebase-admin", () => ({
  FieldValue: {
    serverTimestamp: () => "SERVER_TS",
  },
  db: {
    collection: (name: string) => {
      if (name !== "leads") throw new Error(`unexpected collection ${name}`);
      return {
        doc: (id: string) => ({ id, path: `leads/${id}` }),
        get: mockCollectionGet,
      };
    },
    getAll: (...refs: { id: string }[]) => mockGetAll(...refs),
    batch: () => ({
      set: mockBatchSet,
      commit: mockBatchCommit,
    }),
  },
}));

const mockBuildBundle = vi.fn();
vi.mock("../../../services/build-smartrefill-pipeline-leads", () => ({
  buildSmartRefillPipelineBundle: (...args: unknown[]) => mockBuildBundle(...args),
  excludeSalesConnectedLeads: (leads: unknown[]) => leads,
}));

import {
  buildGatherInsertPayload,
  buildGatherSourceUpdatePayload,
  gatherLeadsFromSources,
  SCHEDULED_LEAD_GATHER_CRON,
  SCHEDULED_LEAD_GATHER_MODE,
  SCHEDULED_LEAD_GATHER_TIME_ZONE,
} from "../../../services/gather-leads-service";
import type { LeadRecord } from "../../../services/leads-service";

function sampleLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "sr-business:b1",
    userId: "smartrefill",
    businessName: "Aqua Station",
    ownerName: "Jane Owner",
    email: "jane@example.com",
    phone: "09171234567",
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
    leadSource: "FB Ads",
    platformSource: "smartrefill",
    linkedBusinessId: "b1",
    customerCount: 12,
    inquiredAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("scheduled midnight gather", () => {
  it("runs a full gather at midnight Asia/Manila", () => {
    expect(SCHEDULED_LEAD_GATHER_CRON).toBe("0 0 * * *");
    expect(SCHEDULED_LEAD_GATHER_TIME_ZONE).toBe("Asia/Manila");
    expect(SCHEDULED_LEAD_GATHER_MODE).toBe("full");
  });
});

describe("gather payload builders", () => {
  it("insert payload seeds CRM defaults and source fields", () => {
    const payload = buildGatherInsertPayload(sampleLead());
    expect(payload.businessName).toBe("Aqua Station");
    expect(payload.email).toBe("jane@example.com");
    expect(payload.warmAttemptCount).toBe(0);
    expect(payload.coldAttemptCount).toBe(0);
    expect(payload.attemptCount).toBe(0);
    expect(payload.warmStatus).toBe("");
    expect(payload.pipelineGathered).toBe(true);
    expect(payload.createdByUid).toBe("pipeline-gather");
  });

  it("source update payload refreshes source fields only (no CRM wipe keys)", () => {
    const payload = buildGatherSourceUpdatePayload(
      sampleLead({
        businessName: "Updated Aqua",
        email: "new@example.com",
        warmStatus: "Interested — Follow Up",
        warmAttemptCount: 3,
        notes: "CRM note should not overwrite via source keys",
      }),
    );
    expect(payload.businessName).toBe("Updated Aqua");
    expect(payload.email).toBe("new@example.com");
    expect(payload.pipelineGathered).toBe(true);
    expect(payload).not.toHaveProperty("warmStatus");
    expect(payload).not.toHaveProperty("warmAttemptCount");
    expect(payload).not.toHaveProperty("coldAttemptCount");
    expect(payload).not.toHaveProperty("attemptCount");
    expect(payload).not.toHaveProperty("assignedToUid");
    expect(payload).not.toHaveProperty("channels");
    expect(payload).not.toHaveProperty("notes");
    expect(payload.sourceNotes).toBe(
      "CRM note should not overwrite via source keys",
    );
  });

  it("persists content engagement fields on insert and source refresh", () => {
    const contentLead = sampleLead({
      id: "sr-content:abc",
      sourceKind: "content",
      leadSource: "Webinar · Story",
      contentSources: ["webinar", "story"],
      contentSummary: "Live Q&A; WRS story",
    });
    const insert = buildGatherInsertPayload(contentLead);
    expect(insert.contentSources).toEqual(["webinar", "story"]);
    expect(insert.contentSummary).toBe("Live Q&A; WRS story");
    expect(insert.sourceKind).toBe("content");

    const refresh = buildGatherSourceUpdatePayload(contentLead);
    expect(refresh.contentSources).toEqual(["webinar", "story"]);
    expect(refresh.contentSummary).toBe("Live Q&A; WRS story");
  });
});

describe("gatherLeadsFromSources", () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    mockBatchSet.mockReset();
    mockBatchCommit.mockReset();
    mockBatchCommit.mockResolvedValue(undefined);
    mockBuildBundle.mockReset();
  });

  it("incremental inserts missing only and skips existing", async () => {
    mockBuildBundle.mockResolvedValue({
      leads: [
        sampleLead({ id: "sr-business:new" }),
        sampleLead({ id: "sr-business:existing" }),
      ],
      sales: [],
    });
    mockGetAll.mockResolvedValue([
      { id: "sr-business:new", exists: false },
      {
        id: "sr-business:existing",
        exists: true,
        data: () => ({ stage: "warm" }),
      },
    ]);

    const summary = await gatherLeadsFromSources("incremental");

    expect(summary).toEqual({
      mode: "incremental",
      scanned: 2,
      inserted: 1,
      updated: 0,
      skipped: 1,
    });
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchSet.mock.calls[0][0].id).toBe("sr-business:new");
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("full inserts missing and updates source fields on existing", async () => {
    mockBuildBundle.mockResolvedValue({
      leads: [
        sampleLead({ id: "sr-business:new", businessName: "New Biz" }),
        sampleLead({
          id: "sr-business:existing",
          businessName: "Refreshed Biz",
          email: "refreshed@example.com",
        }),
      ],
      sales: [],
    });
    mockGetAll.mockResolvedValue([
      { id: "sr-business:new", exists: false },
      {
        id: "sr-business:existing",
        exists: true,
        data: () => ({ stage: "warm" }),
      },
    ]);

    const summary = await gatherLeadsFromSources("full");

    expect(summary).toEqual({
      mode: "full",
      scanned: 2,
      inserted: 1,
      updated: 1,
      skipped: 0,
    });
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    const updateCall = mockBatchSet.mock.calls.find(
      (call) => call[0].id === "sr-business:existing",
    );
    expect(updateCall).toBeTruthy();
    expect(updateCall?.[1].businessName).toBe("Refreshed Biz");
    expect(updateCall?.[1]).not.toHaveProperty("warmStatus");
    expect(updateCall?.[2]).toEqual({ merge: true });
  });
});
