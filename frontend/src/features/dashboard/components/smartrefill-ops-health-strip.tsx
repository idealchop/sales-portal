"use client";

import {
  AlertTriangle,
  Bell,
  CreditCard,
  UserMinus,
  UserPlus,
  ClipboardCheck,
} from "lucide-react";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { filterInactiveOwners } from "@/features/dashboard/lib/sort-active-owners";
import { cn } from "@/lib/utils";

function OpsTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "default" | "warn" | "danger" | "ok";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "danger" ? "border-red-200 bg-red-50/60"
    : tone === "warn" ? "border-amber-200 bg-amber-50/50"
    : tone === "ok" ? "border-emerald-200 bg-emerald-50/40"
    : "border-[var(--border)] bg-white";

  const iconClass =
    tone === "danger" ? "bg-red-100 text-red-700"
    : tone === "warn" ? "bg-amber-100 text-amber-800"
    : tone === "ok" ? "bg-emerald-100 text-emerald-700"
    : "bg-teal-50 text-teal-700";

  const body = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
          {value}
        </p>
        {hint ?
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{hint}</p>
        : null}
      </div>
      <div className={cn("rounded-md p-1.5", iconClass)}>{icon}</div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "rounded-xl border p-3 text-left shadow-sm transition",
          toneClass,
          "hover:ring-2 hover:ring-teal-200 focus-visible:outline-none",
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={cn("rounded-xl border p-3 text-left shadow-sm", toneClass)}>
      {body}
    </div>
  );
}

export function SmartRefillOpsHealthStrip({
  data,
  onJump,
}: {
  data: DashboardAnalytics;
  onJump?: (tabId: string, anchorId?: string) => void;
}) {
  const { salesInsights, platformAlerts, summary, newJoiners } = data;
  const inactiveOwners = filterInactiveOwners(
    data.growthSalesMetrics.activeOwners,
  );
  const pendingApprovals = data.growthSalesMetrics.activeOwners.reduce(
    (sum, owner) => sum + (owner.pendingApprovals ?? 0),
    0,
  );
  const newUsersMtd = salesInsights.newSmartRefillUsersThisMonth;
  const recentPlatformJoiners = newJoiners?.platformUsers.length ?? 0;
  const alertCount = platformAlerts.items.length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted-foreground)]">
        Support & maintenance snapshot — jump into the queue that needs attention.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <OpsTile
          label="Open alerts"
          value={alertCount.toLocaleString()}
          hint="Demo · new users · subscriptions"
          icon={<Bell className="h-3.5 w-3.5" />}
          tone={alertCount > 0 ? "warn" : "ok"}
          onClick={() => onJump?.("attention", "smartrefill-alerts")}
        />
        <OpsTile
          label="Inactive owners"
          value={inactiveOwners.length.toLocaleString()}
          hint="No login · 7d+"
          icon={<UserMinus className="h-3.5 w-3.5" />}
          tone={inactiveOwners.length > 0 ? "warn" : "ok"}
          onClick={() => onJump?.("attention", "smartrefill-inactive")}
        />
        <OpsTile
          label="Pending approvals"
          value={pendingApprovals.toLocaleString()}
          hint="Subscription review queue"
          icon={<ClipboardCheck className="h-3.5 w-3.5" />}
          tone={pendingApprovals > 0 ? "warn" : "default"}
          onClick={() => onJump?.("subscriptions")}
        />
        <OpsTile
          label="At-risk workspaces"
          value={salesInsights.atRiskWorkspaces.toLocaleString()}
          hint={`${salesInsights.inactiveWorkspaces} inactive · 30d`}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          tone={salesInsights.atRiskWorkspaces > 0 ? "danger" : "default"}
          onClick={() => onJump?.("analytics")}
        />
        <OpsTile
          label="Pending payments"
          value={salesInsights.pendingPayments.toLocaleString()}
          hint="Billing follow-up"
          icon={<CreditCard className="h-3.5 w-3.5" />}
          tone={salesInsights.pendingPayments > 0 ? "warn" : "default"}
          onClick={() => onJump?.("subscriptions")}
        />
        <OpsTile
          label="New users MTD"
          value={newUsersMtd.toLocaleString()}
          hint={`${recentPlatformJoiners} recent joiners · ${summary.onboardedBusinesses}/${summary.totalBusinesses} onboarded`}
          icon={<UserPlus className="h-3.5 w-3.5" />}
          tone="default"
          onClick={() => onJump?.("attention", "smartrefill-alerts")}
        />
      </div>
    </div>
  );
}
