import { describe, expect, it } from "vitest";
import { buildSalesHomeFocus } from "@/features/dashboard/lib/build-sales-home-focus";
import { buildUserSubscriptionsList } from "@/features/dashboard/lib/build-user-subscriptions-list";
import type { Lead } from "@/lib/definitions";
import type { ActiveOwner } from "@/lib/dashboard/analytics";

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
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

const emptyAnalytics = {
  funnel: [],
  bySource: [],
  byAssignee: [],
  queueCounts: {
    all: 4,
    content: 0,
    warm: 2,
    cold: 0,
    onboarded: 2,
    archive: 0,
  },
  trialRisk: { daysLeftZero: 0, daysLeftLte3: 1 },
  stallReasons: [],
};

describe("buildSalesHomeFocus", () => {
  it("lists stalled demos as win and quiet onboarded as keep, with no money fields", () => {
    const now = Date.parse("2026-09-21T00:00:00.000Z");
    const focus = buildSalesHomeFocus(
      [
        lead({
          id: "close",
          businessName: "Laguna Fill",
          email: "laguna@example.com",
          stage: "warm",
          attendedDemo: "attended",
          stallReason: "Waiting on budget",
          assignedToUid: "sales-1",
        }),
        lead({
          id: "hello",
          businessName: "New Prospect",
          email: "hello@example.com",
          stage: "warm",
        }),
        lead({
          id: "keep",
          businessName: "Quiet Station",
          stage: "onboarded",
          lastContactAt: "2026-09-01T00:00:00.000Z",
          onboardedMonitor: {
            journeyDay: 8,
            journeyPhase: "day8_14",
            isActive: false,
            gettingStartedCompleted: 1,
            activityDayCount: 1,
            onboardedAt: "2026-09-13T00:00:00.000Z",
            flags: ["journey_inactive_day8"],
          },
        }),
        lead({
          id: "trial",
          businessName: "Trial Station",
          stage: "onboarded",
          lastContactAt: "2026-09-20T00:00:00.000Z",
          workspace: { trialDaysLeft: 2, planName: "Grow", billingCycle: "trial" },
        }),
      ],
      emptyAnalytics,
      { nowMs: now, uid: "sales-1" },
    );

    expect(focus.needFirstHello).toBe(2);
    expect(focus.mayLeave).toBe(2);
    expect(focus.talkingWithUs).toBe(2);
    expect(focus.alreadyIn).toBe(2);
    expect(focus.toWin.map((row) => row.businessName)).toEqual([
      "Laguna Fill",
      "New Prospect",
    ]);
    expect(focus.toWin[0]?.assignedToYou).toBe(true);
    expect(focus.toWin[0]?.intent).toBe("close_deal");
    expect(focus.toWin[0]?.now).toMatch(/stalled/i);
    expect(focus.toWin[0]?.shouldBe).toMatch(/next step/i);
    expect(focus.toWin[0]?.whatIf).toMatch(/never come in/i);
    expect(focus.toWin[0]?.links.map((link) => link.href)).toContain(
      "/subscriptions/vouchers-affiliates",
    );
    expect(focus.toWin[1]?.intent).toBe("hello");
    expect(focus.toWin[1]?.now).toMatch(/nobody has said hello/i);
    expect(focus.toKeep.map((row) => row.businessName)).toEqual([
      "Trial Station",
      "Quiet Station",
    ]);
    expect(focus.toKeep[0]?.intent).toBe("trial");
    expect(focus.toKeep[0]?.now).toMatch(/2 days left/i);
    expect(focus.toKeep[0]?.shouldBe).toMatch(/before it ends/i);
    expect(focus.toKeep[0]?.links.map((link) => link.href)).toEqual([
      "/subscriptions/trial",
    ]);
    expect(focus.toKeep[1]?.intent).toBe("quiet");
    expect(focus.toKeep[1]?.whatIf).toMatch(/habit/i);
    expect(focus.toWin[0]?.chance.kind).toBe("onboard");
    expect(focus.toWin[0]?.chance.percent).toBeGreaterThan(
      focus.toWin[1]?.chance.percent ?? 0,
    );
    expect(focus.toKeep[0]?.chance.kind).toBe("continue");
    expect(focus.toKeep[1]?.chance.kind).toBe("return");
    expect(JSON.stringify(focus)).not.toMatch(/₱|php|commission|pipelineValue/i);
  });

  it("merges subscription roster trials into keep, including stations not in the pipeline", () => {
    const nowMs = Date.parse("2026-09-21T00:00:00.000Z");
    const owners: ActiveOwner[] = [
      {
        id: "biz-solo",
        businessName: "Solo Trial WRS",
        ownerEmail: "solo@example.com",
        customers: 1,
        transactionsLast30Days: 0,
        healthTier: "medium",
        onboardingComplete: true,
        monthlyRevenue: 0,
        subscriptions: [
          {
            id: "sub-1",
            planName: "Grow",
            billingCycle: "trial",
            status: "active",
            price: 0,
            timeline: "current",
            expiresAt: "2026-09-23T00:00:00.000Z",
            cancelAtPeriodEnd: false,
            needsApproval: false,
            isDowngrade: false,
            isCancellation: false,
          },
        ],
      },
    ];
    const subscriptions = buildUserSubscriptionsList(owners, nowMs);

    const focus = buildSalesHomeFocus(
      [
        lead({
          id: "quiet",
          businessName: "Quiet Station",
          linkedBusinessId: "biz-other",
          stage: "onboarded",
          lastContactAt: "2026-09-01T00:00:00.000Z",
          onboardedMonitor: {
            journeyDay: 8,
            journeyPhase: "day8_14",
            isActive: false,
            gettingStartedCompleted: 1,
            activityDayCount: 1,
            onboardedAt: "2026-09-13T00:00:00.000Z",
            flags: ["recommend_move_to_cold"],
          },
        }),
      ],
      {
        ...emptyAnalytics,
        queueCounts: {
          ...emptyAnalytics.queueCounts,
          warm: 0,
          onboarded: 1,
          all: 1,
        },
      },
      { nowMs, uid: "sales-1", subscriptions },
    );

    const solo = focus.toKeep.find((row) => row.businessName === "Solo Trial WRS");
    expect(solo?.intent).toBe("trial");
    expect(solo?.hasLead).toBe(false);
    expect(solo?.email).toBe("solo@example.com");
    expect(solo?.now).toMatch(/2 days left/i);
    expect(solo?.shouldBe).toMatch(/before it ends/i);
    expect(solo?.links.map((link) => link.href)).toEqual([
      "/subscriptions/trial",
    ]);
    expect(focus.toKeep[0]?.intent).toBe("trial");
  });
});
