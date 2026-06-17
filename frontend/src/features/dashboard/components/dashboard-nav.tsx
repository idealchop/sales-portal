"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV, type NavItem } from "@/features/dashboard/config/nav-items";
import type { SalesPortalRole } from "@/lib/auth-status";

function isChildNavActive(pathname: string, childHref: string): boolean {
  if (childHref === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(childHref);
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/smartrefill") ||
      pathname.startsWith("/dashboard/sales-portal")
    );
  }
  return pathname.startsWith(item.href);
}

export function DashboardNav({
  role,
  onNavigate,
}: {
  role: SalesPortalRole | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const items = DASHBOARD_NAV.filter(
    (item) => role && item.roles.includes(role),
  );

  function toggleGroup(href: string) {
    setExpandedGroups((prev) => ({
      ...prev,
      [href]: !(prev[href] ?? pathname.startsWith(href)),
    }));
  }

  function isGroupExpanded(item: NavItem): boolean {
    if (!item.children?.length) return false;
    if (expandedGroups[item.href] !== undefined) {
      return expandedGroups[item.href];
    }
    return pathname.startsWith(item.href);
  }

  return (
    <nav className="space-y-1 p-3">
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const groupExpanded = hasChildren && isGroupExpanded(item);
        const childActive =
          hasChildren &&
          item.children!.some((child) => isChildNavActive(pathname, child.href));
        const isActive =
          hasChildren ? childActive : isItemActive(pathname, item);
        const Icon = item.icon;

        return (
          <div key={item.href}>
            {hasChildren ?
              <button
                type="button"
                onClick={() => toggleGroup(item.href)}
                aria-expanded={groupExpanded}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition min-h-11",
                  isActive ?
                    "bg-[var(--primary)] text-white shadow-sm"
                  : "text-zinc-600 hover:bg-teal-50 hover:text-teal-900",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition",
                    groupExpanded && "rotate-180",
                  )}
                />
              </button>
            : <Link
                href={item.href}
                onClick={onNavigate}
                title={
                  item.maintenance ?
                    `${item.label} — coming soon`
                  : undefined
                }
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition min-h-11",
                  isActive ?
                    "bg-[var(--primary)] text-white shadow-sm"
                  : "text-zinc-600 hover:bg-teal-50 hover:text-teal-900",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.maintenance ?
                  <Badge
                    variant="secondary"
                    className="shrink-0 border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-amber-800"
                  >
                    Soon
                  </Badge>
                : null}
              </Link>
            }

            {hasChildren && groupExpanded && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-zinc-200 pl-3">
                {item.children!.map((child) => {
                  const childIsActive = isChildNavActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition min-h-11",
                        childIsActive ?
                          "bg-teal-50 font-medium text-teal-900"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800",
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
