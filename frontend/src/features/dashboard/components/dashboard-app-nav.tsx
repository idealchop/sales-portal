"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_APPS,
  FUTURE_DASHBOARD_APPS,
} from "@/features/dashboard/config/dashboard-apps";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function DashboardAppNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {DASHBOARD_APPS.map((app) => {
        const Icon = app.icon;
        const active = isActive(pathname, app.href);
        return (
          <Link
            key={app.id}
            href={app.href}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              active ?
                "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
              : "border-[var(--border)] bg-white text-foreground hover:border-teal-200 hover:bg-teal-50/50",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {app.shortLabel}
          </Link>
        );
      })}
      {FUTURE_DASHBOARD_APPS.map((app) => (
        <span
          key={app.id}
          className="inline-flex min-h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500"
        >
          {app.shortLabel}
          <Badge className="bg-zinc-100 text-[10px] uppercase text-zinc-600">
            Soon
          </Badge>
        </span>
      ))}
    </div>
  );
}
