import { describe, expect, it } from "vitest";
import {
  filterAndSortTrialStations,
  trialStationDataManagementPath,
} from "@/features/admin/lib/trial-station-list";
import type { UserSubscriptionListItem } from "@/features/dashboard/lib/build-user-subscriptions-list";

const now = new Date("2026-09-29T04:00:00.000Z");

function row(input: {
  businessId: string;
  businessName: string;
  ownerEmail: string;
  planCode: string;
  expiresAt: string;
  lastActiveDay: string;
  activatedAt: string;
}): UserSubscriptionListItem {
  return {
    businessId: input.businessId,
    businessName: input.businessName,
    ownerEmail: input.ownerEmail,
    lastActiveDay: input.lastActiveDay,
    subscription: {
      id: input.businessId,
      planName: input.planCode,
      planCode: input.planCode,
      status: "active",
      billingCycle: "trial",
      price: 0,
      timeline: "current",
      expiresAt: input.expiresAt,
      activatedAt: input.activatedAt,
      cancelAtPeriodEnd: false,
      needsApproval: false,
      isDowngrade: false,
      isCancellation: false,
    },
    changeKind: "other",
    activeSubscriptionCount: 1,
    history: [],
    planSortRank: 0,
    hasPendingPayment: false,
    justPaid: false,
    opsBucket: "trial",
    planTier: "trial",
    isGrace: false,
    isExpired: false,
    isExpiringSoon: false,
    isVoucher: false,
  };
}

const stations = [
  row({
    businessId: "a",
    businessName: "Alqua Stream",
    ownerEmail: "a@example.com",
    planCode: "scale",
    expiresAt: "2026-10-10T00:00:00.000Z",
    lastActiveDay: "2026-09-27",
    activatedAt: "2026-09-25T00:00:00.000Z",
  }),
  row({
    businessId: "b",
    businessName: "Smart Refill Demo",
    ownerEmail: "demo@example.com",
    planCode: "grow",
    expiresAt: "2026-09-29T00:00:00.000Z",
    lastActiveDay: "2026-09-14",
    activatedAt: "2026-09-14T00:00:00.000Z",
  }),
];

describe("filterAndSortTrialStations", () => {
  it("keeps soonest expiry first by default", () => {
    const result = filterAndSortTrialStations(stations, { now });
    expect(result.map((item) => item.businessId)).toEqual(["b", "a"]);
  });

  it("filters by plan and ending soon", () => {
    expect(
      filterAndSortTrialStations(stations, { plan: "grow", now }).map((item) => item.businessId),
    ).toEqual(["b"]);
    expect(
      filterAndSortTrialStations(stations, { urgency: "ending", now }).map(
        (item) => item.businessId,
      ),
    ).toEqual(["b"]);
  });

  it("matches station name or owner email", () => {
    expect(
      filterAndSortTrialStations(stations, { query: "demo@", now }).map((item) => item.businessId),
    ).toEqual(["b"]);
  });

  it("links a trial station to its data management business page", () => {
    expect(
      trialStationDataManagementPath({
        businessId: "biz-1",
        ownerUserId: "owner-1",
      }),
    ).toBe(
      "/admin/data-management/business/biz-1?returnTo=%2Fsubscriptions%2Ftrial&userId=owner-1",
    );
    expect(trialStationDataManagementPath({ businessId: "  " })).toBeNull();
  });

  it("sorts stations alphabetically", () => {
    expect(
      filterAndSortTrialStations(stations, { sort: "station-asc", now }).map(
        (item) => item.businessName,
      ),
    ).toEqual(["Alqua Stream", "Smart Refill Demo"]);
  });
});
