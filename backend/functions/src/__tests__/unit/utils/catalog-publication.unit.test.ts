import { describe, expect, it } from "vitest";
import {
  catalogStatusOf,
  commercialCatalogFields,
  isCatalogLiveForNewSales,
  isVersionedCatalogCollection,
  nextManilaMidnight,
} from "../../../utils/catalog-publication";

describe("catalog-publication", () => {
  it("treats missing catalogStatus as published", () => {
    expect(catalogStatusOf({})).toBe("published");
    expect(catalogStatusOf({ catalogStatus: "draft" })).toBe("draft");
  });

  it("hides draft, inactive, and not-yet-effective rows from new sales", () => {
    const now = new Date("2026-09-19T04:00:00Z");
    expect(isCatalogLiveForNewSales({ catalogStatus: "published" }, now)).toBe(true);
    expect(isCatalogLiveForNewSales({ catalogStatus: "draft" }, now)).toBe(false);
    expect(
      isCatalogLiveForNewSales({ catalogStatus: "published", isActive: false }, now),
    ).toBe(false);
    expect(
      isCatalogLiveForNewSales(
        { catalogStatus: "published", effectiveAt: "2026-09-20T00:00:00+08:00" },
        now,
      ),
    ).toBe(false);
  });

  it("keeps effectiveAt on commercial draft payload", () => {
    const commercial = commercialCatalogFields({
      name: "Grow",
      catalogStatus: "draft",
      draft: { name: "x" },
      effectiveAt: "2026-09-20T16:00:00.000Z",
      publishedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(commercial.name).toBe("Grow");
    expect(commercial.effectiveAt).toBe("2026-09-20T16:00:00.000Z");
    expect(commercial.catalogStatus).toBeUndefined();
    expect(commercial.draft).toBeUndefined();
  });

  it("versions plans and trial policy only", () => {
    expect(isVersionedCatalogCollection("subscription_plans")).toBe(true);
    expect(isVersionedCatalogCollection("subscription_trial_policy")).toBe(true);
    expect(isVersionedCatalogCollection("subscription_addons")).toBe(false);
  });

  it("computes the next Asia/Manila midnight", () => {
    const from = new Date("2026-09-19T10:30:00+08:00");
    const next = nextManilaMidnight(from);
    expect(next.toISOString()).toBe("2026-09-19T16:00:00.000Z");
  });
});
