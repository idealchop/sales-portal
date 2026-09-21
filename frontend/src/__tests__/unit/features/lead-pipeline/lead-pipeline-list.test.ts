import { describe, expect, it } from "vitest";
import {
  DEFAULT_DATE_FILTER,
  DEFAULT_LEAD_LIST_FILTERS,
  buildQueueCountsFromLeads,
  clearedLeadListFilterValue,
  describeActiveLeadListFilters,
  filterLeadsByPipelineParams,
  filterLeadsForList,
  prepareLeadListRows,
  resolveDateFilterRange,
  sortLeadsForList,
  type LeadListFilters,
} from "@/features/lead-pipeline/lib/lead-pipeline-list";
import type { Lead } from "@/lib/definitions";

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "1",
    userId: "u",
    businessName: "Aqua Station",
    ownerName: "Jane",
    email: "jane@example.com",
    stage: "warm",
    attemptCount: 1,
    platformSource: "smartrefill",
    accountReady: false,
    channels: {
      viber: false,
      email: false,
      messenger: false,
      smsCall: false,
    },
    leadSource: "Demo request",
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function filters(overrides: Partial<LeadListFilters> = {}): LeadListFilters {
  return {
    ...DEFAULT_LEAD_LIST_FILTERS,
    inquiredAt: { ...DEFAULT_DATE_FILTER },
    registeredAt: { ...DEFAULT_DATE_FILTER },
    lastContactAt: { ...DEFAULT_DATE_FILTER },
    nextFollowUpAt: { ...DEFAULT_DATE_FILTER },
    ...overrides,
  };
}

