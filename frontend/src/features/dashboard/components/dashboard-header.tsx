"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SalesPortalRole } from "@/lib/auth-status";

const ROLE_HEADINGS: Record<SalesPortalRole, { title: string; subtitle: string }> = {
  sales: {
    title: "Sales command center",
    subtitle: "Prioritized accounts, pipeline signals, and outreach targets.",
  },
  manager: {
    title: "Team performance",
    subtitle: "Platform health, approvals, and accounts your team should work.",
  },
  admin: {
    title: "Platform overview",
    subtitle: "Growth, revenue risk, subscriptions, and owner activity.",
  },
};

function formatComputedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardHeader({
  displayName,
  role,
  computedAt,
  isRefreshing,
  onRefresh,
}: {
  displayName?: string | null;
  role?: SalesPortalRole | null;
  computedAt: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const heading = ROLE_HEADINGS[role ?? "sales"];
  const asOf = formatComputedAt(computedAt);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{heading.title}</h1>
        <p className="mt-1 max-w-2xl text-[var(--muted-foreground)]">
          Welcome back, {displayName || "there"}. {heading.subtitle}
        </p>
        {asOf ?
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            Data as of {asOf}
            {isRefreshing ? " · Refreshing…" : ""}
          </p>
        : isRefreshing ?
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            Refreshing analytics…
          </p>
        : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isRefreshing}
        onClick={onRefresh}
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
        />
        Refresh
      </Button>
    </div>
  );
}
