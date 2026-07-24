"use client";

import Link from "next/link";
import {
  BookCopy,
  CircleDollarSign,
  Droplets,
  FileText,
  Users,
} from "lucide-react";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  {
    href: "/dashboard/proposals",
    label: "Proposals & clients",
    hint: "Build and follow deals",
    icon: FileText,
  },
  {
    href: "/dashboard/commissions",
    label: "Commissions",
    hint: "Earnings & payouts",
    icon: CircleDollarSign,
  },
  {
    href: "/dashboard/materials",
    label: "Sales materials",
    hint: "Pitch decks & assets",
    icon: BookCopy,
  },
  {
    href: "/dashboard/smartrefill",
    label: "SmartRefill leads",
    hint: "Owners, alerts, upsells",
    icon: Droplets,
  },
] as const;

/** Quick links that keep reps in a sales workflow. */
export function SalesPortalShortcuts() {
  const { profile } = useSalesProfile();
  const showTeam = profile?.role === "manager";

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {SHORTCUTS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group rounded-xl border border-[var(--border)] bg-white p-3 transition",
              "hover:border-teal-200 hover:bg-teal-50/40",
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className="rounded-lg bg-teal-50 p-2 text-teal-700 group-hover:bg-white">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                  {item.hint}
                </span>
              </span>
            </div>
          </Link>
        );
      })}
      {showTeam ?
        <Link
          href="/dashboard/my-team"
          className={cn(
            "group rounded-xl border border-[var(--border)] bg-white p-3 transition",
            "hover:border-teal-200 hover:bg-teal-50/40",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="rounded-lg bg-teal-50 p-2 text-teal-700 group-hover:bg-white">
              <Users className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                My team
              </span>
              <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                Rep pipeline & coaching
              </span>
            </span>
          </div>
        </Link>
      : null}
    </div>
  );
}
