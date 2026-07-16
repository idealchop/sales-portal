import { describe, expect, it } from "vitest";
import { DASHBOARD_NAV } from "@/features/dashboard/config/nav-items";

describe("DASHBOARD_NAV role gates", () => {
  it("shows Subscriptions and Admin only for admin", () => {
    const subscriptions = DASHBOARD_NAV.find((item) => item.href === "/subscriptions");
    const admin = DASHBOARD_NAV.find((item) => item.href === "/admin");

    expect(subscriptions?.roles).toEqual(["admin"]);
    expect(admin?.roles).toEqual(["admin"]);
  });

  it("shows Content Studio for sales, manager, and admin", () => {
    const contentStudio = DASHBOARD_NAV.find(
      (item) => item.href === "/content-studio",
    );

    expect(contentStudio?.roles).toEqual(["sales", "manager", "admin"]);
  });

  it("restricts My Team to manager only", () => {
    const myTeam = DASHBOARD_NAV.find((item) => item.href === "/dashboard/my-team");

    expect(myTeam?.roles).toEqual(["manager"]);
  });

  it("marks maintenance routes for coming soon UI", () => {
    const maintenanceHrefs: string[] = [];

    for (const href of maintenanceHrefs) {
      const item = DASHBOARD_NAV.find((nav) => nav.href === href);
      expect(item?.maintenance).toBe(true);
    }
  });

  it("ships Tier 3 sales workflow routes without maintenance", () => {
    const liveHrefs = [
      "/dashboard/proposals",
      "/dashboard/commissions",
      "/dashboard/my-team",
      "/dashboard/materials",
    ];

    for (const href of liveHrefs) {
      const item = DASHBOARD_NAV.find((nav) => nav.href === href);
      expect(item?.maintenance).toBe(false);
    }
  });

  it("exposes multi-app dashboard children under Dashboard nav", () => {
    const dashboard = DASHBOARD_NAV.find((item) => item.href === "/dashboard");

    expect(dashboard?.children?.map((child) => child.href)).toEqual([
      "/dashboard",
      "/dashboard/smartrefill",
      "/dashboard/sales-portal",
    ]);
  });

  it("exposes Events & Training for manager/admin with ops children", () => {
    const events = DASHBOARD_NAV.find((item) => item.href === "/events-training");

    expect(events?.roles).toEqual(["manager", "admin"]);
    expect(events?.maintenance).toBe(false);
    expect(events?.children?.map((child) => child.href)).toEqual([
      "/events-training",
      "/events-training/analytics",
      "/events-training/registrations",
      "/events-training/moderation",
      "/events-training/webinars",
      "/events-training/videos",
      "/events-training/blogs",
      "/events-training/tutorials",
      "/events-training/certifications",
      "/events-training/schedules",
    ]);
  });
});
