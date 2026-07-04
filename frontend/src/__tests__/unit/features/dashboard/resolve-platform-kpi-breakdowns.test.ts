import { describe, expect, it } from "vitest";
import {
  deriveBusinessTierCounts,
  parseUserRoleSubtitle,
  parseVirtualStaffSubtitle,
  resolvePlatformKpiSummary,
} from "@/features/dashboard/lib/resolve-platform-kpi-breakdowns";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

describe("parseUserRoleSubtitle", () => {
  it("parses owners, admins, and riders from the users metric subtitle", () => {
    expect(
      parseUserRoleSubtitle("12 owners · 3 admins · 17 riders"),
    ).toEqual({ owners: 12, admins: 3, riders: 17 });
  });
});

describe("parseVirtualStaffSubtitle", () => {
  it("parses staff record counts from team expansion subtitle", () => {
    expect(
      parseVirtualStaffSubtitle(
        "2 staff-admin · 5 staff-rider · 3 missing admin · 1 missing rider",
      ),
    ).toEqual({ admins: 2, riders: 5 });
  });
});

describe("resolvePlatformKpiSummary", () => {
  it("falls back to growth metric subtitle when summary role counts are missing", () => {
    const data = {
      summary: {
        smartRefillUsers: 32,
        totalCustomers: 100,
        totalBusinesses: 10,
      },
      growthSalesMetrics: {
        growth: [
          {
            id: "users",
            title: "Users",
            value: "32",
            subtitle: "12 owners · 3 admins · 17 riders",
            variant: "users" as const,
            breakdown: [],
          },
        ],
        sales: [],
        activeOwners: [],
      },
      chartBusinessContext: [],
    } satisfies Pick<
      DashboardAnalytics,
      "summary" | "growthSalesMetrics" | "chartBusinessContext"
    >;

    expect(resolvePlatformKpiSummary(data).userRoleCounts).toEqual({
      owners: 12,
      admins: 3,
      riders: 17,
    });
  });

  it("falls back to team expansion subtitle for staff records without login", () => {
    const data = {
      summary: { totalBusinesses: 10 },
      growthSalesMetrics: {
        growth: [
          {
            id: "team-expansion-upside",
            title: "Team expansion upside",
            value: "4",
            subtitle: "2 staff-admin · 5 staff-rider · 3 missing admin · 1 missing rider",
            variant: "engagement" as const,
            breakdown: [],
          },
        ],
        sales: [],
        activeOwners: [],
      },
      chartBusinessContext: [],
    } satisfies Pick<
      DashboardAnalytics,
      "summary" | "growthSalesMetrics" | "chartBusinessContext"
    >;

    expect(resolvePlatformKpiSummary(data).virtualStaffCounts).toEqual({
      admins: 2,
      riders: 5,
    });
  });

  it("derives business tier counts from chart business context", () => {
    expect(
      deriveBusinessTierCounts([
        {
          id: "a",
          createdAt: null,
          healthTier: "high",
          planName: "Scale",
          planCode: "scale",
          price: 4999,
          customers: 1,
          transactionsLast30Days: 1,
          usageGoals: [],
          gettingStarted: {},
        },
        {
          id: "b",
          createdAt: null,
          healthTier: "low",
          planName: "Starter",
          planCode: "starter",
          price: 999,
          customers: 0,
          transactionsLast30Days: 0,
          usageGoals: [],
          gettingStarted: {},
        },
      ]),
    ).toEqual({ scale: 1, grow: 0, starter: 1, free: 0 });
  });
});
