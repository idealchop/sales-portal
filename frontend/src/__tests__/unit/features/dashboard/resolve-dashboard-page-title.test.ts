import { describe, expect, it } from "vitest";
import { resolveDashboardPageTitle } from "@/features/dashboard/lib/resolve-dashboard-page-title";

describe("resolveDashboardPageTitle", () => {
  it("resolves dashboard app routes", () => {
    expect(resolveDashboardPageTitle("/dashboard")).toBe("All apps");
    expect(resolveDashboardPageTitle("/dashboard/smartrefill")).toBe("SmartRefill");
    expect(resolveDashboardPageTitle("/dashboard/smartrefill-old")).toBe(
      "SmartRefill (legacy)",
    );
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

  it("resolves Events & Training routes", () => {
    expect(resolveDashboardPageTitle("/events-training")).toBe("Overview");
    expect(resolveDashboardPageTitle("/events-training/blogs")).toBe(
      "Articles",
    );
    expect(resolveDashboardPageTitle("/events-training/videos")).toBe(
      "Stories",
    );
    expect(resolveDashboardPageTitle("/events-training/tutorials")).toBe(
      "Tutorials",
    );
    expect(resolveDashboardPageTitle("/events-training/webinars")).toBe(
      "Webinars",
    );
    expect(resolveDashboardPageTitle("/events-training/registrations")).toBe(
      "Registrations",
    );
    expect(resolveDashboardPageTitle("/events-training/schedules")).toBe(
      "Schedules",
    );
    expect(resolveDashboardPageTitle("/events-training/moderation")).toBe(
      "Moderation",
    );
    expect(resolveDashboardPageTitle("/events-training/certifications")).toBe(
      "Certifications",
    );
    expect(resolveDashboardPageTitle("/events-training/analytics")).toBe(
      "Analytics",
    );
  });
});
