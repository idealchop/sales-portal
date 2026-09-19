import { describe, expect, it } from "vitest";
import { DASHBOARD_NAV } from "@/features/dashboard/config/nav-items";

describe("DASHBOARD_NAV role gates", () => {
  it("shows Subscriptions for all sales roles and Admin only for admin", () => {
    const subscriptions = DASHBOARD_NAV.find((item) => item.href === "/subscriptions");
    const admin = DASHBOARD_NAV.find((item) => item.href === "/admin");

    expect(subscriptions?.roles).toEqual(["sales", "manager", "admin"]);
    expect(subscriptions?.children?.map((child) => child.href)).toEqual([
      "/subscriptions/plans",
      "/subscriptions/trial",
      "/subscriptions/addons",
      "/subscriptions/vouchers-affiliates",
    ]);
    expect(admin?.roles).toEqual(["admin"]);
    expect(admin?.children?.map((child) => child.href)).toEqual([
      "/admin/permissions",
      "/admin/data-management",
      "/admin/clone-prod-to-dev",
    ]);
  });

  it("hides deferred sales workflow routes from the sidebar", () => {
    const hiddenHrefs = [
      "/dashboard/proposals",
      "/dashboard/commissions",
      "/dashboard/materials",
      "/content-studio",
    ];

    for (const href of hiddenHrefs) {
      expect(DASHBOARD_NAV.find((nav) => nav.href === href)).toBeUndefined();
    }
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

  it("exposes Sales Dashboard and top-level Lead pipeline", () => {
    const dashboard = DASHBOARD_NAV.find((item) => item.label === "Dashboard");
    const leadPipeline = DASHBOARD_NAV.find((item) => item.label === "Lead pipeline");
    const webApps = DASHBOARD_NAV.find((item) => item.label === "Web apps");

    expect(dashboard?.href).toBe("/dashboard");
    expect(dashboard?.children).toBeUndefined();
    expect(leadPipeline?.href).toBe("/lead-pipeline");
    expect(leadPipeline?.roles).toEqual(["sales", "manager", "admin"]);
    expect(webApps?.href).toBe("/webapp/smartrefill");
    expect(webApps?.children?.map((child) => child.href)).toEqual([
      "/webapp/smartrefill",
      "/dashboard/smartrefill-old",
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
