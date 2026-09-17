"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ListPagination } from "@/components/list-pagination";
import { usePagination } from "@/hooks/use-pagination";
import type { Lead, LeadPlatformSource, LeadQueue } from "@/lib/definitions";
import {
  formatAccountReadyLine,
  formatCustomerCount,
  formatLeadChannels,
  formatLeadDate,
  formatLeadSourceLine,
  formatOnboardedJourneyChip,
  demoStatusLabel,
  demoStatusToneClass,
  displayAttemptCount,
  attemptSeverity,
  attemptSeverityClassName,
  inputClassName,
  leadContactStatus,
  leadLatestNote,
  leadQueueBucket,
  onboardedMonitorFlagLabel,
  onboardedMonitorFlagToneClass,
  platformMembershipLabel,
  platformSourceLabel,
  platformSourceToneClass,
  resolveLeadLastSignIn,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import {
  DEFAULT_LEAD_LIST_FILTERS,
  prepareLeadListRows,
  type LeadListFilters,
  type LeadPageSize,
  type LeadSortDir,
  type LeadSortKey,
} from "@/features/lead-pipeline/lib/lead-pipeline-list";
import { useLeadAssignees } from "@/hooks/use-lead-assignees";
import { LeadActionsMenu } from "@/features/lead-pipeline/components/lead-actions-menu";
import { LeadPipelineFilters } from "@/features/lead-pipeline/components/lead-pipeline-filters";
import { cn } from "@/lib/utils";

function LeadProfileCell({ lead }: { lead: Lead }) {
  const customers = formatCustomerCount(lead.customerCount);
  const demo = demoStatusLabel(lead.attendedDemo);
  const ready = Boolean(lead.accountReady ?? lead.workspace?.accountReady);
  const accountLine = formatAccountReadyLine(lead);
  const sourceLine = formatLeadSourceLine(lead);
  const trialLeft = lead.workspace?.trialDaysLeft;
  const platform = lead.platformSource as LeadPlatformSource | undefined;
  const membership = platformMembershipLabel(lead.platformRole);
  const platformLine = platformSourceLabel(platform);
  const contactBits = [lead.email, lead.phone].filter(Boolean);
  const journeyChip = formatOnboardedJourneyChip(lead.onboardedMonitor);
  const monitorFlags = lead.onboardedMonitor?.flags ?? [];
  const isOnboarded = leadQueueBucket(lead.stage) === "onboarded";
  const lastSignIn = isOnboarded ? resolveLeadLastSignIn(lead) : null;

  return (
    <div className="min-w-[280px] max-w-[420px]">
      <div className="font-semibold tracking-tight text-zinc-900">
        {lead.businessName}
      </div>
      <div className="mt-0.5 text-sm text-zinc-700">
        {lead.ownerName || "—"}
      </div>
      {contactBits.length ?
        <div className="mt-0.5 text-xs text-zinc-500">
          {contactBits.join(" · ")}
        </div>
      : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        {platformLine !== "—" ?
          <span
            className={cn(
              "font-semibold tracking-tight",
              platformSourceToneClass(platform),
            )}
          >
            {platformLine}
            {membership ? ` · ${membership}` : ""}
          </span>
        : null}
        {customers ?
          <span className="font-medium tabular-nums text-teal-800">
            {customers}
          </span>
        : null}
        {journeyChip ?
          <span className="font-medium text-emerald-800">{journeyChip}</span>
        : null}
        {monitorFlags.map((flag) => (
          <span
            key={flag}
            className={cn(
              "rounded px-1.5 py-0.5 font-medium",
              onboardedMonitorFlagToneClass(flag),
            )}
          >
            {onboardedMonitorFlagLabel(flag)}
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-600">
        {lastSignIn ?
          <>
            <span>
              <span className="text-zinc-400">Last sign-in</span>{" "}
              <span
                className={cn(
                  "font-medium",
                  lastSignIn === "Never" ? "text-amber-800" : "text-zinc-800",
                )}
              >
                {lastSignIn}
              </span>
            </span>
            <span className="text-zinc-300" aria-hidden>
              ·
            </span>
          </>
        : null}
        <span>
          <span className="text-zinc-400">Demo</span>{" "}
          <span
            className={cn("font-medium", demoStatusToneClass(lead.attendedDemo))}
          >
            {demo}
          </span>
        </span>
        <span className="text-zinc-300" aria-hidden>
          ·
        </span>
        <span>
          <span className="text-zinc-400">Account</span>{" "}
          <span
            className={cn(
              "font-medium",
              ready ? "text-emerald-800" : "text-zinc-700",
            )}
          >
            {accountLine}
            {ready && typeof trialLeft === "number" ?
              <span
                className={cn(
                  "ml-1 font-normal tabular-nums",
                  trialLeft === 0 ? "text-red-600" : "text-zinc-500",
                )}
              >
                ({trialLeft}d)
              </span>
            : null}
          </span>
        </span>
        <span className="text-zinc-300" aria-hidden>
          ·
        </span>
        <span>
          <span className="text-zinc-400">Source</span>{" "}
          <span className="font-medium text-zinc-800">{sourceLine}</span>
        </span>
      </div>
    </div>
  );
}

function LeadContactCell({
  lead,
  contactedByLabel,
}: {
  lead: Lead;
  contactedByLabel: string;
}) {
  const status = leadContactStatus(lead);
  const note = leadLatestNote(lead);
  const channels = formatLeadChannels(lead.channels);
  const contacted = formatLeadDate(lead.lastContactAt);
  const attemptDisplay = displayAttemptCount(lead);
  const severity = attemptSeverity(attemptDisplay.count, attemptDisplay.track);
  const hasContact =
    status !== "—" ||
    note !== "—" ||
    channels !== "—" ||
    contacted !== "—" ||
    Boolean(lead.lastContactedByUid) ||
    attemptDisplay.count > 0;

  if (!hasContact) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <div className="min-w-[200px] max-w-[280px] space-y-1">
      <div className="text-sm font-medium text-zinc-900">{status}</div>
      <div className="text-xs text-zinc-500">
        {contacted}
        {channels !== "—" ? ` · ${channels}` : ""}
      </div>
      <div
        className={cn(
          "text-xs tabular-nums",
          attemptSeverityClassName(severity),
        )}
      >
        {attemptDisplay.count}/{attemptDisplay.threshold}{" "}
        {attemptDisplay.track} attempt
        {attemptDisplay.count === 1 ? "" : "s"}
      </div>
      {lead.lastContactedByUid ?
        <div className="text-xs text-zinc-600">By {contactedByLabel}</div>
      : null}
      {note !== "—" ?
        <div className="line-clamp-2 text-xs text-zinc-600">{note}</div>
      : null}
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  activeDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: LeadSortKey;
  activeKey: LeadSortKey;
  activeDir: LeadSortDir;
  onSort: (key: LeadSortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <th className={cn("px-3 py-2.5", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition",
          active ? "text-teal-800" : "hover:text-zinc-800",
        )}
      >
        {label}
        {active ?
          activeDir === "asc" ?
            <ArrowUp className="h-3 w-3" />
          : <ArrowDown className="h-3 w-3" />
        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}

export function LeadPipelineTable({
  leads,
  queue = "warm",
  onViewDetails,
  onUpdateDetails,
  onUpdateStatus,
  onViewHistory,
  onFollowUpEmail,
  onAssign,
}: {
  leads: Lead[];
  queue?: LeadQueue;
  onViewDetails: (lead: Lead) => void;
  onUpdateDetails: (lead: Lead) => void;
  onUpdateStatus: (lead: Lead) => void;
  onViewHistory: (lead: Lead) => void;
  onFollowUpEmail: (lead: Lead) => void;
  onAssign: (lead: Lead, assignedToUid: string) => Promise<void>;
}) {
  const { members } = useLeadAssignees();
  const [filters, setFilters] = useState<LeadListFilters>(
    DEFAULT_LEAD_LIST_FILTERS,
  );
  const [sortKey, setSortKey] = useState<LeadSortKey>(() =>
    queue === "warm" ? "warmDefault"
    : queue === "onboarded" ? "onboardedDefault"
    : "createdAt",
  );
  const [sortDir, setSortDir] = useState<LeadSortDir>("desc");
  const [pageSize, setPageSize] = useState<LeadPageSize>(25);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    setSortKey(
      queue === "warm" ? "warmDefault"
      : queue === "onboarded" ? "onboardedDefault"
      : "createdAt",
    );
    setSortDir("desc");
  }, [queue]);

  const assigneeNameByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      map.set(member.id, member.displayName || member.email || member.id);
    }
    return map;
  }, [members]);

  const prepared = useMemo(
    () => prepareLeadListRows(leads, filters, sortKey, sortDir),
    [leads, filters, sortKey, sortDir],
  );

  const resetKey = `${JSON.stringify(filters)}:${sortKey}:${sortDir}:${pageSize}`;
  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
    totalItems,
    hasPagination,
  } = usePagination(prepared, pageSize, resetKey);

  function handleSort(key: LeadSortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "businessName" || key === "ownerName" ? "asc" : "desc");
  }

  function updateFilter<K extends keyof LeadListFilters>(
    key: K,
    value: LeadListFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAssign(lead: Lead, assignedToUid: string) {
    setAssigningId(lead.id);
    try {
      await onAssign(lead, assignedToUid);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="space-y-3">
      <LeadPipelineFilters
        filters={filters}
        onChange={updateFilter}
        onReset={() => setFilters(DEFAULT_LEAD_LIST_FILTERS)}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        members={members}
        queue={queue}
      />

      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <p>
          Showing {paginatedItems.length} of {totalItems}
          {totalItems !== leads.length ? ` (filtered from ${leads.length})` : ""}
        </p>
      </div>

      {prepared.length === 0 ?
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-16 text-center text-sm text-zinc-500">
          {leads.length === 0 ?
            queue === "content" ?
              "No webinar, training, article, or story emails yet. Use Gather new leads to import them."
            : "No leads in this queue yet."
          : "No leads match the current filters."}
        </div>
      : <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-[820px] w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <SortHeader
                  label="Lead"
                  sortKey="businessName"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Assigned"
                  sortKey="assignedToUid"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Contact"
                  sortKey="lastContactAt"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((lead) => {
                const contactedByLabel =
                  lead.lastContactedByUid ?
                    assigneeNameByUid.get(lead.lastContactedByUid) ||
                    lead.lastContactedByUid
                  : "—";
                return (
                  <tr
                    key={lead.id}
                    className="cursor-pointer border-t border-zinc-100 hover:bg-teal-50/30"
                    onClick={() => onViewDetails(lead)}
                  >
                    <td className="px-3 py-3 align-top">
                      <LeadProfileCell lead={lead} />
                    </td>
                    <td
                      className="px-3 py-3 align-top"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <select
                        className={cn(inputClassName, "min-w-[150px] py-1.5")}
                        value={lead.assignedToUid || ""}
                        disabled={assigningId === lead.id}
                        onChange={(event) => {
                          void handleAssign(lead, event.target.value);
                        }}
                        aria-label={`Assign ${lead.businessName}`}
                      >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.displayName || member.email || member.id}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <LeadContactCell
                        lead={lead}
                        contactedByLabel={contactedByLabel}
                      />
                    </td>
                    <td
                      className="px-3 py-3 align-top text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <LeadActionsMenu
                        onViewDetails={() => onViewDetails(lead)}
                        onUpdateDetails={() => onUpdateDetails(lead)}
                        onUpdateStatus={() => onUpdateStatus(lead)}
                        onViewHistory={() => onViewHistory(lead)}
                        onFollowUpEmail={() => onFollowUpEmail(lead)}
                      />                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      }

      {hasPagination ?
        <ListPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      : null}
    </div>
  );
}
