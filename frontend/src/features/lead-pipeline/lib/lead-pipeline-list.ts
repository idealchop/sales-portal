import type { Lead, LeadPlatformSource, LeadStage } from "@/lib/definitions";
import {
  DEMO_STATUS_OPTIONS,
  LEAD_ACQUISITION_SOURCES,
  displayAttemptCount,
  normalizeDemoStatus,
  parseWarmStatus,
  resolveInquiredAt,
  resolveRegisteredAt,
  warmStatusOptionByValue,
  type DemoStatus,
  type WarmStatusValue,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";

export const LEAD_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type LeadPageSize = (typeof LEAD_PAGE_SIZE_OPTIONS)[number];

export type LeadSortKey =
  | "businessName"
  | "ownerName"
  | "platformSource"
  | "stage"
  | "attemptCount"
  | "assignedToUid"
  | "lastContactAt"
  | "nextFollowUpAt"
  | "leadSource"
  | "createdAt"
  /** Warm queue default: inquire/registered, follow-up override, legacy customer count. */
  | "warmDefault"
  /** Onboarded queue default: attention flags first (grace, cold recommend, etc.). */
  | "onboardedDefault";

export type LeadSortDir = "asc" | "desc";

export type DateFilterPreset =
  | "all"
  | "today"
  | "yesterday"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

export type DateFilterState = {
  preset: DateFilterPreset;
  /** yyyy-mm-dd when preset is custom */
  from: string;
  /** yyyy-mm-dd when preset is custom */
  to: string;
};

export const DEFAULT_DATE_FILTER: DateFilterState = {
  preset: "all",
  from: "",
  to: "",
};

export const DATE_FILTER_PRESET_OPTIONS: Array<{
  value: DateFilterPreset;
  label: string;
}> = [
  { value: "all", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

export type LeadAttemptsFilter =
  | "all"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4plus";

export type LeadListFilters = {
  search: string;
  platformSource: "all" | LeadPlatformSource;
  assignedToUid: "all" | "unassigned" | string;
  inquiredAt: DateFilterState;
  registeredAt: DateFilterState;
  lastContactAt: DateFilterState;
  nextFollowUpAt: DateFilterState;
  warmStatus: "all" | WarmStatusValue;
  leadSource: "all" | string;
  demo: "all" | DemoStatus;
  accountReady: "all" | "yes" | "no";
  attempts: LeadAttemptsFilter;
  stage: "all" | LeadStage;
};

export const DEFAULT_LEAD_LIST_FILTERS: LeadListFilters = {
  search: "",
  platformSource: "all",
  assignedToUid: "all",
  inquiredAt: { ...DEFAULT_DATE_FILTER },
  registeredAt: { ...DEFAULT_DATE_FILTER },
  lastContactAt: { ...DEFAULT_DATE_FILTER },
  nextFollowUpAt: { ...DEFAULT_DATE_FILTER },
  warmStatus: "all",
  leadSource: "all",
  demo: "all",
  accountReady: "all",
  attempts: "all",
  stage: "all",
};

export const LEAD_SOURCE_FILTER_OPTIONS = [
  "all",
  ...LEAD_ACQUISITION_SOURCES,
  "Registered account",
  "SmartRefill workspace",
  "SmartRefill legacy station",
  "Demo request",
  "Webinar",
  "Training",
  "Article",
  "Story",
] as const;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Inclusive local-time range for a date filter, or null when no date constraint. */
export function resolveDateFilterRange(
  filter: DateFilterState,
  now: Date = new Date(),
): { startMs: number; endMs: number } | null {
  if (filter.preset === "all") return null;

  if (filter.preset === "custom") {
    const from = filter.from ? parseDateInput(filter.from) : null;
    const to = filter.to ? parseDateInput(filter.to) : null;
    if (!from && !to) return null;
    const start = from ? startOfLocalDay(from) : startOfLocalDay(new Date(0));
    const end = to ? endOfLocalDay(to) : endOfLocalDay(now);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }

  const today = startOfLocalDay(now);

  switch (filter.preset) {
  case "today":
    return {
      startMs: today.getTime(),
      endMs: endOfLocalDay(now).getTime(),
    };
  case "yesterday": {
    const day = new Date(today);
    day.setDate(day.getDate() - 1);
    return {
      startMs: startOfLocalDay(day).getTime(),
      endMs: endOfLocalDay(day).getTime(),
    };
  }
  case "last_week": {
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    return {
      startMs: startOfLocalDay(start).getTime(),
      endMs: endOfLocalDay(now).getTime(),
    };
  }
  case "this_month": {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startMs: startOfLocalDay(start).getTime(),
      endMs: endOfLocalDay(now).getTime(),
    };
  }
  case "last_month": {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startMs: startOfLocalDay(start).getTime(),
      endMs: endOfLocalDay(end).getTime(),
    };
  }
  default:
    return null;
  }
}

function dateInRange(
  iso: string | null | undefined,
  range: { startMs: number; endMs: number } | null,
): boolean {
  if (!range) return true;
  if (!iso) return false;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return false;
  return ms >= range.startMs && ms <= range.endMs;
}

function matchesAttempts(count: number, filter: LeadAttemptsFilter): boolean {
  switch (filter) {
  case "all":
    return true;
  case "0":
    return count === 0;
  case "1":
    return count === 1;
  case "2":
    return count === 2;
  case "3":
    return count === 3;
  case "4plus":
    return count >= 4;
  default:
    return true;
  }
}

function haystack(lead: Lead): string {
  return [
    lead.businessName,
    lead.ownerName,
    lead.email,
    lead.phone,
    lead.address,
    lead.leadSource,
    lead.sourceWebsite,
    lead.referredBy,
    lead.notes,
    lead.stallReason,
    lead.warmStatus,
    lead.assignedToUid,
    lead.linkedBusinessId,
    lead.platformSource,
    lead.contentSummary,
    ...(lead.contentSources ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const CONTENT_SOURCE_FILTER_LABELS: Record<string, "webinar" | "training" | "article" | "story"> = {
  Webinar: "webinar",
  Training: "training",
  Article: "article",
  Story: "story",
};

function leadMatchesSourceFilter(lead: Lead, selected: string): boolean {
  const source = (lead.leadSource || "").trim();
  if (source === selected) return true;
  const tokens = source
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  if (tokens.includes(selected)) return true;
  const kind = CONTENT_SOURCE_FILTER_LABELS[selected];
  if (!kind) return false;
  return (lead.contentSources ?? []).includes(kind);
}

export function isLeadListFilterActive(filters: LeadListFilters): boolean {
  return (
    Boolean(filters.search.trim()) ||
    filters.platformSource !== "all" ||
    filters.assignedToUid !== "all" ||
    filters.inquiredAt.preset !== "all" ||
    filters.registeredAt.preset !== "all" ||
    filters.lastContactAt.preset !== "all" ||
    filters.nextFollowUpAt.preset !== "all" ||
    filters.warmStatus !== "all" ||
    filters.leadSource !== "all" ||
    filters.demo !== "all" ||
    filters.accountReady !== "all" ||
    filters.attempts !== "all" ||
    filters.stage !== "all"
  );
}

/** Filters that live behind the Advanced panel (not primary controls). */
export function isAdvancedLeadListFilterActive(filters: LeadListFilters): boolean {
  return (
    filters.inquiredAt.preset !== "all" ||
    filters.registeredAt.preset !== "all" ||
    filters.lastContactAt.preset !== "all" ||
    filters.nextFollowUpAt.preset !== "all" ||
    filters.leadSource !== "all" ||
    filters.demo !== "all" ||
    filters.accountReady !== "all" ||
    filters.attempts !== "all" ||
    filters.stage !== "all"
  );
}

export type LeadListFilterChipKey =
  | "search"
  | "platformSource"
  | "assignedToUid"
  | "inquiredAt"
  | "registeredAt"
  | "lastContactAt"
  | "nextFollowUpAt"
  | "warmStatus"
  | "leadSource"
  | "demo"
  | "accountReady"
  | "attempts"
  | "stage";

export type LeadListFilterChip = {
  key: LeadListFilterChipKey;
  label: string;
};

function dateFilterChipLabel(prefix: string, filter: DateFilterState): string | null {
  if (filter.preset === "all") return null;
  if (filter.preset === "custom") {
    const from = filter.from.trim() || "…";
    const to = filter.to.trim() || "…";
    return `${prefix}: ${from} – ${to}`;
  }
  const preset =
    DATE_FILTER_PRESET_OPTIONS.find((option) => option.value === filter.preset)
      ?.label ?? filter.preset;
  return `${prefix}: ${preset}`;
}

function attemptsChipLabel(value: LeadAttemptsFilter): string {
  switch (value) {
  case "0":
  case "1":
  case "2":
  case "3":
    return `Attempts: ${value}`;
  case "4plus":
    return "Attempts: 4+";
  default:
    return "Attempts";
  }
}

/** Removable chips for the active filter summary bar. */
export function describeActiveLeadListFilters(
  filters: LeadListFilters,
  options?: {
    assigneeNameByUid?: Map<string, string> | Record<string, string>;
  },
): LeadListFilterChip[] {
  const chips: LeadListFilterChip[] = [];
  const search = filters.search.trim();
  if (search) {
    chips.push({ key: "search", label: `Search: ${search}` });
  }

  if (filters.assignedToUid !== "all") {
    let name = "Unassigned";
    if (filters.assignedToUid !== "unassigned") {
      const map = options?.assigneeNameByUid;
      const resolved =
        map instanceof Map ?
          map.get(filters.assignedToUid)
        : map?.[filters.assignedToUid];
      name = resolved || filters.assignedToUid;
    }
    chips.push({ key: "assignedToUid", label: `Assigned: ${name}` });
  }

  if (filters.warmStatus !== "all") {
    const status =
      warmStatusOptionByValue(filters.warmStatus)?.label || filters.warmStatus;
    chips.push({ key: "warmStatus", label: `Status: ${status}` });
  }

  if (filters.platformSource !== "all") {
    chips.push({
      key: "platformSource",
      label: `Platform: ${
        filters.platformSource === "smartrefill_legacy" ?
          "SmartRefill legacy"
        : "SmartRefill"
      }`,
    });
  }

  if (filters.leadSource !== "all") {
    chips.push({ key: "leadSource", label: `Source: ${filters.leadSource}` });
  }

  if (filters.demo !== "all") {
    const demo =
      DEMO_STATUS_OPTIONS.find((option) => option.value === filters.demo)
        ?.label || filters.demo;
    chips.push({ key: "demo", label: `Demo: ${demo}` });
  }

  if (filters.accountReady !== "all") {
    chips.push({
      key: "accountReady",
      label:
        filters.accountReady === "yes" ? "Account ready: Ready" : "Account ready: Not ready",
    });
  }

  if (filters.attempts !== "all") {
    chips.push({ key: "attempts", label: attemptsChipLabel(filters.attempts) });
  }

  if (filters.stage !== "all") {
    chips.push({ key: "stage", label: `Stage: ${filters.stage}` });
  }

  const inquire = dateFilterChipLabel("Date inquire", filters.inquiredAt);
  if (inquire) chips.push({ key: "inquiredAt", label: inquire });

  const registered = dateFilterChipLabel("Date registered", filters.registeredAt);
  if (registered) chips.push({ key: "registeredAt", label: registered });

  const contacted = dateFilterChipLabel("Date contacted", filters.lastContactAt);
  if (contacted) chips.push({ key: "lastContactAt", label: contacted });

  const followUp = dateFilterChipLabel("Date follow-up", filters.nextFollowUpAt);
  if (followUp) chips.push({ key: "nextFollowUpAt", label: followUp });

  return chips;
}

export function clearedLeadListFilterValue<K extends LeadListFilterChipKey>(
  key: K,
): LeadListFilters[K] {
  switch (key) {
  case "search":
    return "" as LeadListFilters[K];
  case "inquiredAt":
  case "registeredAt":
  case "lastContactAt":
  case "nextFollowUpAt":
    return { ...DEFAULT_DATE_FILTER } as LeadListFilters[K];
  default:
    return "all" as LeadListFilters[K];
  }
}

export function filterLeadsForList(
  leads: Lead[],
  filters: LeadListFilters,
  now: Date = new Date(),
): Lead[] {
  const q = filters.search.trim().toLowerCase();
  const inquireRange = resolveDateFilterRange(filters.inquiredAt, now);
  const registeredRange = resolveDateFilterRange(filters.registeredAt, now);
  const contactedRange = resolveDateFilterRange(filters.lastContactAt, now);
  const followUpRange = resolveDateFilterRange(filters.nextFollowUpAt, now);

  return leads.filter((lead) => {
    if (filters.platformSource !== "all") {
      if (lead.platformSource !== filters.platformSource) return false;
    }
    if (filters.stage !== "all" && lead.stage !== filters.stage) return false;

    if (filters.assignedToUid === "unassigned") {
      if (lead.assignedToUid) return false;
    } else if (filters.assignedToUid !== "all") {
      if (lead.assignedToUid !== filters.assignedToUid) return false;
    }

    if (filters.warmStatus !== "all") {
      const parsed = parseWarmStatus(lead.warmStatus);
      if (parsed.value !== filters.warmStatus) return false;
    }

    if (filters.leadSource !== "all") {
      if (!leadMatchesSourceFilter(lead, filters.leadSource)) return false;
    }

    if (filters.demo !== "all") {
      if (normalizeDemoStatus(lead.attendedDemo) !== filters.demo) return false;
    }

    if (filters.accountReady !== "all") {
      const ready = Boolean(lead.accountReady ?? lead.workspace?.accountReady);
      if (filters.accountReady === "yes" && !ready) return false;
      if (filters.accountReady === "no" && ready) return false;
    }

    if (
      !matchesAttempts(
        displayAttemptCount(lead).count,
        filters.attempts,
      )
    ) {
      return false;
    }

    if (!dateInRange(resolveInquiredAt(lead), inquireRange)) return false;
    if (!dateInRange(resolveRegisteredAt(lead), registeredRange)) return false;
    if (!dateInRange(lead.lastContactAt, contactedRange)) return false;
    if (!dateInRange(lead.nextFollowUpAt, followUpRange)) return false;

    if (q && !haystack(lead).includes(q)) return false;
    return true;
  });
}

function sortValue(lead: Lead, key: LeadSortKey): string | number {
  switch (key) {
  case "businessName":
    return lead.businessName.toLowerCase();
  case "ownerName":
    return lead.ownerName.toLowerCase();
  case "platformSource":
    return lead.platformSource || "";
  case "stage":
    return lead.stage;
  case "attemptCount":
    return displayAttemptCount(lead).count;
  case "assignedToUid":
    return (lead.assignedToUid || "").toLowerCase();
  case "lastContactAt": {
    const ms = lead.lastContactAt ? Date.parse(lead.lastContactAt) : 0;
    return Number.isFinite(ms) ? ms : 0;
  }
  case "nextFollowUpAt": {
    const ms = lead.nextFollowUpAt ? Date.parse(lead.nextFollowUpAt) : 0;
    return Number.isFinite(ms) ? ms : 0;
  }
  case "leadSource":
    return (lead.leadSource || "").toLowerCase();
  case "createdAt": {
    const ms = lead.createdAt ? Date.parse(lead.createdAt) : 0;
    return Number.isFinite(ms) ? ms : 0;
  }
  case "warmDefault":
    return warmLeadPriorityMs(lead);
  case "onboardedDefault":
    return onboardedAttentionRank(lead);
  default:
    return "";
  }
}

function parseLeadDateMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Warm acquisition date: inquire first, else registered.
 */
export function resolveWarmAcquisitionMs(lead: Lead): number | null {
  return (
    parseLeadDateMs(resolveInquiredAt(lead)) ??
    parseLeadDateMs(resolveRegisteredAt(lead))
  );
}

/**
 * Warm priority date:
 * - Prefer inquire / registered
 * - If that date is older than follow-up, use follow-up instead
 * - Else fall back to follow-up, then createdAt
 */
export function warmLeadPriorityMs(lead: Lead): number {
  const acquisitionMs = resolveWarmAcquisitionMs(lead);
  const followUpMs = parseLeadDateMs(lead.nextFollowUpAt);

  if (acquisitionMs != null && followUpMs != null && acquisitionMs < followUpMs) {
    return followUpMs;
  }
  if (acquisitionMs != null) return acquisitionMs;
  if (followUpMs != null) return followUpMs;
  return parseLeadDateMs(lead.createdAt) ?? 0;
}

function legacyCustomerCount(lead: Lead): number {
  if (lead.platformSource !== "smartrefill_legacy") return 0;
  const count = Number(lead.customerCount);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/** Default warm-queue ordering: priority date, then follow-up, then legacy customers. */
export function compareWarmLeadsDefault(a: Lead, b: Lead): number {
  const dateDiff = warmLeadPriorityMs(b) - warmLeadPriorityMs(a);
  if (dateDiff !== 0) return dateDiff;

  const followA = parseLeadDateMs(a.nextFollowUpAt) ?? Number.NEGATIVE_INFINITY;
  const followB = parseLeadDateMs(b.nextFollowUpAt) ?? Number.NEGATIVE_INFINITY;
  if (followB !== followA) return followB - followA;

  const customersDiff = legacyCustomerCount(b) - legacyCustomerCount(a);
  if (customersDiff !== 0) return customersDiff;

  return a.businessName.localeCompare(b.businessName, undefined, {
    sensitivity: "base",
  });
}

/**
 * Lower rank = needs attention first.
 * Aligns with Action board: grace / cold-recommend > expiring > day8 > renew/change.
 */
export function onboardedAttentionRank(lead: Lead): number {
  const flags = new Set(lead.onboardedMonitor?.flags ?? []);
  const followMs = parseLeadDateMs(lead.nextFollowUpAt);
  const overdue =
    followMs != null && followMs < Date.now();

  if (flags.has("subscription_grace_period")) return 0;
  if (flags.has("recommend_move_to_cold")) return 1;
  if (flags.has("subscription_expiring_soon")) return 2;
  if (overdue) return 3;
  if (flags.has("journey_inactive_day8")) return 4;
  if (flags.has("subscription_change")) return 5;
  if (flags.has("subscription_renew")) return 6;
  if (followMs != null) return 7;
  return 8;
}

/** Default onboarded-queue ordering: attention first, then journey day desc, then name. */
export function compareOnboardedLeadsDefault(a: Lead, b: Lead): number {
  const rankDiff = onboardedAttentionRank(a) - onboardedAttentionRank(b);
  if (rankDiff !== 0) return rankDiff;

  const dayA = a.onboardedMonitor?.journeyDay ?? 0;
  const dayB = b.onboardedMonitor?.journeyDay ?? 0;
  if (dayB !== dayA) return dayB - dayA;

  const followA = parseLeadDateMs(a.nextFollowUpAt) ?? Number.POSITIVE_INFINITY;
  const followB = parseLeadDateMs(b.nextFollowUpAt) ?? Number.POSITIVE_INFINITY;
  if (followA !== followB) return followA - followB;

  return a.businessName.localeCompare(b.businessName, undefined, {
    sensitivity: "base",
  });
}

export function sortLeadsForList(
  leads: Lead[],
  sortKey: LeadSortKey,
  sortDir: LeadSortDir,
): Lead[] {
  if (sortKey === "warmDefault") {
    const sorted = [...leads].sort(compareWarmLeadsDefault);
    return sortDir === "asc" ? sorted.reverse() : sorted;
  }
  if (sortKey === "onboardedDefault") {
    const sorted = [...leads].sort(compareOnboardedLeadsDefault);
    // Default "desc" keeps attention-first order; asc reverses for toggle.
    return sortDir === "asc" ? sorted.reverse() : sorted;
  }

  const dir = sortDir === "asc" ? 1 : -1;
  return [...leads].sort((a, b) => {
    const left = sortValue(a, sortKey);
    const right = sortValue(b, sortKey);
    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * dir;
    }
    return String(left).localeCompare(String(right), undefined, {
      sensitivity: "base",
    }) * dir;
  });
}

export function prepareLeadListRows(
  leads: Lead[],
  filters: LeadListFilters,
  sortKey: LeadSortKey,
  sortDir: LeadSortDir,
): Lead[] {
  return sortLeadsForList(filterLeadsForList(leads, filters), sortKey, sortDir);
}
