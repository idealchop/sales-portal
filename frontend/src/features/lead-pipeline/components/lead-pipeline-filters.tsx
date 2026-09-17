"use client";

import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEMO_STATUS_OPTIONS,
  groupWarmStatusOptions,
  WARM_STATUS_OPTIONS,
  inputClassName,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import {
  DATE_FILTER_PRESET_OPTIONS,
  DEFAULT_LEAD_LIST_FILTERS,
  clearedLeadListFilterValue,
  describeActiveLeadListFilters,
  isAdvancedLeadListFilterActive,
  isLeadListFilterActive,
  LEAD_PAGE_SIZE_OPTIONS,
  LEAD_SOURCE_FILTER_OPTIONS,
  type DateFilterPreset,
  type DateFilterState,
  type LeadAttemptsFilter,
  type LeadListFilterChipKey,
  type LeadListFilters,
  type LeadPageSize,
} from "@/features/lead-pipeline/lib/lead-pipeline-list";
import type { LeadQueue } from "@/lib/definitions";
import type { TeamMemberSummary } from "@/lib/sales/api";
import { cn } from "@/lib/utils";

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </span>
  );
}

function DateFilterControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateFilterState;
  onChange: (next: DateFilterState) => void;
}) {
  return (
    <div className="min-w-0">
      <FilterLabel>{label}</FilterLabel>
      <select
        className={inputClassName}
        value={value.preset}
        onChange={(event) =>
          onChange({
            ...value,
            preset: event.target.value as DateFilterPreset,
          })
        }
      >
        {DATE_FILTER_PRESET_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {value.preset === "custom" ?
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <input
            type="date"
            aria-label={`${label} from`}
            className={inputClassName}
            value={value.from}
            onChange={(event) =>
              onChange({ ...value, from: event.target.value })
            }
          />
          <input
            type="date"
            aria-label={`${label} to`}
            className={inputClassName}
            value={value.to}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
          />
        </div>
      : null}
    </div>
  );
}

export function LeadPipelineFilters({
  filters,
  onChange,
  onReset,
  pageSize,
  onPageSizeChange,
  members,
  queue = "warm",
}: {
  filters: LeadListFilters;
  onChange: <K extends keyof LeadListFilters>(
    key: K,
    value: LeadListFilters[K],
  ) => void;
  onReset: () => void;
  pageSize: LeadPageSize;
  onPageSizeChange: (size: LeadPageSize) => void;
  members: TeamMemberSummary[];
  queue?: LeadQueue;
}) {
  const advancedActive = isAdvancedLeadListFilterActive(filters);
  const [advancedOpen, setAdvancedOpen] = useState(advancedActive);
  const showAdvanced = advancedOpen || advancedActive;
  const active = isLeadListFilterActive(filters);
  const statusGroups = groupWarmStatusOptions(WARM_STATUS_OPTIONS, queue);

  const assigneeNameByUid = new Map(
    members.map((member) => [
      member.id,
      member.displayName || member.email || member.id,
    ]),
  );
  const chips = describeActiveLeadListFilters(filters, { assigneeNameByUid });

  function clearChip(key: LeadListFilterChipKey) {
    onChange(key, clearedLeadListFilterValue(key));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="relative min-w-[200px] flex-[2] sm:min-w-[240px]">
            <FilterLabel>Search</FilterLabel>
            <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-zinc-400" />
            <input
              type="search"
              className={cn(inputClassName, "pl-9 pr-9")}
              value={filters.search}
              onChange={(event) => onChange("search", event.target.value)}
              placeholder="Business, owner, email, source…"
            />
            {filters.search ?
              <button
                type="button"
                aria-label="Clear search"
                className="absolute bottom-2 right-2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                onClick={() => onChange("search", "")}
              >
                <X className="h-4 w-4" />
              </button>
            : null}
          </label>

          <label className="min-w-[140px] flex-1 sm:max-w-[200px]">
            <FilterLabel>Assigned</FilterLabel>
            <select
              className={inputClassName}
              value={filters.assignedToUid}
              onChange={(event) => onChange("assignedToUid", event.target.value)}
            >
              <option value="all">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName || member.email || member.id}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-[140px] flex-1 sm:max-w-[200px]">
            <FilterLabel>Status</FilterLabel>
            <select
              className={inputClassName}
              value={filters.warmStatus}
              onChange={(event) =>
                onChange(
                  "warmStatus",
                  event.target.value as LeadListFilters["warmStatus"],
                )
              }
            >
            <option value="all">All statuses</option>
            {statusGroups.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
            </select>
          </label>

          <label className="min-w-[140px] flex-1 sm:max-w-[180px]">
            <FilterLabel>Platform</FilterLabel>
            <select
              className={inputClassName}
              value={filters.platformSource}
              onChange={(event) =>
                onChange(
                  "platformSource",
                  event.target.value as LeadListFilters["platformSource"],
                )
              }
            >
              <option value="all">All platforms</option>
              <option value="smartrefill">SmartRefill</option>
              <option value="smartrefill_legacy">SmartRefill legacy</option>
            </select>
          </label>

          <label className="min-w-[100px] sm:max-w-[110px]">
            <FilterLabel>Rows</FilterLabel>
            <select
              className={inputClassName}
              value={pageSize}
              onChange={(event) =>
                onPageSizeChange(Number(event.target.value) as LeadPageSize)
              }
            >
              {LEAD_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mb-0.5 gap-1.5"
            aria-expanded={showAdvanced}
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Advanced filters
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showAdvanced && "rotate-180",
              )}
            />
          </Button>
        </div>

        {showAdvanced ?
          <div className="space-y-3 border-t border-zinc-100 pt-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <label className="min-w-0">
                <FilterLabel>Source</FilterLabel>
                <select
                  className={inputClassName}
                  value={filters.leadSource}
                  onChange={(event) => onChange("leadSource", event.target.value)}
                >
                  {LEAD_SOURCE_FILTER_OPTIONS.map((source) => (
                    <option key={source} value={source}>
                      {source === "all" ? "All sources" : source}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <FilterLabel>Demo</FilterLabel>
                <select
                  className={inputClassName}
                  value={filters.demo}
                  onChange={(event) =>
                    onChange(
                      "demo",
                      event.target.value as LeadListFilters["demo"],
                    )
                  }
                >
                  <option value="all">All</option>
                  {DEMO_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <FilterLabel>Account ready</FilterLabel>
                <select
                  className={inputClassName}
                  value={filters.accountReady}
                  onChange={(event) =>
                    onChange(
                      "accountReady",
                      event.target.value as LeadListFilters["accountReady"],
                    )
                  }
                >
                  <option value="all">All</option>
                  <option value="yes">Ready</option>
                  <option value="no">Not ready</option>
                </select>
              </label>

              <label className="min-w-0">
                <FilterLabel>Attempts</FilterLabel>
                <select
                  className={inputClassName}
                  value={filters.attempts}
                  onChange={(event) =>
                    onChange(
                      "attempts",
                      event.target.value as LeadAttemptsFilter,
                    )
                  }
                >
                  <option value="all">Any</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4plus">4+</option>
                </select>
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <DateFilterControl
                label="Date inquire"
                value={filters.inquiredAt}
                onChange={(next) => onChange("inquiredAt", next)}
              />
              <DateFilterControl
                label="Date registered"
                value={filters.registeredAt}
                onChange={(next) => onChange("registeredAt", next)}
              />
              <DateFilterControl
                label="Date contacted"
                value={filters.lastContactAt}
                onChange={(next) => onChange("lastContactAt", next)}
              />
              <DateFilterControl
                label="Date follow-up"
                value={filters.nextFollowUpAt}
                onChange={(next) => onChange("nextFollowUpAt", next)}
              />
            </div>
          </div>
        : null}
      </div>

      {active && chips.length > 0 ?
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2">
          <span className="shrink-0 text-sm text-zinc-500">Showing:</span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100"
                onClick={() => clearChip(chip.key)}
                title={`Clear ${chip.label}`}
              >
                <span className="truncate">{chip.label}</span>
                <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                <span className="sr-only">Clear {chip.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="shrink-0 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            onClick={onReset}
          >
            Clear all
          </button>
        </div>
      : null}
    </div>
  );
}

export { DEFAULT_LEAD_LIST_FILTERS };
