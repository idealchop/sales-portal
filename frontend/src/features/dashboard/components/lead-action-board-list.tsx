"use client";

import Link from "next/link";
import { ArrowRight, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  LeadActionItem,
  LeadActionKind,
  LeadActionPriority,
} from "@/features/dashboard/lib/build-lead-action-board";

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
  overdue_follow_up: "Overdue",
  recommend_move_to_cold: "Move to cold?",
  subscription_grace_period: "In grace period",
  subscription_expiring_soon: "Expires ≤7 days",
  journey_inactive_day8: "Day 8 inactive",
  due_soon: "Due soon",
  never_contacted: "Never contacted",
  subscription_renew: "Plan renewed",
  subscription_change: "Plan changed",
  no_follow_up: "No follow-up",
  active: "Active",
};

export function LeadActionBoardList({
  items,
  emptyMessage = "You're clear — no assigned lead actions right now.",
}: {
  items: LeadActionItem[];
  emptyMessage?: string;
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
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{item.title}</p>
              <Badge className={PRIORITY_STYLES[item.priority]}>
                {item.priority}
              </Badge>
              <Badge className={KIND_STYLES[item.kind]}>
                {KIND_LABELS[item.kind]}
              </Badge>
              <Badge className="bg-zinc-100 text-zinc-600">
                {item.queueLabel}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{item.subtitle}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                href={item.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
              >
                Open lead pipeline
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <ListTodo className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
        </div>
      ))}
    </div>
  );
}
