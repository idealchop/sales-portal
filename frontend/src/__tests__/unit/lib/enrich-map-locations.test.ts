import { describe, expect, it } from "vitest";
import {
  enrichMapLocations,
  filterTestAccountMapLocations,
} from "@/lib/dashboard/enrich-map-locations";
import type { ActiveOwner, BusinessMapLocation } from "@/lib/dashboard/analytics";

function location(
  overrides: Partial<BusinessMapLocation> & Pick<BusinessMapLocation, "id">,
): BusinessMapLocation {
  return {
    name: overrides.id,
    lat: 14.5,
    lng: 121,
    onboardingComplete: true,
    ...overrides,
  };
}

describe("filterTestAccountMapLocations", () => {
  it("removes locations with authAccountTag test", () => {
    const rows = [
      location({ id: "biz-test", authAccountTag: "test" }),
      location({ id: "biz-live", authAccountTag: null }),
    ];

    expect(filterTestAccountMapLocations(rows).map((row) => row.id)).toEqual([
      "biz-live",
    ]);
  });

  it("removes locations when active owner has authAccountTag test", () => {
    const owners: ActiveOwner[] = [
      {
        id: "biz-test",
        ownerId: "owner-test",
        businessName: "Test station",
        customers: 0,
        transactionsLast30Days: 0,
        healthTier: "low",
        onboardingComplete: true,
        monthlyRevenue: 0,
        authAccountTag: "test",
      },
    ];

    const rows = [location({ id: "biz-test", ownerId: "owner-test" })];

    expect(filterTestAccountMapLocations(rows, owners)).toEqual([]);
    expect(enrichMapLocations(rows, owners)).toEqual([]);
  });
});
