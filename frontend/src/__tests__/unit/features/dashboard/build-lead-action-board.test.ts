import { describe, expect, it } from "vitest";
import { buildLeadActionBoard, leadActionMatchesDay } from "@/features/dashboard/lib/build-lead-action-board";
import type { Lead } from "@/lib/definitions";

function sampleLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    userId: "u1",
    businessName: "Aqua Station",
    ownerName: "Jane",
    stage: "warm",
    attemptCount: 0,
    channels: {
      viber: false,
      email: false,
      messenger: false,
      smsCall: false,
    },
    assignedToUid: "sales-1",
    ...overrides,
  };
}

describe("buildLeadActionBoard", () => {
  it("prioritizes overdue, due soon, and never contacted for the assignee", () => {
    const now = Date.parse("2026-09-15T12:00:00.000Z");
    const board = buildLeadActionBoard(
      [
        sampleLead({
          id: "overdue",
          businessName: "Overdue Biz",
          nextFollowUpAt: "2026-09-10T12:00:00.000Z",
          lastContactAt: "2026-09-01T12:00:00.000Z",
        }),
        sampleLead({
          id: "soon",
          businessName: "Soon Biz",
          nextFollowUpAt: "2026-09-18T12:00:00.000Z",
          lastContactAt: "2026-09-14T12:00:00.000Z",
        }),
        sampleLead({
          id: "new",
          businessName: "New Biz",
        }),
        sampleLead({
          id: "quiet",
          businessName: "Quiet Biz",
          lastContactAt: "2026-08-01T12:00:00.000Z",
        }),
        sampleLead({
          id: "archive",
          businessName: "Archived Biz",
          stage: "archive",
        }),
      ],
      { nowMs: now },
    );

    expect(board.summary).toEqual({
      assigned: 5,
      overdue: 1,
      dueSoon: 1,
      neverContacted: 1,
      contactedLast7Days: 1,
    });
    expect(board.items.map((item) => item.id)).toEqual([
      "overdue",
      "soon",
      "new",
      "quiet",
    ]);
    expect(board.items[0]?.kind).toBe("overdue_follow_up");
    expect(board.items[1]?.kind).toBe("due_soon");
    expect(board.items[2]?.kind).toBe("never_contacted");
    expect(board.items[3]?.kind).toBe("no_follow_up");
  });

  it("surfaces onboarded journey and subscription flags (flag-only cold)", () => {
    const now = Date.parse("2026-09-15T12:00:00.000Z");
    const board = buildLeadActionBoard(
      [
        sampleLead({
          id: "day8",
          stage: "onboarded",
          businessName: "Day8 Biz",
          lastContactAt: "2026-09-01T12:00:00.000Z",
          onboardedMonitor: {
            journeyDay: 8,
            journeyPhase: "day8_14",
            isActive: false,
            gettingStartedCompleted: 1,
            activityDayCount: 2,
            onboardedAt: "2026-09-07T00:00:00.000Z",
            flags: ["journey_inactive_day8"],
          },
        }),
        sampleLead({
          id: "cold-flag",
          stage: "onboarded",
          businessName: "Cold Recommend Biz",
          lastContactAt: "2026-09-01T12:00:00.000Z",
          onboardedMonitor: {
            journeyDay: 16,
            journeyPhase: "day15_plus",
            isActive: false,
            gettingStartedCompleted: 0,
            activityDayCount: 0,
            onboardedAt: "2026-08-30T00:00:00.000Z",
            flags: ["recommend_move_to_cold"],
          },
        }),
        sampleLead({
          id: "graduated-quiet",
          stage: "onboarded",
          businessName: "Healthy Onboarded",
          lastContactAt: "2026-09-14T12:00:00.000Z",
          onboardedMonitor: {
            journeyDay: 20,
            journeyPhase: "graduated",
            isActive: true,
            gettingStartedCompleted: 5,
            activityDayCount: 12,
            onboardedAt: "2026-08-20T00:00:00.000Z",
            flags: [],
          },
        }),
      ],
      { nowMs: now },
    );

    expect(board.items.map((item) => item.id)).toEqual(["cold-flag", "day8"]);
    expect(board.items[0]?.kind).toBe("recommend_move_to_cold");
    expect(board.items[1]?.kind).toBe("journey_inactive_day8");
  });

  it("puts undated and overdue tasks on today", () => {
    expect(
      leadActionMatchesDay(
        { kind: "never_contacted", nextFollowUpAt: null },
        "2026-09-21",
        "2026-09-21",
      ),
    ).toBe(true);
    expect(
      leadActionMatchesDay(
        { kind: "overdue_follow_up", nextFollowUpAt: "2026-09-10T12:00:00.000Z" },
        "2026-09-21",
        "2026-09-21",
      ),
    ).toBe(true);
    expect(
      leadActionMatchesDay(
        { kind: "due_soon", nextFollowUpAt: "2026-09-22T12:00:00.000Z" },
        "2026-09-21",
        "2026-09-21",
      ),
    ).toBe(false);
  });
});
