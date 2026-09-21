"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Mail, Tag } from "lucide-react";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
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
import { LeadAssigneeMultiSelect } from "@/features/lead-pipeline/components/lead-assignee-multi-select";
import { LeadEmailBlastComposeDialog } from "@/features/lead-pipeline/components/lead-email-blast-compose-dialog";
import { LeadPromoteOfferDialog } from "@/features/lead-pipeline/components/lead-promote-offer-dialog";
import { LeadPipelineFilters } from "@/features/lead-pipeline/components/lead-pipeline-filters";
import type { PromoteEmailDraft } from "@/features/lead-pipeline/lib/lead-promote-offer";
import type { BulkAssignMode } from "@/lib/sales/api";
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
  onBulkAssign,
  onLeadsChanged,
}: {
  leads: Lead[];
  queue?: LeadQueue;
  onViewDetails: (lead: Lead) => void;
  onUpdateDetails: (lead: Lead) => void;
  onUpdateStatus: (lead: Lead) => void;
  onViewHistory: (lead: Lead) => void;
  onFollowUpEmail: (lead: Lead) => void;
  onAssign: (lead: Lead, assignedToUids: string[]) => Promise<void>;
  onBulkAssign: (
    leadIds: string[],
    mode: BulkAssignMode,
    assignedToUids?: string[],
  ) => Promise<void>;
  /** Refresh list after blast when attempts were logged. */
  onLeadsChanged?: () => void;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [massAssigneeIds, setMassAssigneeIds] = useState<string[]>([]);
  const [massBusy, setMassBusy] = useState(false);
  const [massError, setMassError] = useState<string | null>(null);
  const [blastOpen, setBlastOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [blastDraft, setBlastDraft] = useState<PromoteEmailDraft | null>(null);

  useEffect(() => {
    setSortKey(
      queue === "warm" ? "warmDefault"
      : queue === "onboarded" ? "onboardedDefault"
      : "createdAt",
    );
    setSortDir("desc");
  }, [queue]);

  useEffect(() => {
    setSelectedIds(new Set());
    setMassError(null);
  }, [filters, queue]);

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

  const pageIds = useMemo(
    () => paginatedItems.map((lead) => lead.id),
    [paginatedItems],
  );
  const filteredIds = useMemo(
    () => prepared.map((lead) => lead.id),
    [prepared],
  );
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id));
  const allPageSelected =
    pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const somePageSelected =
    selectedOnPage.length > 0 && selectedOnPage.length < pageIds.length;

  const selectedLeads = useMemo(
    () => prepared.filter((lead) => selectedIds.has(lead.id)),
    [prepared, selectedIds],
  );

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

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filteredIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setMassAssigneeIds([]);
    setMassError(null);
  }

  async function handleAssign(lead: Lead, assignedToUids: string[]) {
    setAssigningId(lead.id);
    try {
      await onAssign(lead, assignedToUids);
    } finally {
      setAssigningId(null);
    }
  }

  async function runMass(mode: BulkAssignMode) {
    const leadIds = [...selectedIds];
    if (leadIds.length === 0) return;
    if (
      (mode === "set" || mode === "add" || mode === "remove") &&
      massAssigneeIds.length === 0
    ) {
      setMassError("Pick at least one assignee.");
      return;
    }
    setMassBusy(true);
    setMassError(null);
    try {
      await onBulkAssign(
        leadIds,
        mode,
        mode === "clear" ? undefined : massAssigneeIds,
      );
      clearSelection();
    } catch {
      setMassError("Unable to update assignees.");
    } finally {
      setMassBusy(false);
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <p>
          Showing {paginatedItems.length} of {totalItems}
          {totalItems !== leads.length ? ` (filtered from ${leads.length})` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && selectedIds.size < filteredIds.length ?
            <button
              type="button"
              className="font-medium text-teal-700 hover:underline"
              onClick={selectAllFiltered}
            >
              Select all {filteredIds.length} filtered
            </button>
          : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={prepared.length === 0}
            onClick={() => {
              setBlastDraft(null);
              setBlastOpen(true);
            }}
          >
            <Mail className="h-3.5 w-3.5" />
            Compose email
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setPromoteOpen(true)}
          >
            <Tag className="h-3.5 w-3.5" />
            Promote
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 ?
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-teal-200 bg-teal-50/60 px-3 py-2.5">
          <p className="text-sm font-medium text-teal-900">
            {selectedIds.size} selected
          </p>
          <div className="min-w-[180px] flex-1">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-teal-800/70">
              Assignees
            </p>
            <div className="flex max-h-24 flex-wrap gap-x-3 gap-y-1 overflow-y-auto rounded-md border border-teal-200 bg-white px-2 py-1.5">
              {members.map((member) => {
                const checked = massAssigneeIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className="flex items-center gap-1.5 text-xs text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-zinc-300"
                      checked={checked}
                      disabled={massBusy}
                      onChange={() => {
                        setMassAssigneeIds((prev) =>
                          checked ?
                            prev.filter((id) => id !== member.id)
                          : [...prev, member.id],
                        );
                      }}
                    />
                    <span className="truncate">
                      {member.displayName || member.email || member.id}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              disabled={massBusy}
              onClick={() => void runMass("add")}
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={massBusy}
              onClick={() => void runMass("set")}
            >
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={massBusy}
              onClick={() => void runMass("remove")}
            >
              Remove
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={massBusy}
              onClick={() => void runMass("clear")}
            >
              Unassign all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={massBusy}
              onClick={clearSelection}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={massBusy}
              className="gap-1.5"
              onClick={() => setBlastOpen(true)}
            >
              <Mail className="h-3.5 w-3.5" />
              Email selected
            </Button>
          </div>
          {massError ?
            <p className="w-full text-xs text-red-600">{massError}</p>
          : null}
        </div>
      : null}

      {prepared.length === 0 ?
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-16 text-center text-sm text-zinc-500">
          {leads.length === 0 ?
            queue === "content" ?
              "No webinar, training, article, or story emails yet. Use Gather new leads to import them."
            : "No leads in this queue yet."
          : "No leads match the current filters."}
        </div>
      : <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-[860px] w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected;
                    }}
                    aria-label="Select page"
                    onChange={togglePage}
                  />
                </th>
                <SortHeader
                  label="Lead"
                  sortKey="businessName"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Assignees"
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
                const checked = selectedIds.has(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={cn(
                      "cursor-pointer border-t border-zinc-100 hover:bg-teal-50/30",
                      checked && "bg-teal-50/40",
                    )}
                    onClick={() => onViewDetails(lead)}
                  >
                    <td
                      className="px-3 py-3 align-top"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="rounded border-zinc-300"
                        checked={checked}
                        aria-label={`Select ${lead.businessName}`}
                        onChange={() => toggleOne(lead.id)}
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <LeadProfileCell lead={lead} />
                    </td>
                    <td
                      className="px-3 py-3 align-top"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <LeadAssigneeMultiSelect
                        lead={lead}
                        members={members}
                        disabled={assigningId === lead.id}
                        onSave={(uids) => handleAssign(lead, uids)}
                      />
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
                      />
                    </td>
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

      <LeadEmailBlastComposeDialog
        open={blastOpen}
        selectedLeads={selectedLeads}
        filteredLeads={prepared}
        initialScope={selectedLeads.length > 0 ? "selected" : "filtered"}
        initialDraft={blastDraft}
        onClose={() => {
          setBlastOpen(false);
          setBlastDraft(null);
        }}
        onSent={() => {
          onLeadsChanged?.();
        }}
      />
      <LeadPromoteOfferDialog
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onUseInEmail={(draft) => {
          setBlastDraft(draft);
          setPromoteOpen(false);
          setBlastOpen(true);
        }}
      />
    </div>
  );
}
