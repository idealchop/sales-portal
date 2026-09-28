import { describe, expect, it } from "vitest";
import { isDashboardAppPath } from "@/features/dashboard/config/dashboard-apps";

describe("isDashboardAppPath", () => {
  it("loads platform analytics on the live SmartRefill web app route", () => {
    expect(isDashboardAppPath("/webapp/smartrefill")).toBe(true);
    expect(isDashboardAppPath("/webapp/smartrefill/extra")).toBe(true);
  });

  it("keeps the sales home and legacy redirect path on platform analytics", () => {
    expect(isDashboardAppPath("/dashboard")).toBe(true);
    expect(isDashboardAppPath("/dashboard/smartrefill")).toBe(true);
    expect(isDashboardAppPath("/dashboard/sales-portal")).toBe(true);
  });

  it("skips routes that do not use the platform snapshot", () => {
    expect(isDashboardAppPath("/dashboard/smartrefill-old")).toBe(false);
    expect(isDashboardAppPath("/lead-pipeline")).toBe(false);
    expect(isDashboardAppPath("/admin")).toBe(false);
  });
});
