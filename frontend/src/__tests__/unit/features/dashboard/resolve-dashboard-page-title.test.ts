import { describe, expect, it } from "vitest";
import { resolveDashboardPageTitle } from "@/features/dashboard/lib/resolve-dashboard-page-title";

describe("resolveDashboardPageTitle", () => {
  it("resolves dashboard app routes", () => {
    expect(resolveDashboardPageTitle("/dashboard")).toBe("Platform overview");
    expect(resolveDashboardPageTitle("/dashboard/smartrefill")).toBe("SmartRefill");
    expect(resolveDashboardPageTitle("/dashboard/sales-portal")).toBe(
      "Sales Portal",
    );
  });

  it("resolves other dashboard pages", () => {
    expect(resolveDashboardPageTitle("/dashboard/proposals")).toBe(
      "Proposals & Clients",
    );
    expect(resolveDashboardPageTitle("/dashboard/settings")).toBe("Settings");
  });
});
