import { Archive, Briefcase, Droplets } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardAppId =
  | "platform"
  | "smartrefill"
  | "smartrefill-old"
  | "sales-portal";

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
    id: "smartrefill",
    label: "SmartRefill",
    shortLabel: "SmartRefill",
    description: "Owner workspaces, subscriptions, growth, and product health.",
    href: "/webapp/smartrefill",
    icon: Droplets,
    status: "live",
    accentClass: "bg-teal-50 text-teal-800",
  },
  {
    id: "smartrefill-old",
    label: "SmartRefill (legacy)",
    shortLabel: "SR legacy",
    description:
      "Triage and outreach for stations still on the older Smart Refill database.",
    href: "/dashboard/smartrefill-old",
    icon: Archive,
    status: "live",
    accentClass: "bg-amber-50 text-amber-900",
  },
  {
    id: "sales-portal",
    label: "Dashboard",
    shortLabel: "Sales",
    description:
      "Action board for assigned leads, follow-ups, and personal sales performance.",
    href: "/dashboard",
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

/** Platform analytics snapshot routes (not SR-legacy — that uses its own API). */
export function isDashboardAppPath(pathname: string): boolean {
  if (pathname.startsWith("/dashboard/smartrefill-old")) return false;
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/smartrefill") ||
    pathname.startsWith("/dashboard/sales-portal")
  );
}
