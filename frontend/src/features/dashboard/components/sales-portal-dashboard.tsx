"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  UserRound,
  UserX,
} from "lucide-react";
import {
  ActionFollowUpCalendar,
  followUpDayKey,
  followUpTimeLabel,
  type CalendarFollowUpEvent,
} from "@/features/dashboard/components/action-follow-up-calendar";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import { LeadActionBoardList } from "@/features/dashboard/components/lead-action-board-list";
import { buildLeadActionBoard } from "@/features/dashboard/lib/build-lead-action-board";
import { useAuthUid } from "@/hooks/use-auth-uid";
import { useLeads } from "@/hooks/use-leads";
import { cn } from "@/lib/utils";

function FocusTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "default" | "warn" | "danger" | "ok";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "danger" && "border-red-200 bg-red-50/60",
        tone === "warn" && "border-amber-200 bg-amber-50/60",
        tone === "ok" && "border-teal-200 bg-teal-50/50",
        tone === "default" && "border-[var(--border)] bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {hint ?
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
          : null}
        </div>
        <div
          className={cn(
            "rounded-lg p-2 shadow-sm",
            tone === "danger" && "bg-white text-red-700",
            tone === "warn" && "bg-white text-amber-700",
            tone === "ok" && "bg-white text-teal-700",
            tone === "default" && "bg-teal-50 text-teal-700",
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function SalesPortalDashboard() {
  const { uid, authReady } = useAuthUid();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const {
    leads,
    isLoading: leadsLoading,
    error: leadsError,
  } = useLeads({
    queue: "all",
    assignee: uid || undefined,
    enabled: Boolean(uid),
  });

  const board = useMemo(
    () => buildLeadActionBoard(uid ? leads : []),
    [leads, uid],
  );

  const calendarEvents = useMemo(() => {
    const events: CalendarFollowUpEvent[] = [];
    for (const lead of leads) {
      const dayKey = followUpDayKey(lead.nextFollowUpAt);
      if (!dayKey) continue;
      events.push({
        id: lead.id,
        dayKey,
        title: lead.businessName || lead.ownerName || "Untitled lead",
        timeLabel: followUpTimeLabel(lead.nextFollowUpAt),
        subtitle: lead.warmStatus?.trim() || lead.ownerName || undefined,
      });
    }
    return events;
  }, [leads]);

  const filteredItems = useMemo(() => {
    if (!selectedDay) return board.items;
    return board.items.filter(
      (item) => followUpDayKey(item.nextFollowUpAt) === selectedDay,
    );
  }, [board.items, selectedDay]);

  const selectedLabel =
    selectedDay ?
      new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-base font-semibold text-foreground">
            Action board
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Leads assigned to you, prioritized by follow-up urgency.
          </p>
        </div>
        <Link
          href="/lead-pipeline"
          className="text-xs font-medium text-teal-700 hover:underline"
        >
          Open lead pipeline →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FocusTile
          label="Overdue follow-ups"
          value={board.summary.overdue.toLocaleString()}
          hint="Past next follow-up date"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={board.summary.overdue > 0 ? "danger" : "ok"}
        />
        <FocusTile
          label="Due in 7 days"
          value={board.summary.dueSoon.toLocaleString()}
          hint="Scheduled follow-ups coming up"
          icon={<Clock3 className="h-4 w-4" />}
          tone={board.summary.dueSoon > 0 ? "warn" : "default"}
        />
        <FocusTile
          label="Never contacted"
          value={board.summary.neverContacted.toLocaleString()}
          hint="Assigned with no contact yet"
          icon={<UserX className="h-4 w-4" />}
          tone={board.summary.neverContacted > 0 ? "warn" : "default"}
        />
        <FocusTile
          label="Assigned to me"
          value={board.summary.assigned.toLocaleString()}
          hint={`${board.items.length} action${board.items.length === 1 ? "" : "s"} queued`}
          icon={<UserRound className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ActionFollowUpCalendar
          events={calendarEvents}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        <DashboardSection
          id="sales-action-board"
          title="My actions"
          description={
            selectedLabel ?
              `Follow-ups on ${selectedLabel}.`
            : "Assigned leads that need a follow-up, contact, or next step."
          }
          count={filteredItems.length}
          action={
            <Link
              href="/lead-pipeline"
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Manage in pipeline →
            </Link>
          }
          className="min-h-[28rem]"
        >
          {!authReady || (uid && leadsLoading) ?
            <div className="flex h-40 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-600">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              Loading your assigned leads…
            </div>
          : leadsError ?
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {leadsError}
            </p>
          : !uid ?
            <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-8 text-center text-sm text-zinc-500">
              Sign in to see leads assigned to you.
            </p>
          : <div className="max-h-[34rem] overflow-y-auto pr-1">
              <LeadActionBoardList
                items={filteredItems}
                emptyMessage={
                  selectedDay ?
                    "No assigned follow-ups on this day."
                  : "You're clear — no assigned lead actions right now."
                }
              />
            </div>
          }
        </DashboardSection>
      </div>
    </div>
  );
}
