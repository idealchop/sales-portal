"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { LeadActionsMenu } from "@/features/lead-pipeline/components/lead-actions-menu";
import {
  attemptSeverity,
  attemptSeverityClassName,
  displayAttemptCount,
  formatLeadDate,
  formatOnboardedJourneyChip,
  leadContactStatus,
  leadQueueBucket,
  onboardedMonitorFlagLabel,
  onboardedMonitorFlagToneClass,
  platformSourceLabel,
  platformSourceToneClass,
  resolveLeadLastSignIn,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { compareOnboardedLeadsDefault } from "@/features/lead-pipeline/lib/lead-pipeline-list";
import { formatAssigneeLabels } from "@/features/lead-pipeline/lib/lead-assignees";
import { useLeadAssignees } from "@/hooks/use-lead-assignees";
import type { Lead, LeadPlatformSource, LeadQueue } from "@/lib/definitions";
import { cn } from "@/lib/utils";

const BOARD_COLUMNS: Array<{
  id: Exclude<LeadQueue, "all" | "content">;
  label: string;
  accent: string;
}> = [
  {
    id: "warm",
    label: "Warm",
    accent: "border-t-teal-500",
  },
  {
    id: "cold",
    label: "Cold",
    accent: "border-t-sky-500",
  },
  {
    id: "onboarded",
    label: "Onboarded",
    accent: "border-t-emerald-500",
  },
  {
    id: "archive",
    label: "Archives",
    accent: "border-t-zinc-400",
  },
];

function BoardCard({
  lead,
  assigneeName,
  onViewDetails,
  onUpdateDetails,
  onUpdateStatus,
  onViewHistory,
  onFollowUpEmail,
}: {
  lead: Lead;
  assigneeName: string;
  onViewDetails: (lead: Lead) => void;
  onUpdateDetails: (lead: Lead) => void;
  onUpdateStatus: (lead: Lead) => void;
  onViewHistory: (lead: Lead) => void;
  onFollowUpEmail: (lead: Lead) => void;
}) {
  const attempts = displayAttemptCount(lead);
  const severity = attemptSeverity(attempts.count, attempts.track);
  const status = leadContactStatus(lead);
  const platform = lead.platformSource as LeadPlatformSource | undefined;
  const platformLine = platformSourceLabel(platform);
  const followUp = formatLeadDate(lead.nextFollowUpAt);
  const overdue =
    lead.nextFollowUpAt &&
    !Number.isNaN(new Date(lead.nextFollowUpAt).getTime()) &&
    new Date(lead.nextFollowUpAt).getTime() < Date.now() &&
    leadQueueBucket(lead.stage) !== "archive";
  const isOnboarded = leadQueueBucket(lead.stage) === "onboarded";
  const journeyChip = formatOnboardedJourneyChip(lead.onboardedMonitor);
  const monitorFlags = lead.onboardedMonitor?.flags ?? [];
  const lastSignIn = isOnboarded ? resolveLeadLastSignIn(lead) : null;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onViewDetails(lead)}
        >
          <p className="truncate font-semibold text-zinc-900">
            {lead.businessName || "Untitled"}
          </p>
          <p className="mt-0.5 truncate text-sm text-zinc-600">
            {lead.ownerName || "—"}
          </p>
        </button>
        <LeadActionsMenu
          onViewDetails={() => onViewDetails(lead)}
          onUpdateDetails={() => onUpdateDetails(lead)}
          onUpdateStatus={() => onUpdateStatus(lead)}
          onViewHistory={() => onViewHistory(lead)}
          onFollowUpEmail={() => onFollowUpEmail(lead)}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {status && status !== "—" ?
          <Badge className="max-w-full truncate bg-teal-50 text-[10px] text-teal-900">
            {status}
          </Badge>
        : null}
        {platformLine !== "—" ?
          <span
            className={cn(
              "text-[10px] font-semibold",
              platformSourceToneClass(platform),
            )}
          >
            {platformLine}
          </span>
        : null}
        {journeyChip ?
          <Badge className="max-w-full truncate bg-emerald-50 text-[10px] font-medium text-emerald-900">
            {journeyChip}
          </Badge>
        : null}
        {monitorFlags.map((flag) => (
          <Badge
            key={flag}
            className={cn(
              "max-w-full truncate text-[10px] font-medium",
              onboardedMonitorFlagToneClass(flag),
            )}
          >
            {onboardedMonitorFlagLabel(flag)}
          </Badge>
        ))}
      </div>

      <div className="mt-2 space-y-1 text-[11px] text-zinc-500">
        <p className="truncate">Assignee · {assigneeName}</p>
        {lastSignIn ?
          <p
            className={cn(
              lastSignIn === "Never" && "font-medium text-amber-800",
            )}
          >
            Last sign-in · {lastSignIn}
          </p>
        : null}
        {!isOnboarded ?
          <p>
            Attempts ·{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                attemptSeverityClassName(severity),
              )}
            >
              {attempts.count}/{attempts.threshold} {attempts.track}
            </span>
          </p>
        : null}
        {followUp ?
          <p className={cn(overdue && "font-medium text-red-700")}>
            Follow-up · {followUp}
            {overdue ? " · overdue" : ""}
          </p>
        : <p>Follow-up · not set</p>}
      </div>
    </article>
  );
}

