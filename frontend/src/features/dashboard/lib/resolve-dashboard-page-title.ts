import { DASHBOARD_APPS } from "@/features/dashboard/config/dashboard-apps";
import { DASHBOARD_NAV } from "@/features/dashboard/config/nav-items";

function isExactDashboard(pathname: string, href: string): boolean {
  // Index routes that are prefixes of sibling pages must match exactly.
  if (href === "/dashboard" || href === "/events-training") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveDashboardPageTitle(pathname: string): string {
  const app = DASHBOARD_APPS.find((entry) => isExactDashboard(pathname, entry.href));
  if (app) return app.label;

  for (const item of DASHBOARD_NAV) {
    const child = item.children?.find((entry) =>
      isExactDashboard(pathname, entry.href),
    );
    if (child) return child.label;

    if (isExactDashboard(pathname, item.href)) return item.label;
  }

  if (pathname.startsWith("/admin/permissions")) return "Permissions";
  if (pathname.startsWith("/admin/data-management")) return "Data management";
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/subscriptions/plans")) return "Plan management";
  if (pathname.startsWith("/subscriptions/addons")) return "Addons management";
  if (pathname.startsWith("/subscriptions/vouchers-affiliates")) {
    return "Voucher & affiliates management";
  }
  if (pathname.startsWith("/subscriptions")) return "Subscriptions";
  if (pathname.startsWith("/content-studio")) return "Content Studio";
  if (pathname.startsWith("/events-training/webinars")) return "Webinars";
  if (pathname.startsWith("/events-training/tutorials")) return "Tutorials";
  if (pathname.startsWith("/events-training/videos")) return "Stories";
  if (pathname.startsWith("/events-training/blogs")) return "Articles";
  if (pathname.startsWith("/events-training/registrations")) return "Registrations";
  if (pathname.startsWith("/events-training/schedules")) return "Schedules";
  if (pathname.startsWith("/events-training/moderation")) return "Moderation";
  if (pathname.startsWith("/events-training/certifications")) {
    return "Certifications";
  }
  if (pathname.startsWith("/events-training/analytics")) return "Analytics";
  if (pathname === "/events-training") return "Overview";
  if (pathname.startsWith("/events-training")) return "Events & Training";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/dashboard/proposals/new")) return "Create proposal";

  return "Sales Portal";
}
