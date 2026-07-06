import { describe, expect, it } from "vitest";
import { parseDashboardAnalyticsSnapshot } from "@/lib/dashboard/fetch-dashboard-analytics-snapshot";

describe("parseDashboardAnalyticsSnapshot", () => {
  it("returns null when payload is missing data", () => {
    expect(parseDashboardAnalyticsSnapshot(undefined)).toBeNull();
    expect(parseDashboardAnalyticsSnapshot({ computedAt: "2026-01-01T00:00:00.000Z" })).toBeNull();
  });

  it("normalizes snapshot data and computedAt", () => {
    const parsed = parseDashboardAnalyticsSnapshot({
      computedAt: "2026-06-01T12:00:00.000Z",
      data: {
        summary: { totalCustomers: 12 },
      },
    });

    expect(parsed?.computedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(parsed?.data.summary.totalCustomers).toBe(12);
    expect(parsed?.data.platformAlerts.items).toEqual([]);
  });
});
