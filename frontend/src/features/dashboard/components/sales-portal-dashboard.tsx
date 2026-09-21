"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ActionFollowUpCalendar,
  followUpDayKey,
  followUpTimeLabel,
  type CalendarFollowUpEvent,
} from "@/features/dashboard/components/action-follow-up-calendar";
import { useOptionalDashboardAnalyticsContext } from "@/features/dashboard/components/dashboard-analytics-context";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  LeadActionBoardList,
  SalesHomeHighlightLink,
} from "@/features/dashboard/components/lead-action-board-list";
import { SalesHomeFocusPanel } from "@/features/dashboard/components/sales-home-focus-panel";
import { SalesHomeRouteShortcuts } from "@/features/dashboard/components/sales-home-route-shortcuts";
import { LeadFollowUpComposeDialog } from "@/features/lead-pipeline/components/lead-follow-up-compose-dialog";
import {
  buildLeadActionBoard,
  leadActionMatchesDay,
  localDayKey,
  type LeadActionItem,
} from "@/features/dashboard/lib/build-lead-action-board";
import { buildSalesHomeFocus } from "@/features/dashboard/lib/build-sales-home-focus";
import {
  buildSalesHomeHighlights,
  buildSalesHomeNewUserBadges,
  buildSalesHomeRouteShortcuts,
} from "@/features/dashboard/lib/build-sales-home-highlights";
import { buildUserSubscriptionsList } from "@/features/dashboard/lib/build-user-subscriptions-list";
import { ownersForUserSubscriptions } from "@/lib/dashboard/analytics";
import { useAuthUid } from "@/hooks/use-auth-uid";
import { useLeads } from "@/hooks/use-leads";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { leadHasAssignee } from "@/features/lead-pipeline/lib/lead-assignees";
import type { Lead } from "@/lib/definitions";

function plusDaysAtNine(days: number): string {
  const next = new Date();
  next.setDate(next.getDate() + days);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}

