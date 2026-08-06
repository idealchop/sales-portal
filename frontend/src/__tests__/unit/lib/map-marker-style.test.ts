import { describe, expect, it } from "vitest";
import type { BusinessMapLocation } from "@/lib/dashboard/analytics";
import {
  filterLocationsByMapMarkerTiers,
  isValidMapCoordinate,
  resolveMapMarkerTier,
} from "@/lib/dashboard/map-marker-style";

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

describe("isValidMapCoordinate", () => {
  it("rejects null island and out-of-range coords", () => {
    expect(isValidMapCoordinate(0, 0)).toBe(false);
    expect(isValidMapCoordinate(Number.NaN, 121)).toBe(false);
    expect(isValidMapCoordinate(91, 121)).toBe(false);
    expect(isValidMapCoordinate(14.5, 121)).toBe(true);
  });
});

describe("filterLocationsByMapMarkerTiers", () => {
  it("returns only locations whose tier is visible", () => {
    const rows = [
      location({
        id: "scale-1",
        planCode: "scale",
        lastActiveDay: "2099-01-01",
      }),
      location({ id: "inactive-1", lastActiveDay: "2000-01-01" }),
    ];

    const filtered = filterLocationsByMapMarkerTiers(
      rows,
      new Set(["scale"]),
    );

    expect(filtered.map((row) => row.id)).toEqual(["scale-1"]);
    expect(resolveMapMarkerTier(rows[1])).toBe("inactive");
  });

  it("classifies billing trial as free trial even on scale plan", () => {
    expect(
      resolveMapMarkerTier(
        location({
          id: "trial",
          planCode: "scale",
          billingCycle: "trial",
          lastActiveDay: "2099-01-01",
        }),
      ),
    ).toBe("free-trial");
  });
});
