import { describe, expect, it } from "vitest";
import {
  formatPlanPriceLine,
  missingRequiredPlanCodes,
  planOnPricingPage,
  sortCatalogPlanDocuments,
} from "@/lib/admin/plan-catalog-display";

describe("plan catalog display", () => {
  it("flags Free when Starter, Grow, and Scale are the only rows", () => {
    expect(
      missingRequiredPlanCodes([
        { data: { code: "grow", name: "Grow" } },
        { data: { code: "scale", name: "Scale" } },
        { data: { code: "starter", name: "Starter" } },
      ]),
    ).toEqual(["free"]);
  });

  it("treats pro as grow so Grow is not reported missing", () => {
    expect(
      missingRequiredPlanCodes([
        { data: { code: "free" } },
        { data: { code: "starter" } },
        { data: { code: "pro" } },
        { data: { code: "scale" } },
      ]),
    ).toEqual([]);
  });

  it("formats Free as ₱0 and paid plans with monthly + yearly", () => {
    expect(formatPlanPriceLine({ pricing: { monthly: 0, yearly: 0 } })).toBe("₱0");
    expect(
      formatPlanPriceLine({ pricing: { monthly: 399, yearly: 3990 } }),
    ).toBe("₱399 / mo · ₱3,990 / yr");
  });

  it("hides Enterprise from the pricing page by default", () => {
    expect(planOnPricingPage({ code: "enterprise" })).toBe(false);
    expect(planOnPricingPage({ code: "free", capabilities: { showOnPricing: true } })).toBe(
      true,
    );
  });

  it("sorts by sortOrder then monthly price so Free is first", () => {
    const sorted = sortCatalogPlanDocuments([
      { documentId: "grow", data: { name: "Grow", sortOrder: 20, pricing: { monthly: 950 } } },
      { documentId: "starter", data: { name: "Starter", sortOrder: 10, pricing: { monthly: 399 } } },
      { documentId: "free", data: { name: "Free", sortOrder: 0, pricing: { monthly: 0 } } },
    ]);
    expect(sorted.map((row) => row.data.name)).toEqual(["Free", "Starter", "Grow"]);
  });
});
