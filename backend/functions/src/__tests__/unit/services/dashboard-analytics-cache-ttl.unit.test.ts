import { describe, expect, it } from "vitest";
import { DASHBOARD_ANALYTICS_STALE_AFTER_MS } from "../../../services/dashboard-analytics-cache";

describe("DASHBOARD_ANALYTICS_STALE_AFTER_MS", () => {
  it("stays locked at 30 minutes for Firestore cost control", () => {
    expect(DASHBOARD_ANALYTICS_STALE_AFTER_MS).toBe(30 * 60 * 1000);
  });
});
