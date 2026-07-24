import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  CircleDollarSign,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { SalesPortalRole } from "@/lib/auth-status";
import { EVENTS_TRAINING_SIDEBAR_CHILDREN } from "@/features/events-training/lib/events-training-nav";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: SalesPortalRole[];
  maintenance?: boolean;
  children?: Array<{ href: string; label: string }>;
};

export const DASHBOARD_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["sales", "manager", "admin"],
    maintenance: false,
    children: [
      { href: "/dashboard", label: "All apps" },
      { href: "/dashboard/smartrefill", label: "SmartRefill" },
      { href: "/dashboard/smartrefill-old", label: "SmartRefill (legacy)" },
      { href: "/dashboard/sales-portal", label: "Sales" },
    ],
  },
  {
    href: "/dashboard/my-team",
    label: "My Team",
    icon: Users,
    roles: ["manager"],
    maintenance: false,
  },
  {
    href: "/dashboard/proposals",
    label: "Proposals & Clients",
    icon: FileText,
    roles: ["sales", "manager", "admin"],
    maintenance: false,
  },
  {
    href: "/dashboard/commissions",
    label: "Commissions",
    icon: CircleDollarSign,
    roles: ["sales", "manager", "admin"],
    maintenance: false,
  },
  {
    href: "/dashboard/materials",
    label: "Sales Materials",
    icon: BookCopy,
    roles: ["sales", "manager", "admin"],
    maintenance: false,
  },
  {
    href: "/content-studio",
    label: "Content Studio",
    icon: Megaphone,
    roles: ["sales", "manager", "admin"],
    maintenance: false,
  },
  {
    href: "/events-training",
    label: "Events & Training",
    icon: GraduationCap,
    roles: ["manager", "admin"],
    maintenance: false,
    children: [...EVENTS_TRAINING_SIDEBAR_CHILDREN],
  },
  {
    href: "/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    roles: ["admin"],
    maintenance: false,
    children: [
      { href: "/subscriptions/addons", label: "Addons management" },
      {
        href: "/subscriptions/vouchers-affiliates",
        label: "Voucher & affiliates management",
      },
      { href: "/subscriptions/plans", label: "Plan management" },
    ],
  },
  {
    href: "/admin",
    label: "Admin",
    icon: ShieldCheck,
    roles: ["admin"],
    maintenance: false,
    children: [
      { href: "/admin/permissions", label: "Permission" },
      { href: "/admin/data-management", label: "Data management" },
    ],
  },
];
