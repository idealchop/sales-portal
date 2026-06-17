import { DASHBOARD_APPS } from "@/features/dashboard/config/dashboard-apps";
import { DASHBOARD_NAV } from "@/features/dashboard/config/nav-items";

function isExactDashboard(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
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
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/dashboard/proposals/new")) return "Create proposal";

  return "Sales Portal";
}
