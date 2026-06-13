import { describe, expect, it } from "vitest";
import { buildUserGrowthBreakdownGroups, buildQuarterSignupRows, computeUserGrowthSignals } from "../../../services/build-user-growth-breakdown";
import type { BusinessSnapshot } from "../../../services/compute-sales-insights";

const baseBusiness: BusinessSnapshot = {
  id: "biz-1",
  name: "Acme Water",
  ownerId: "owner-1",
  ownerEmail: "owner@acme.test",
  createdAt: new Date("2026-01-01"),
  onboardingComplete: false,
  price: 0,
  customers: 0,
  transactionsLast30Days: 0,
  gettingStartedCompleted: 1,
};

describe("buildUserGrowthBreakdownGroups", () => {
  it("rolls monthly signups into past and current quarter rows", () => {
    const rows = buildQuarterSignupRows([
      { month: "Jan 2026", count: 2 },
      { month: "Feb 2026", count: 1 },
      { month: "Mar 2026", count: 1 },
      { month: "Apr 2026", count: 0 },
      { month: "May 2026", count: 5 },
      { month: "Jun 2026", count: 9 },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      label: "Past quarter (Q1 2026)",
      value: "4 owner signups",
    });
    expect(rows[1]).toMatchObject({
      label: "Current quarter (Q2 2026)",
      value: "14 owner signups",
    });
  });

  it("surfaces owner pipeline and team expansion growth signals", () => {
    const groups = buildUserGrowthBreakdownGroups({
      users: [
        {
          id: "owner-1",
          createdAt: new Date("2026-06-01"),
          data: {
            appAccess: [{ appId: "smartrefill", role: "owner", businessId: "biz-1" }],
          },
        },
        {
          id: "admin-1",
          createdAt: new Date("2026-05-01"),
          data: {
            appAccess: [{ appId: "smartrefill", role: "admin", businessId: "biz-2" }],
          },
        },
      ],
      businesses: [
        baseBusiness,
        {
          ...baseBusiness,
          id: "biz-2",
          name: "Beta Refill",
          ownerId: "owner-2",
          onboardingComplete: true,
          customers: 12,
          transactionsLast30Days: 4,
          gettingStartedCompleted: 7,
        },
      ],
      ownerLastActive: new Map([["owner-2", "2026-06-10"]]),
      userRoleCounts: { owners: 1, admins: 1, riders: 0, unassigned: 0 },
      smartRefillUsers: 2,
      ownerUserGrowth: [
        { month: "Apr 2026", count: 1 },
        { month: "May 2026", count: 2 },
        { month: "Jun 2026", count: 2 },
      ],
      newOwnerSignupsThisMonth: 1,
      ownerSignupDelta: 0,
      activeLoginUsers: 2,
      activeLoginUsersByRole: { owners: 1, admins: 1, riders: 0 },
      loginSessionsLast30Days: 8,
      monthStart: new Date("2026-06-01"),
      thirtyDayKey: "2026-05-12",
    });

    expect(groups.map((group) => group.title)).toEqual([
      "Acquisition momentum",
      "Active user avg. per role",
    ]);

    const pipeline = computeUserGrowthSignals({
      users: [
        {
          id: "owner-1",
          createdAt: new Date("2026-06-01"),
          data: {
            appAccess: [{ appId: "smartrefill", role: "owner", businessId: "biz-1" }],
          },
        },
        {
          id: "admin-1",
          createdAt: new Date("2026-05-01"),
          data: {
            appAccess: [{ appId: "smartrefill", role: "admin", businessId: "biz-2" }],
          },
        },
      ],
      businesses: [
        baseBusiness,
        {
          ...baseBusiness,
          id: "biz-2",
          name: "Beta Refill",
          ownerId: "owner-2",
          onboardingComplete: true,
          customers: 12,
          transactionsLast30Days: 4,
          gettingStartedCompleted: 7,
        },
      ],
      ownerLastActive: new Map([["owner-2", "2026-06-10"]]),
      userRoleCounts: { owners: 1, admins: 1, riders: 0, unassigned: 0 },
      smartRefillUsers: 2,
      ownerUserGrowth: [
        { month: "Apr 2026", count: 1 },
        { month: "May 2026", count: 2 },
        { month: "Jun 2026", count: 2 },
      ],
      newOwnerSignupsThisMonth: 1,
      ownerSignupDelta: 0,
      activeLoginUsers: 2,
      activeLoginUsersByRole: { owners: 1, admins: 1, riders: 0 },
      loginSessionsLast30Days: 8,
      monthStart: new Date("2026-06-01"),
      thirtyDayKey: "2026-05-12",
    });

    expect(pipeline.conversionPipelineTotal).toBeGreaterThan(0);
    expect(pipeline.workspacesWithoutRider).toBeGreaterThan(0);
    expect(pipeline.newOwnerSignupsThisMonth).toBe(1);

    const acquisition = groups[0]?.rows ?? [];
    expect(acquisition[0]).toMatchObject({
      label: "New owners this month",
      value: "+1",
    });
  });

  it("excludes admin signups from new owners this month", () => {
    const signals = computeUserGrowthSignals({
      users: [
        {
          id: "admin-new",
          createdAt: new Date("2026-06-05"),
          data: {
            appAccess: [{ appId: "smartrefill", role: "admin", businessId: "biz-2" }],
          },
        },
        {
          id: "owner-new",
          createdAt: new Date("2026-06-10"),
          data: {
            appAccess: [{ appId: "smartrefill", role: "owner", businessId: "biz-1" }],
          },
        },
      ],
      businesses: [baseBusiness],
      ownerLastActive: new Map(),
      userRoleCounts: { owners: 1, admins: 1, riders: 0, unassigned: 0 },
      smartRefillUsers: 2,
      ownerUserGrowth: [{ month: "Jun 2026", count: 1 }],
      newOwnerSignupsThisMonth: 1,
      ownerSignupDelta: 0,
      activeLoginUsers: 2,
      activeLoginUsersByRole: { owners: 1, admins: 1, riders: 0 },
      loginSessionsLast30Days: 4,
      monthStart: new Date("2026-06-01"),
      thirtyDayKey: "2026-05-12",
    });

    expect(signals.newOwnerSignupsThisMonth).toBe(1);
    expect(signals.acquisitionRows[0]?.value).toBe("+1");
    expect(signals.activeUserAvgPerRole).toBe("0.7");
  });
});
