import { describe, expect, it } from "vitest";
import { chartKindsForApp } from "@/features/dashboard/lib/app-chart-groups";

describe("chartKindsForApp", () => {
  it("assigns non-overlapping chart kinds to SmartRefill and Sales Portal", () => {
    const smartrefill = new Set(chartKindsForApp("smartrefill"));
    const salesPortal = new Set(chartKindsForApp("sales-portal"));
    const overlap = [...smartrefill].filter((kind) => salesPortal.has(kind));

    expect(overlap).toEqual([]);
    expect(smartrefill.size).toBeGreaterThan(0);
    expect(salesPortal.size).toBeGreaterThan(0);
  });

  it("uses product-usage charts for SmartRefill", () => {
    const kinds = chartKindsForApp("smartrefill");
    expect(kinds).toContain("customer-scale");
    expect(kinds).toContain("feature-adoption");
    expect(kinds).not.toContain("mrr-by-plan");
    expect(kinds).not.toContain("proposal-pipeline");
  });

  it("uses revenue and pipeline charts for Sales Portal", () => {
    const kinds = chartKindsForApp("sales-portal");
    expect(kinds).toContain("mrr-by-plan");
    expect(kinds).toContain("proposal-pipeline");
    expect(kinds).toContain("revenue-trend");
    expect(kinds).not.toContain("device-mix");
    expect(kinds).not.toContain("customer-scale");
  });

  it("returns no charts for platform app id", () => {
    expect(chartKindsForApp("platform")).toEqual([]);
  });
});
