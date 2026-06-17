import { describe, expect, it } from "vitest";
import { forecastsForApp } from "@/features/dashboard/lib/forecast-items";
import type { DashboardForecasts } from "@/lib/dashboard/analytics";

const SAMPLE: DashboardForecasts = {
  platform: [{ metric: "MRR", current: "₱1", projected: "₱2", delta: "+1", horizon: "30d", priority: "high", roiImpact: "₱1", action: "Follow up" }],
  smartrefill: [{ metric: "Users", current: "10", projected: "12", delta: "+2", horizon: "30d", priority: "medium", roiImpact: "—", action: "Onboard" }],
  salesPortal: [{ metric: "Pipeline", current: "₱0", projected: "₱5k", delta: "+5k", horizon: "30d", priority: "high", roiImpact: "₱5k", action: "Close" }],
  aiEnabled: false,
};

describe("forecastsForApp", () => {
  it("returns platform forecasts for platform app", () => {
    expect(forecastsForApp(SAMPLE, "platform")).toEqual(SAMPLE.platform);
  });

  it("returns smartrefill and sales portal slices", () => {
    expect(forecastsForApp(SAMPLE, "smartrefill")).toEqual(SAMPLE.smartrefill);
    expect(forecastsForApp(SAMPLE, "sales-portal")).toEqual(SAMPLE.salesPortal);
  });

  it("returns empty array when forecasts are missing", () => {
    expect(forecastsForApp(undefined, "platform")).toEqual([]);
  });
});