export function LeadPipelineBoard({
  leads,
  onViewDetails,
  onUpdateDetails,
  onUpdateStatus,
  onViewHistory,
  onFollowUpEmail,
}: {
  leads: Lead[];
  onViewDetails: (lead: Lead) => void;
  onUpdateDetails: (lead: Lead) => void;
  onUpdateStatus: (lead: Lead) => void;
  onViewHistory: (lead: Lead) => void;
  onFollowUpEmail: (lead: Lead) => void;
}) {
  const { members } = useLeadAssignees();
  const assigneeNameByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      map.set(member.id, member.displayName || member.email || member.id);
    }
    return map;
  }, [members]);

  const columns = useMemo(() => {
    const grouped: Record<Exclude<LeadQueue, "all" | "content">, Lead[]> = {
      warm: [],
      cold: [],
      onboarded: [],
      archive: [],
    };
    for (const lead of leads) {
      grouped[leadQueueBucket(lead.stage)].push(lead);
    }
    for (const key of Object.keys(grouped) as Array<
      Exclude<LeadQueue, "all" | "content">
    >) {
      if (key === "onboarded") {
        grouped[key].sort(compareOnboardedLeadsDefault);
        continue;
      }
      grouped[key].sort((a, b) => {
        const aFollow = a.nextFollowUpAt ?
          new Date(a.nextFollowUpAt).getTime()
        : Number.POSITIVE_INFINITY;
        const bFollow = b.nextFollowUpAt ?
          new Date(b.nextFollowUpAt).getTime()
        : Number.POSITIVE_INFINITY;
        if (aFollow !== bFollow) return aFollow - bFollow;
        return (a.businessName || "").localeCompare(b.businessName || "");
      });
    }
    return grouped;
  }, [leads]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {BOARD_COLUMNS.map((column) => {
        const items = columns[column.id];
        return (
          <section
            key={column.id}
            className={cn(
              "flex min-h-[28rem] flex-col rounded-xl border border-zinc-200 border-t-4 bg-zinc-50/70",
              column.accent,
            )}
          >
            <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2.5">
              <h2 className="text-sm font-semibold text-zinc-900">
                {column.label}
              </h2>
              <Badge className="min-w-5 justify-center bg-white px-1.5 text-[10px] text-zinc-700">
                {items.length}
              </Badge>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {items.length === 0 ?
                <p className="px-2 py-8 text-center text-xs text-zinc-400">
                  No leads assigned to you in {column.label.toLowerCase()}
                </p>
              : items.map((lead) => (
                  <BoardCard
                    key={lead.id}
                    lead={lead}
                    assigneeName={formatAssigneeLabels(
                      lead,
                      assigneeNameByUid,
                    )}
                    onViewDetails={onViewDetails}
                    onUpdateDetails={onUpdateDetails}
                    onUpdateStatus={onUpdateStatus}
                    onViewHistory={onViewHistory}
                    onFollowUpEmail={onFollowUpEmail}
                  />
                ))
              }
            </div>
          </section>
        );
      })}
    </div>
  );
}
