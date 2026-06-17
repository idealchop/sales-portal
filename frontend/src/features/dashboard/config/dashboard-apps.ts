import { Briefcase, Droplets, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardAppId = "platform" | "smartrefill" | "sales-portal";

export type DashboardAppStatus = "live" | "coming_soon";

export type DashboardAppDefinition = {
  id: DashboardAppId;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: DashboardAppStatus;
  accentClass: string;
};

export const DASHBOARD_APPS: DashboardAppDefinition[] = [
  {
    id: "platform",
    label: "Platform overview",
    shortLabel: "All apps",
    description: "Combined KPIs, maps, and ROI across every integrated product.",
    href: "/dashboard",
    icon: LayoutGrid,
    status: "live",
    accentClass: "bg-slate-100 text-slate-800",
  },
  {
    id: "smartrefill",
    label: "SmartRefill",
    shortLabel: "SmartRefill",
    description: "Owner workspaces, subscriptions, growth, and product health.",
    href: "/dashboard/smartrefill",
    icon: Droplets,
    status: "live",
    accentClass: "bg-teal-50 text-teal-800",
  },
  {
    id: "sales-portal",
    label: "Sales Portal",
    shortLabel: "Sales Portal",
    description: "Pipeline, commissions, proposals, and rep performance.",
    href: "/dashboard/sales-portal",
    icon: Briefcase,
    status: "live",
    accentClass: "bg-violet-50 text-violet-800",
  },
];

/** Placeholder row for future integrated apps on the platform hub. */
export const FUTURE_DASHBOARD_APPS = [
  {
    id: "future-app",
    label: "Future apps",
    shortLabel: "More soon",
    description: "Additional River platform products will appear here.",
    status: "coming_soon" as const,
  },
];

export function getDashboardApp(id: DashboardAppId) {
  return DASHBOARD_APPS.find((app) => app.id === id);
}

export function isDashboardAppPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/smartrefill") ||
    pathname.startsWith("/dashboard/sales-portal")
  );
}
