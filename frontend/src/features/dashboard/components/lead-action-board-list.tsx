"use client";

import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  LeadActionItem,
  LeadActionKind,
  LeadActionPriority,
} from "@/features/dashboard/lib/build-lead-action-board";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<LeadActionPriority, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-zinc-100 text-zinc-700",
};

const KIND_STYLES: Record<LeadActionKind, string> = {
  overdue_follow_up: "bg-red-50 text-red-800",
  recommend_move_to_cold: "bg-sky-50 text-sky-900",
  subscription_grace_period: "bg-red-50 text-red-800",
  subscription_expiring_soon: "bg-orange-50 text-orange-900",
  journey_inactive_day8: "bg-amber-50 text-amber-900",
  due_soon: "bg-amber-50 text-amber-900",
  never_contacted: "bg-sky-50 text-sky-900",
  subscription_renew: "bg-emerald-50 text-emerald-900",
  subscription_change: "bg-violet-50 text-violet-900",
  no_follow_up: "bg-zinc-100 text-zinc-700",
  active: "bg-teal-50 text-teal-800",
};

const KIND_LABELS: Record<LeadActionKind, string> = {
  overdue_follow_up: "Overdue check-in",
  recommend_move_to_cold: "Went quiet",
  subscription_grace_period: "Plan lapsed",
  subscription_expiring_soon: "Plan ending soon",
  journey_inactive_day8: "New station quiet",
  due_soon: "Check in this week",
  never_contacted: "Say hello",
  subscription_renew: "Came back",
  subscription_change: "Plan changed",
  no_follow_up: "Set a follow-up",
  active: "Assigned",
};

export function LeadActionBoardList({
  items,
  emptyMessage = "You're clear — no assigned lead actions right now.",
  busyLeadId,
  canOpenStation,
  onEmail,
  onRemindTomorrow,
  onLoggedCheckIn,
}: {
  items: LeadActionItem[];
  emptyMessage?: string;
  busyLeadId?: string | null;
  canOpenStation?: boolean;
  onEmail?: (item: LeadActionItem) => void;
  onRemindTomorrow?: (item: LeadActionItem) => void;
  onLoggedCheckIn?: (item: LeadActionItem) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-10 text-center text-sm text-zinc-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const busy = busyLeadId === item.leadId;
        const stationHref =
          canOpenStation && item.linkedBusinessId ?
            `/admin/data-management/business/${item.linkedBusinessId}?returnTo=${encodeURIComponent("/dashboard")}`
          : null;
        return (
          <div
            key={item.id}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{item.title}</p>
              <Badge className={PRIORITY_STYLES[item.priority]}>
                {item.priority === "high" ?
                  "Need now"
                : item.priority === "medium" ?
                  "This week"
                : "Later"}
              </Badge>
              <Badge className={KIND_STYLES[item.kind]}>
                {KIND_LABELS[item.kind]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-600">{item.suggestedAction}</p>
            <p className="mt-1 text-xs text-zinc-500">{item.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.email && onEmail ?
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => onEmail(item)}
                >
                  <Mail className="mr-1 h-3.5 w-3.5" />
                  Email
                </Button>
              : null}
              {item.phone ?
                <a
                  href={`tel:${item.phone.replace(/\s+/g, "")}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-medium text-foreground hover:bg-zinc-50"
                >
                  <Phone className="mr-1 h-3.5 w-3.5" />
                  Call
                </a>
              : null}
              {onLoggedCheckIn ?
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onLoggedCheckIn(item)}
                >
                  I checked in
                </Button>
              : null}
              {onRemindTomorrow ?
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onRemindTomorrow(item)}
                >
                  Remind tomorrow
                </Button>
              : null}
              {stationHref ?
                <Button size="sm" variant="outline" href={stationHref}>
                  Open station
                </Button>
              : null}
              <Button size="sm" variant="outline" href={item.href}>
                Pipeline
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function highlightToneClass(tone: "default" | "warn" | "danger"): string {
  if (tone === "danger") return "border-red-200 bg-red-50/50";
  if (tone === "warn") return "border-amber-200 bg-amber-50/50";
  return "border-[var(--border)] bg-white";
}

export function SalesHomeHighlightLink({
  area,
  title,
  count,
  hint,
  href,
  tone,
  badge,
}: {
  area: string;
  title: string;
  count: number;
  hint: string;
  href: string;
  tone: "default" | "warn" | "danger";
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex h-full min-h-[5rem] min-w-0 flex-col rounded-2xl border p-3 hover:border-teal-300 sm:p-4",
        highlightToneClass(tone),
      )}
    >
      {badge ?
        <span className="absolute right-3 top-3 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-medium text-white">
          {badge}
        </span>
      : null}
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {area}
      </p>
      <p className={cn("mt-1 text-sm font-medium text-foreground", badge && "pr-24")}>
        {title}
      </p>
      <p className="mt-1 text-2xl font-medium tabular-nums text-foreground">
        {count.toLocaleString()}
      </p>
      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{hint}</p>
    </Link>
  );
}