export function SalesPortalDashboard() {
  const { uid, authReady } = useAuthUid();
  const { profile } = useSalesProfile();
  const analyticsCtx = useOptionalDashboardAnalyticsContext();
  const todayKey = localDayKey();
  const [selectedDay, setSelectedDay] = useState<string | null>(todayKey);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const {
    leads,
    analytics,
    isLoading: leadsLoading,
    error: leadsError,
    saveLead,
  } = useLeads({
    queue: "all",
    enabled: authReady,
  });

  const assignedLeads = useMemo(
    () => (uid ? leads.filter((lead) => leadHasAssignee(lead, uid)) : []),
    [leads, uid],
  );
  const assignedById = useMemo(
    () => new Map(assignedLeads.map((lead) => [lead.id, lead])),
    [assignedLeads],
  );
  const leadsById = useMemo(
    () => new Map(leads.map((lead) => [lead.id, lead])),
    [leads],
  );

  const board = useMemo(
    () => buildLeadActionBoard(assignedLeads),
    [assignedLeads],
  );

  const subscriptions = useMemo(() => {
    const metrics = analyticsCtx?.data?.growthSalesMetrics;
    if (!metrics) return [];
    return buildUserSubscriptionsList(ownersForUserSubscriptions(metrics));
  }, [analyticsCtx?.data?.growthSalesMetrics]);

  const focus = useMemo(
    () =>
      buildSalesHomeFocus(leads, analytics, {
        uid: uid || undefined,
        subscriptions,
      }),
    [analytics, leads, subscriptions, uid],
  );

  const highlights = useMemo(
    () =>
      buildSalesHomeHighlights(
        analyticsCtx?.data ?? null,
        profile?.role ?? null,
      ),
    [analyticsCtx?.data, profile?.role],
  );

  const shortcuts = useMemo(
    () =>
      buildSalesHomeRouteShortcuts(
        analyticsCtx?.data ?? null,
        profile?.role ?? null,
        { voucherProspects: focus.voucherProspects },
      ),
    [analyticsCtx?.data, focus.voucherProspects, profile?.role],
  );

  const newUserBadges = useMemo(
    () =>
      buildSalesHomeNewUserBadges(
        analyticsCtx?.data ?? null,
        profile?.role ?? null,
      ),
    [analyticsCtx?.data, profile?.role],
  );

  const calendarEvents = useMemo(() => {
    const events: CalendarFollowUpEvent[] = [];
    const actionable = new Set(board.items.map((item) => item.leadId));
    const seen = new Set<string>();
    for (const lead of assignedLeads) {
      const dated = followUpDayKey(lead.nextFollowUpAt);
      if (!dated && !actionable.has(lead.id)) continue;
      const dayKey = dated || todayKey;
      const eventId = `${lead.id}:${dayKey}`;
      if (seen.has(eventId)) continue;
      seen.add(eventId);
      events.push({
        id: eventId,
        dayKey,
        title: lead.businessName || lead.ownerName || "Untitled lead",
        timeLabel:
          dated ? followUpTimeLabel(lead.nextFollowUpAt) : "Do today",
        subtitle: lead.warmStatus?.trim() || lead.ownerName || undefined,
      });
    }
    return events;
  }, [assignedLeads, board.items, todayKey]);

  const filteredItems = useMemo(
    () =>
      board.items.filter((item) =>
        leadActionMatchesDay(item, selectedDay, todayKey),
      ),
    [board.items, selectedDay, todayKey],
  );

  const selectedLabel =
    selectedDay ?
      new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  const loading = !authReady || leadsLoading;
  const canOpenStation = profile?.role === "admin";

  async function patchFollowUp(
    item: LeadActionItem,
    patch: Partial<Lead>,
  ) {
    setBusyLeadId(item.leadId);
    try {
      await saveLead(patch, item.leadId);
    } finally {
      setBusyLeadId(null);
    }
  }

  function openEmailForRow(leadId?: string) {
    if (!leadId) return;
    const lead = leadsById.get(leadId);
    if (lead) setFollowUpLead(lead);
  }

  const loadingBlock = (
    <div className="flex h-40 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-600">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      Loading today’s work…
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {leadsError ?
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {leadsError}
        </p>
      : null}

      <DashboardSection
        id="sales-jump"
        title="Jump to a list"
        description="Subscriptions, SmartRefill, and Admin — with a badge when someone new joined an app."
      >
        <SalesHomeRouteShortcuts
          items={shortcuts}
          newUserBadges={newUserBadges}
        />
      </DashboardSection>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-base font-medium text-foreground">
            Your work today
          </h1>
          <p className="max-w-2xl text-xs text-[var(--muted-foreground)]">
            Email, call, or set the next check-in from the list on the right.
          </p>
          <p className="text-xs text-zinc-500">
            {board.summary.neverContacted} say hello · {board.summary.overdue}{" "}
            overdue · {focus.mayLeave} may leave across the pipeline
          </p>
        </div>
        <Link
          href="/lead-pipeline"
          className="text-xs font-medium text-teal-700 hover:underline"
        >
          Open lead pipeline →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ActionFollowUpCalendar
          events={calendarEvents}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        <DashboardSection
          id="sales-action-board"
          title="Your follow-ups"
          description={
            selectedDay === todayKey ?
              "Overdue, undated, and anything due today — this is the first thing to clear."
            : selectedLabel ?
              `Check-ins on ${selectedLabel}.`
            : "Leads assigned to you that need a next step."
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
          {loading ?
            loadingBlock
          : !uid ?
            <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-8 text-center text-sm text-zinc-500">
              Sign in to see leads assigned to you.
            </p>
          : <div className="max-h-[34rem] overflow-y-auto pr-1">
              <LeadActionBoardList
                items={filteredItems}
                busyLeadId={busyLeadId}
                canOpenStation={canOpenStation}
                onEmail={(item) => {
                  const lead = assignedById.get(item.leadId);
                  if (lead) setFollowUpLead(lead);
                }}
                onRemindTomorrow={(item) =>
                  void patchFollowUp(item, {
                    nextFollowUpAt: plusDaysAtNine(1),
                  })
                }
                onLoggedCheckIn={(item) => {
                  const lead = assignedById.get(item.leadId);
                  const nowIso = new Date().toISOString();
                  void patchFollowUp(item, {
                    lastContactAt: nowIso,
                    firstContactAt: lead?.firstContactAt || nowIso,
                    nextFollowUpAt: plusDaysAtNine(1),
                  });
                }}
                emptyMessage={
                  selectedDay === todayKey ?
                    "Nothing assigned for today. Check Win more and Keep them below, or pick another day."
                  : "No assigned follow-ups on this day."
                }
              />
            </div>
          }
        </DashboardSection>
      </div>

      {highlights.length > 0 ?
        <DashboardSection
          id="sales-watch"
          title="Also watch"
          description="Five signals from Subscriptions, SmartRefill, and Admin — one row, counts only."
          count={highlights.length}
        >
          <div className="flex flex-nowrap gap-3 overflow-x-auto pb-1">
            {highlights.map((row) => (
              <div key={row.id} className="min-w-[10.5rem] flex-1">
                <SalesHomeHighlightLink {...row} />
              </div>
            ))}
          </div>
        </DashboardSection>
      : null}

      <div className="space-y-6">
        {loading ?
          <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
            Loading stations to win and keep…
          </p>
        : <>
            <SalesHomeFocusPanel
              id="sales-win"
              title="Win more"
              description="Chart is the picture. Expand to see each station’s now, should be, and chance they onboard."
              rows={focus.toWin}
              emptyMessage="No close-now prospects. Check the pipeline for new inquiries."
              busyId={busyLeadId}
              onEmail={(row) => openEmailForRow(row.leadId)}
              action={
                <span className="flex flex-wrap gap-3">
                  <Link
                    href="/subscriptions/vouchers-affiliates"
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Vouchers →
                  </Link>
                  <Link
                    href="/lead-pipeline"
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Pipeline →
                  </Link>
                </span>
              }
            />
            <SalesHomeFocusPanel
              id="sales-keep"
              title="Keep them"
              description="Chart is the picture. Expand to see each station’s now, should be, and chance they come back or continue."
              rows={focus.toKeep}
              emptyMessage="Nobody looks at risk right now. Keep the weekly check-ins going."
              busyId={busyLeadId}
              onEmail={(row) => openEmailForRow(row.leadId)}
              action={
                <span className="flex flex-wrap gap-3">
                  <Link
                    href="/subscriptions/trial"
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Trials →
                  </Link>
                  <Link
                    href="/webapp/smartrefill"
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    SmartRefill →
                  </Link>
                </span>
              }
            />
          </>
        }
      </div>

      <LeadFollowUpComposeDialog
        open={Boolean(followUpLead)}
        lead={followUpLead}
        onClose={() => setFollowUpLead(null)}
        onSave={async (input, leadId) => {
          await saveLead(input, leadId);
        }}
      />
    </div>
  );
}