describe("lead-pipeline-list", () => {
  it("filters queue and assignee without another API call", () => {
    const rows = [
      lead({ id: "1", stage: "warm", assignedToUid: "sales-1" }),
      lead({ id: "2", stage: "cold", assignedToUid: "sales-2" }),
      lead({
        id: "3",
        stage: "warm",
        sourceKind: "content",
        contentSources: ["webinar"],
        assignedToUid: "sales-1",
      }),
      lead({ id: "4", stage: "onboarded", assignedToUid: "sales-1" }),
    ];

    expect(filterLeadsByPipelineParams(rows, { queue: "warm" }).map((r) => r.id)).toEqual([
      "1",
    ]);
    expect(
      filterLeadsByPipelineParams(rows, { queue: "content" }).map((r) => r.id),
    ).toEqual(["3"]);
    expect(
      filterLeadsByPipelineParams(rows, {
        queue: "all",
        assignee: "sales-1",
      }).map((r) => r.id),
    ).toEqual(["1", "3", "4"]);

    expect(buildQueueCountsFromLeads(rows)).toEqual({
      all: 4,
      content: 1,
      warm: 1,
      cold: 1,
      onboarded: 1,
      archive: 0,
    });
  });

  const rows = [
    lead({
      id: "1",
      businessName: "Zebra",
      attemptCount: 2,
      assignedToUid: "alice",
      warmStatus: "Awaiting reply",
      leadSource: "Website",
      attendedDemo: "attended",
      inquiredAt: "2026-09-10T08:00:00.000Z",
      lastContactAt: "2026-09-14T10:00:00.000Z",
      nextFollowUpAt: "2026-09-14T10:00:00.000Z",
      createdAt: "2026-09-10T08:00:00.000Z",
    }),
    lead({
      id: "2",
      businessName: "Alpha",
      platformSource: "smartrefill_legacy",
      stage: "inquire",
      attemptCount: 5,
      accountReady: true,
      assignedToUid: "bob",
      warmStatus: "No Response",
      leadSource: "Demo request",
      attendedDemo: "missed",
      inquiredAt: "2026-08-15T08:00:00.000Z",
      lastContactAt: "2026-08-20T10:00:00.000Z",
      nextFollowUpAt: "2026-08-25T10:00:00.000Z",
      createdAt: "2026-08-15T08:00:00.000Z",
    }),
    lead({
      id: "3",
      businessName: "Beta",
      ownerName: "Win",
      stage: "onboarded",
      attemptCount: 0,
      leadSource: "Referrals",
      attendedDemo: "not_needed",
      inquiredAt: "2026-09-15T08:00:00.000Z",
      createdAt: "2026-09-15T08:00:00.000Z",
    }),
  ];

  const now = new Date(2026, 8, 15, 12, 0, 0);

  it("filters by search, platform, stage, and account ready", () => {
    expect(
      filterLeadsForList(rows, filters({ search: "alpha" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["2"]);

    expect(
      filterLeadsForList(
        rows,
        filters({ platformSource: "smartrefill_legacy" }),
        now,
      ).map((row) => row.id),
    ).toEqual(["2"]);

    expect(
      filterLeadsForList(rows, filters({ stage: "onboarded" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["3"]);

    expect(
      filterLeadsForList(rows, filters({ accountReady: "yes" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["2"]);
  });

  it("filters by assignee, status, source, demo, and attempts", () => {
    expect(
      filterLeadsForList(
        rows,
        filters({ assignedToUid: "unassigned" }),
        now,
      ).map((row) => row.id),
    ).toEqual(["3"]);

    expect(
      filterLeadsForList(rows, filters({ assignedToUid: "alice" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["1"]);

    expect(
      filterLeadsForList(
        [
          ...rows,
          lead({
            id: "multi",
            assignedToUids: ["alice", "bob"],
            assignedToUid: "alice",
          }),
        ],
        filters({ assignedToUid: "bob" }),
        now,
      ).map((row) => row.id),
    ).toEqual(["2", "multi"]);

    expect(
      filterLeadsForList(rows, filters({ warmStatus: "awaiting_reply" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["1"]);

    expect(
      filterLeadsForList(rows, filters({ leadSource: "Website" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["1"]);

    expect(
      filterLeadsForList(rows, filters({ demo: "not_needed" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["3"]);

    expect(
      filterLeadsForList(rows, filters({ attempts: "4plus" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["2"]);

    expect(
      filterLeadsForList(rows, filters({ attempts: "0" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["3"]);
  });

  it("matches content source filters on combined webinar/story labels", () => {
    const contentRows = [
      lead({
        id: "guest",
        leadSource: "Webinar · Story",
        sourceKind: "content",
        contentSources: ["webinar", "story"],
        email: "guest@example.com",
      }),
      lead({
        id: "owner",
        leadSource: "SmartRefill workspace",
        contentSources: ["article"],
      }),
    ];

    expect(
      filterLeadsForList(
        contentRows,
        filters({ leadSource: "Webinar" }),
        now,
      ).map((row) => row.id),
    ).toEqual(["guest"]);
    expect(
      filterLeadsForList(
        contentRows,
        filters({ leadSource: "Article" }),
        now,
      ).map((row) => row.id),
    ).toEqual(["owner"]);
    expect(
      filterLeadsForList(contentRows, filters({ search: "webinar" }), now).map(
        (row) => row.id,
      ),
    ).toEqual(["guest"]);
  });

  it("filters by date presets and custom ranges", () => {
    expect(
      filterLeadsForList(
        rows,
        filters({ inquiredAt: { preset: "today", from: "", to: "" } }),
        now,
      ).map((row) => row.id),
    ).toEqual(["3"]);

    expect(
      filterLeadsForList(
        rows,
        filters({ lastContactAt: { preset: "this_month", from: "", to: "" } }),
        now,
      ).map((row) => row.id),
    ).toEqual(["1"]);

    expect(
      filterLeadsForList(
        rows,
        filters({
          lastContactAt: {
            preset: "custom",
            from: "2026-08-01",
            to: "2026-08-31",
          },
        }),
        now,
      ).map((row) => row.id),
    ).toEqual(["2"]);

    expect(
      filterLeadsForList(
        rows,
        filters({
          nextFollowUpAt: { preset: "yesterday", from: "", to: "" },
        }),
        now,
      ).map((row) => row.id),
    ).toEqual(["1"]);
  });

  it("resolves date filter ranges for presets", () => {
    const today = resolveDateFilterRange(
      { preset: "today", from: "", to: "" },
      now,
    );
    expect(today).not.toBeNull();
    expect(new Date(today!.startMs).getDate()).toBe(15);

    const lastMonth = resolveDateFilterRange(
      { preset: "last_month", from: "", to: "" },
      now,
    );
    expect(lastMonth).not.toBeNull();
    expect(new Date(lastMonth!.startMs).getMonth()).toBe(7);
    expect(new Date(lastMonth!.endMs).getMonth()).toBe(7);
  });

  it("sorts by attempt count and business name", () => {
    expect(
      sortLeadsForList(rows, "attemptCount", "desc").map((row) => row.id),
    ).toEqual(["2", "1", "3"]);
    expect(
      sortLeadsForList(rows, "businessName", "asc").map(
        (row) => row.businessName,
      ),
    ).toEqual(["Alpha", "Beta", "Zebra"]);
  });

  it("prepares filtered + sorted rows", () => {
    const prepared = prepareLeadListRows(
      rows,
      filters({ platformSource: "smartrefill" }),
      "businessName",
      "asc",
    );
    expect(prepared.map((row) => row.businessName)).toEqual(["Beta", "Zebra"]);
  });

  it("sorts warm leads by inquire/registered, follow-up override, then legacy customers", () => {
    const warmRows = [
      lead({
        id: "old-inquire",
        businessName: "Old inquire",
        inquiredAt: "2026-08-01T00:00:00.000Z",
        nextFollowUpAt: null,
      }),
      lead({
        id: "follow-up-wins",
        businessName: "Follow up wins",
        inquiredAt: "2026-08-01T00:00:00.000Z",
        nextFollowUpAt: "2026-09-14T00:00:00.000Z",
      }),
      lead({
        id: "fresh-inquire",
        businessName: "Fresh inquire",
        inquiredAt: "2026-09-10T00:00:00.000Z",
      }),
      lead({
        id: "legacy-high",
        businessName: "Legacy high",
        platformSource: "smartrefill_legacy",
        inquiredAt: "2026-09-10T00:00:00.000Z",
        customerCount: 500,
      }),
      lead({
        id: "legacy-low",
        businessName: "Legacy low",
        platformSource: "smartrefill_legacy",
        inquiredAt: "2026-09-10T00:00:00.000Z",
        customerCount: 20,
      }),
      lead({
        id: "registered-only",
        businessName: "Registered only",
        stage: "registered",
        registeredAt: "2026-09-12T00:00:00.000Z",
        createdAt: "2026-09-12T00:00:00.000Z",
      }),
    ];

    expect(
      sortLeadsForList(warmRows, "warmDefault", "desc").map((row) => row.id),
    ).toEqual([
      "follow-up-wins", // inquire older than follow-up → use follow-up (Sep 14)
      "registered-only", // registered Sep 12
      "legacy-high", // same inquire Sep 10, more customers
      "legacy-low",
      "fresh-inquire", // same date, no legacy customers
      "old-inquire",
    ]);
  });

  it("sorts onboarded by attention flags first", () => {
    const onboardedRows = [
      lead({
        id: "healthy",
        stage: "onboarded",
        businessName: "Healthy",
        onboardedMonitor: {
          journeyDay: 20,
          journeyPhase: "graduated",
          isActive: true,
          gettingStartedCompleted: 5,
          activityDayCount: 12,
          onboardedAt: "2026-08-01T00:00:00.000Z",
          flags: [],
        },
      }),
      lead({
        id: "day8",
        stage: "onboarded",
        businessName: "Day8",
        onboardedMonitor: {
          journeyDay: 9,
          journeyPhase: "day8_14",
          isActive: false,
          gettingStartedCompleted: 1,
          activityDayCount: 2,
          onboardedAt: "2026-09-06T00:00:00.000Z",
          flags: ["journey_inactive_day8"],
        },
      }),
      lead({
        id: "grace",
        stage: "onboarded",
        businessName: "Grace",
        onboardedMonitor: {
          journeyDay: 30,
          journeyPhase: "graduated",
          isActive: true,
          gettingStartedCompleted: 6,
          activityDayCount: 15,
          onboardedAt: "2026-08-01T00:00:00.000Z",
          flags: ["subscription_grace_period"],
        },
      }),
      lead({
        id: "cold",
        stage: "onboarded",
        businessName: "Cold flag",
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
      lead({
        id: "expiring",
        stage: "onboarded",
        businessName: "Expiring",
        onboardedMonitor: {
          journeyDay: 25,
          journeyPhase: "graduated",
          isActive: true,
          gettingStartedCompleted: 4,
          activityDayCount: 10,
          onboardedAt: "2026-08-10T00:00:00.000Z",
          flags: ["subscription_expiring_soon"],
        },
      }),
    ];

    expect(
      sortLeadsForList(onboardedRows, "onboardedDefault", "desc").map(
        (row) => row.id,
      ),
    ).toEqual(["grace", "cold", "expiring", "day8", "healthy"]);
  });

  it("describes active filters as clearable chips", () => {
    const chips = describeActiveLeadListFilters(
      filters({
        search: "aqua",
        assignedToUid: "alice",
        warmStatus: "awaiting_reply",
        platformSource: "smartrefill",
        attempts: "2",
        inquiredAt: { preset: "today", from: "", to: "" },
      }),
      { assigneeNameByUid: { alice: "Alice Reyes" } },
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      "Search: aqua",
      "Assigned: Alice Reyes",
      "Status: Awaiting reply",
      "Platform: SmartRefill",
      "Attempts: 2",
      "Date inquire: Today",
    ]);

    expect(clearedLeadListFilterValue("search")).toBe("");
    expect(clearedLeadListFilterValue("attempts")).toBe("all");
    expect(clearedLeadListFilterValue("inquiredAt")).toEqual({
      preset: "all",
      from: "",
      to: "",
    });
  });
});
