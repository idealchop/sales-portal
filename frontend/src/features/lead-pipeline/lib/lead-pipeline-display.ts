import type { LeadQueue, LeadStage } from "@/lib/definitions";

export const LEAD_STAGE_LABELS: Record<string, string> = {
  inquire: "Demo inquire",
  warm: "Warm",
  cold: "Cold",
  registered: "Newly registered",
  onboarded: "Onboarded",
  archive: "Archive",
};

export const LEAD_QUEUE_TABS = [
  { id: "all" as const, label: "All" },
  { id: "content" as const, label: "Content" },
  { id: "warm" as const, label: "Warm" },
  { id: "cold" as const, label: "Cold" },
  { id: "onboarded" as const, label: "Onboarded" },
  { id: "archive" as const, label: "Archives" },
];

/** Lead contact statuses, grouped by destination queue. */
export const WARM_STATUS_OPTIONS = [
  // Warm — always move / stay in Warm
  {
    value: "callback_requested",
    label: "Callback Requested",
    stage: "warm" as const,
    requiresDetail: false,
    moveHint: "Moves to Warm leads",
  },
  {
    value: "decision_pending",
    label: "Decision Pending",
    stage: "warm" as const,
    requiresDetail: false,
    moveHint: "Moves to Warm leads",
  },
  {
    value: "demo_scheduled",
    label: "Demo Scheduled",
    stage: "warm" as const,
    requiresDetail: false,
    moveHint: "Moves to Warm leads (including after a missed demo)",
  },
  {
    value: "interested_follow_up",
    label: "Interested — Follow Up",
    stage: "warm" as const,
    requiresDetail: false,
    moveHint: "Moves to Warm leads",
  },
  // Cold — always move / stay in Cold
  {
    value: "competitor_chosen",
    label: "Competitor Chosen",
    stage: "cold" as const,
    requiresDetail: false,
    moveHint: "Moves to Cold leads",
  },
  {
    value: "deferred_not_ready",
    label: "Deferred - Not Ready Yet",
    stage: "cold" as const,
    requiresDetail: false,
    moveHint: "Moves to Cold leads",
  },
  {
    value: "do_not_contact",
    label: "Do Not Contact",
    stage: "cold" as const,
    requiresDetail: false,
    moveHint: "Moves to Cold leads",
  },
  {
    value: "invalid_contact_number",
    label: "Invalid Contact number",
    stage: "cold" as const,
    requiresDetail: false,
    moveHint: "Moves to Cold leads",
  },
  {
    value: "missed_demo",
    label: "Missed Demo",
    stage: "cold" as const,
    requiresDetail: false,
    moveHint: "Moves to Cold leads · marks demo as missed",
  },
  {
    value: "no_response",
    label: "No Response",
    stage: "cold" as const,
    requiresDetail: false,
    moveHint: "Moves to Cold leads",
  },
  {
    value: "not_interested",
    label: "Not Interested",
    stage: "cold" as const,
    requiresDetail: false,
    moveHint: "Moves to Cold leads",
  },
  {
    value: "too_busy_to_talk",
    label: "Too busy to talk",
    stage: "cold" as const,
    requiresDetail: false,
    moveHint: "Moves to Cold leads",
  },
  {
    value: "wrong_person_gatekeeper",
    label: "Wrong Person / Gatekeeper",
    stage: "cold" as const,
    requiresDetail: false,
    moveHint: "Moves to Cold leads",
  },
  // Archives — stop active outreach
  {
    value: "closed_found_alternative",
    label: "Closed — Found Alternative",
    stage: "archive" as const,
    requiresDetail: false,
    moveHint: "Moves to Archives — stopped outreach; they found another option",
  },
  {
    value: "parked_revisit_later",
    label: "Parked — Revisit Later",
    stage: "archive" as const,
    requiresDetail: false,
    moveHint: "Moves to Archives — pause outreach for now",
  },
  {
    value: "duplicate_record",
    label: "Duplicate Record",
    stage: "archive" as const,
    requiresDetail: true,
    moveHint:
      "Moves to Archives — same person/business in legacy and SmartRefill (specify which to keep)",
  },
  {
    value: "unreachable",
    label: "Unreachable",
    stage: "archive" as const,
    requiresDetail: false,
    moveHint: "Moves to Archives — contact channels no longer usable",
  },
  {
    value: "wrong_fit",
    label: "Wrong Fit",
    stage: "archive" as const,
    requiresDetail: false,
    moveHint: "Moves to Archives — not a fit for SmartRefill",
  },
  // Onboarded — journey monitoring (cold move is flag-only / manual confirm)
  {
    value: "subscribed",
    label: "Subscribed",
    stage: "onboarded" as const,
    requiresDetail: false,
    moveHint: "Moves to Onboarded",
  },
  {
    value: "journey_check_in",
    label: "Journey check-in",
    stage: "onboarded" as const,
    requiresDetail: false,
    moveHint: "Stays in Onboarded — Day 1–15 check-in logged",
  },
  {
    value: "journey_inactive_flagged",
    label: "Journey inactive (flagged)",
    stage: "onboarded" as const,
    requiresDetail: false,
    moveHint: "Stays in Onboarded — Day 8+ inactivity flagged for follow-up",
  },
  {
    value: "journey_active",
    label: "Journey active",
    stage: "onboarded" as const,
    requiresDetail: false,
    moveHint: "Stays in Onboarded — getting-started + activity days met",
  },
  // General — stay in current queue; typically bump attempt count
  {
    value: "awaiting_reply",
    label: "Awaiting reply",
    stage: null,
    requiresDetail: false,
    moveHint: "Stays in current queue — waiting for feedback",
  },
  {
    value: "email_opened",
    label: "Email opened",
    stage: null,
    requiresDetail: false,
    moveHint: "Stays in current queue — recipient opened the follow-up email",
  },
  {
    value: "other",
    label: "Other",
    stage: null,
    requiresDetail: true,
    moveHint: "Stays in current queue",
  },
] as const;

export type WarmStatusValue = (typeof WARM_STATUS_OPTIONS)[number]["value"];

/** Statuses set by email follow-up / Brevo open — not chosen as contact results. */
export const WARM_STATUS_EMAIL_TRACKING_VALUES = [
  "awaiting_reply",
  "email_opened",
] as const satisfies ReadonlyArray<WarmStatusValue>;

/** Result statuses for Update status (after contact with feedback). */
export const WARM_STATUS_RESULT_OPTIONS = WARM_STATUS_OPTIONS.filter(
  (option) =>
    !(WARM_STATUS_EMAIL_TRACKING_VALUES as readonly string[]).includes(
      option.value,
    ),
);

export type WarmStatusOption = (typeof WARM_STATUS_OPTIONS)[number];

export type WarmStatusGroup = {
  id: "warm" | "cold" | "onboarded" | "archive" | "general";
  label: string;
  options: WarmStatusOption[];
};

function sortStatusOptionsByLabel(
  options: readonly WarmStatusOption[],
): WarmStatusOption[] {
  return [...options].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

/** Group statuses by destination queue for select optgroups. */
export function groupWarmStatusOptions(
  options: readonly WarmStatusOption[] = WARM_STATUS_OPTIONS,
  _stayContext?: LeadStage | LeadQueue | null,
): WarmStatusGroup[] {
  void _stayContext;
  const groups: WarmStatusGroup[] = [
    {
      id: "warm",
      label: "Warm",
      options: sortStatusOptionsByLabel(
        options.filter((option) => option.stage === "warm"),
      ),
    },
    {
      id: "cold",
      label: "Cold",
      options: sortStatusOptionsByLabel(
        options.filter((option) => option.stage === "cold"),
      ),
    },
    {
      id: "onboarded",
      label: "Onboarded",
      options: sortStatusOptionsByLabel(
        options.filter((option) => option.stage === "onboarded"),
      ),
    },
    {
      id: "archive",
      label: "Archives",
      options: sortStatusOptionsByLabel(
        options.filter((option) => option.stage === "archive"),
      ),
    },
    {
      id: "general",
      label: "General (stay in current)",
      options: sortStatusOptionsByLabel(
        options.filter((option) => option.stage == null),
      ),
    },
  ];
  return groups.filter((group) => group.options.length > 0);
}

export const WARM_STATUS_RESULT_GROUPS = groupWarmStatusOptions(
  WARM_STATUS_RESULT_OPTIONS,
);

export function warmStatusOptionByValue(value?: string | null) {
  return WARM_STATUS_OPTIONS.find((option) => option.value === value);
}

/** Parse stored warmStatus into option + optional specify text. */
export function parseWarmStatus(raw?: string | null): {
  value: WarmStatusValue | "";
  detail: string;
} {
  const text = raw?.trim() || "";
  if (!text) return { value: "", detail: "" };

  for (const option of WARM_STATUS_OPTIONS) {
    if (text === option.label) {
      return { value: option.value, detail: "" };
    }
    const prefix = `${option.label}:`;
    if (text.startsWith(prefix)) {
      return {
        value: option.value,
        detail: text.slice(prefix.length).trim(),
      };
    }
  }

  // Legacy free-text statuses map into Other.
  return { value: "other", detail: text };
}

export function isEmailTrackingWarmStatus(value?: string | null): boolean {
  const parsed = parseWarmStatus(value);
  return (WARM_STATUS_EMAIL_TRACKING_VALUES as readonly string[]).includes(
    parsed.value,
  );
}

export function formatWarmStatusForSave(
  value: WarmStatusValue | "",
  detail: string,
): string {
  const option = warmStatusOptionByValue(value);
  if (!option) return "";
  if (!option.requiresDetail) return option.label;
  const note = detail.trim();
  return note ? `${option.label}: ${note}` : option.label;
}

export function resolveStageForWarmStatus(
  value: WarmStatusValue | "",
  currentStage: LeadStage,
): LeadStage {
  const option = warmStatusOptionByValue(value);
  if (option?.stage) return option.stage;
  // Stay in the lead's current queue (Warm, Cold, etc.).
  return currentStage;
}

/** Demo Scheduled reopens Warm after a missed demo. Other Warm statuses do not. */
export function isWarmReengageStatus(
  value: WarmStatusValue | string | "" | null | undefined,
): boolean {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase().replace(/_/g, " ");
  return (
    normalized === "demo scheduled" ||
    normalized.startsWith("demo scheduled:")
  );
}

/** Auto-archive thresholds by attempt track. */
export const WARM_ATTEMPT_ARCHIVE_THRESHOLD = 8;
export const COLD_ATTEMPT_ARCHIVE_THRESHOLD = 3;

/** @deprecated Use WARM_ATTEMPT_ARCHIVE_THRESHOLD */
export const LEAD_ARCHIVE_ATTEMPT_THRESHOLD = WARM_ATTEMPT_ARCHIVE_THRESHOLD;
/** @deprecated Use WARM_ATTEMPT_ARCHIVE_THRESHOLD */
export const LEAD_COLD_ATTEMPT_THRESHOLD = WARM_ATTEMPT_ARCHIVE_THRESHOLD;

export const MISSED_DEMO_STATUS_LABEL = "Missed Demo";

export type LeadQueueBucket = "warm" | "cold" | "onboarded" | "archive";
export type LeadAttemptTrack = "warm" | "cold" | "none";
export type AttemptSeverity = "none" | "mild" | "warning" | "severe";

export function leadQueueBucket(
  stage: LeadStage | string | null | undefined,
): LeadQueueBucket {
  switch (stage) {
  case "cold":
    return "cold";
  case "onboarded":
    return "onboarded";
  case "archive":
    return "archive";
  case "inquire":
  case "warm":
  case "registered":
  default:
    return "warm";
  }
}

/**
 * Which attempt counter to bump for a from→to queue move.
 * Counts: warm→warm, warm→cold, onboarded→warm, cold→cold
 * (and warm/cold → archive when the bump itself triggers archive).
 * No count: cold→warm, cold→onboarded, warm→onboarded, onboarded→cold.
 */
export function resolveAttemptBumpTrack(
  fromStage: LeadStage | string,
  toStage: LeadStage | string,
): LeadAttemptTrack {
  const from = leadQueueBucket(fromStage);
  const to = leadQueueBucket(toStage);

  if (from === "warm" && (to === "warm" || to === "cold" || to === "archive")) {
    return "warm";
  }
  if (from === "onboarded" && to === "warm") return "warm";
  if (from === "cold" && (to === "cold" || to === "archive")) return "cold";
  return "none";
}

export function readWarmAttemptCount(lead: {
  warmAttemptCount?: number;
  attemptCount?: number;
}): number {
  if (lead.warmAttemptCount != null && Number.isFinite(Number(lead.warmAttemptCount))) {
    return Math.max(0, Number(lead.warmAttemptCount));
  }
  return Math.max(0, Number(lead.attemptCount) || 0);
}

export function readColdAttemptCount(lead: {
  coldAttemptCount?: number;
}): number {
  if (lead.coldAttemptCount != null && Number.isFinite(Number(lead.coldAttemptCount))) {
    return Math.max(0, Number(lead.coldAttemptCount));
  }
  return 0;
}

/** Attempt count shown for the lead's current queue. */
export function displayAttemptCount(lead: {
  stage: LeadStage;
  warmAttemptCount?: number;
  coldAttemptCount?: number;
  attemptCount?: number;
}): { count: number; track: "warm" | "cold"; threshold: number } {
  const bucket = leadQueueBucket(lead.stage);
  if (bucket === "cold") {
    return {
      count: readColdAttemptCount(lead),
      track: "cold",
      threshold: COLD_ATTEMPT_ARCHIVE_THRESHOLD,
    };
  }
  return {
    count: readWarmAttemptCount(lead),
    track: "warm",
    threshold: WARM_ATTEMPT_ARCHIVE_THRESHOLD,
  };
}

export function attemptSeverity(
  count: number,
  track: "warm" | "cold",
): AttemptSeverity {
  const n = Math.max(0, Number(count) || 0);
  if (n <= 0) return "none";
  if (track === "cold") {
    if (n >= COLD_ATTEMPT_ARCHIVE_THRESHOLD) return "severe";
    if (n === 2) return "warning";
    return "mild";
  }
  // warm track toward 8
  if (n >= 7) return "severe";
  if (n >= 4) return "warning";
  return "mild";
}

export function attemptSeverityClassName(severity: AttemptSeverity): string {
  switch (severity) {
  case "mild":
    return "text-emerald-700";
  case "warning":
    return "text-amber-700";
  case "severe":
    return "text-rose-700 font-semibold";
  default:
    return "text-zinc-600";
  }
}

export function isMissedDemoValue(attendedDemo?: string | null): boolean {
  return normalizeDemoStatus(attendedDemo) === "missed";
}

export function shouldAutoMoveLeadToCold(input: {
  attendedDemo?: string | null;
  warmStatusValue?: WarmStatusValue | string | "" | null;
}): boolean {
  if (isWarmReengageStatus(input.warmStatusValue)) return false;
  return isMissedDemoValue(input.attendedDemo);
}

export function shouldAutoMoveLeadToArchive(input: {
  warmAttemptCount: number;
  coldAttemptCount: number;
}): boolean {
  return (
    Math.max(0, Number(input.warmAttemptCount) || 0) >=
      WARM_ATTEMPT_ARCHIVE_THRESHOLD ||
    Math.max(0, Number(input.coldAttemptCount) || 0) >=
      COLD_ATTEMPT_ARCHIVE_THRESHOLD
  );
}

/**
 * Stage after a status update:
 * 1. Onboarded (Subscribed) wins
 * 2. Explicit Archives status wins
 * 3. Warm attempts ≥8 or cold attempts ≥3 → Archives
 * 4. Warm re-engage (Demo Scheduled, etc.) wins over a previous missed demo
 * 5. Missed demo → Cold
 * 6. Else Warm / Cold / stay from status
 */
export function resolveStageAfterStatusUpdate(input: {
  warmStatusValue: WarmStatusValue | "";
  currentStage: LeadStage;
  attendedDemo?: string | null;
  warmAttemptCount: number;
  coldAttemptCount: number;
}): LeadStage {
  const fromStatus = resolveStageForWarmStatus(
    input.warmStatusValue,
    input.currentStage,
  );
  if (fromStatus === "onboarded") {
    return fromStatus;
  }
  if (fromStatus === "archive") {
    return "archive";
  }
  if (
    shouldAutoMoveLeadToArchive({
      warmAttemptCount: input.warmAttemptCount,
      coldAttemptCount: input.coldAttemptCount,
    })
  ) {
    return "archive";
  }
  if (shouldAutoMoveLeadToCold({
    attendedDemo: input.attendedDemo,
    warmStatusValue: input.warmStatusValue,
  })) {
    return "cold";
  }
  return fromStatus;
}

/** Preview next attempt counts if a bump is applied for from→to. */
export function previewAttemptCounts(input: {
  fromStage: LeadStage;
  toStage: LeadStage;
  warmAttemptCount: number;
  coldAttemptCount: number;
  countAsNewAttempt: boolean;
}): {
  warmAttemptCount: number;
  coldAttemptCount: number;
  track: LeadAttemptTrack;
} {
  const track =
    input.countAsNewAttempt ?
      resolveAttemptBumpTrack(input.fromStage, input.toStage)
    : "none";
  return {
    warmAttemptCount:
      track === "warm" ? input.warmAttemptCount + 1 : input.warmAttemptCount,
    coldAttemptCount:
      track === "cold" ? input.coldAttemptCount + 1 : input.coldAttemptCount,
    track,
  };
}

/** When demo is missed, force Missed Demo status (unless Archives). */
export function resolveWarmStatusAfterDemoChange(input: {
  attendedDemo?: string | null;
  warmStatusValue: WarmStatusValue | "";
  warmAttemptCount: number;
  coldAttemptCount: number;
}): WarmStatusValue | "" {
  if (
    warmStatusOptionByValue(input.warmStatusValue)?.stage === "archive" ||
    shouldAutoMoveLeadToArchive({
      warmAttemptCount: input.warmAttemptCount,
      coldAttemptCount: input.coldAttemptCount,
    })
  ) {
    return input.warmStatusValue;
  }
  if (isMissedDemoValue(input.attendedDemo)) {
    return "missed_demo";
  }
  return input.warmStatusValue;
}

export function autoQueueMoveHint(input: {
  attendedDemo?: string | null;
  warmAttemptCount: number;
  coldAttemptCount: number;
  bumpTrack?: LeadAttemptTrack;
  warmStatusValue?: WarmStatusValue | string | "" | null;
}): string | null {
  const missed = isMissedDemoValue(input.attendedDemo);
  const atArchive = shouldAutoMoveLeadToArchive({
    warmAttemptCount: input.warmAttemptCount,
    coldAttemptCount: input.coldAttemptCount,
  });
  if (atArchive) {
    if (
      input.warmAttemptCount >= WARM_ATTEMPT_ARCHIVE_THRESHOLD &&
      input.coldAttemptCount >= COLD_ATTEMPT_ARCHIVE_THRESHOLD
    ) {
      return "Attempt limit reached — will move to Archives.";
    }
    if (input.warmAttemptCount >= WARM_ATTEMPT_ARCHIVE_THRESHOLD) {
      return `${WARM_ATTEMPT_ARCHIVE_THRESHOLD}+ warm attempts — will move to Archives.`;
    }
    return `${COLD_ATTEMPT_ARCHIVE_THRESHOLD}+ cold attempts — will move to Archives.`;
  }
  if (missed && !isWarmReengageStatus(input.warmStatusValue)) {
    return "Missed demo — status set to Missed Demo and moves to Cold leads.";
  }
  if (input.bumpTrack === "none") {
    return "This status change does not count as a contact attempt.";
  }
  return null;
}

/** @deprecated Use autoQueueMoveHint */
export function autoColdMoveHint(input: {
  attendedDemo?: string | null;
  attemptCount?: number;
  warmAttemptCount?: number;
  coldAttemptCount?: number;
}): string | null {
  return autoQueueMoveHint({
    attendedDemo: input.attendedDemo,
    warmAttemptCount: input.warmAttemptCount ?? input.attemptCount ?? 0,
    coldAttemptCount: input.coldAttemptCount ?? 0,
  });
}

export const inputClassName =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

export const labelClassName = "mb-1 block text-xs font-medium text-zinc-600";

export function formatLeadDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Date fields that are N/A when the event never happened. */
export function formatLeadMilestoneDate(value?: string | null): string {
  if (!value) return "N/A";
  const formatted = formatLeadDate(value);
  return formatted === "—" ? "N/A" : formatted;
}

export function resolveInquiredAt(lead: {
  inquiredAt?: string | null;
  sourceKind?: string | null;
  firstContactAt?: string | null;
  createdAt?: string | null;
}): string | null {
  if (lead.inquiredAt) return lead.inquiredAt;
  if (
    lead.sourceKind === "inquiry" ||
    lead.sourceKind === "demo_request" ||
    lead.sourceKind === "business_inquiry"
  ) {
    return lead.firstContactAt || lead.createdAt || null;
  }
  return null;
}

export function resolveRegisteredAt(lead: {
  registeredAt?: string | null;
  stage?: string | null;
  platformRole?: string | null;
  leadSource?: string | null;
  createdAt?: string | null;
}): string | null {
  if (lead.registeredAt) return lead.registeredAt;
  const role = lead.platformRole?.trim();
  const source = lead.leadSource?.trim();
  if (
    lead.stage === "registered" ||
    lead.stage === "onboarded" ||
    role === "Registered" ||
    role === "Owner" ||
    role === "Staff" ||
    source === "Registered account" ||
    source === "SmartRefill workspace" ||
    source === "SmartRefill legacy station"
  ) {
    return lead.createdAt || null;
  }
  return null;
}

export function stageBadgeClass(stage: string): string {
  switch (stage) {
  case "onboarded":
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  case "registered":
    return "border-teal-200 bg-teal-50 text-teal-800";
  case "warm":
  case "inquire":
    return "border-amber-200 bg-amber-50 text-amber-900";
  case "cold":
    return "border-sky-200 bg-sky-50 text-sky-900";
  case "archive":
    return "border-zinc-200 bg-zinc-100 text-zinc-600";
  default:
    return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

export function platformSourceLabel(
  source?: "smartrefill" | "smartrefill_legacy" | null,
): string {
  if (source === "smartrefill_legacy") return "SmartRefill legacy";
  if (source === "smartrefill") return "SmartRefill";
  return "—";
}

export function platformSourceBadgeClass(
  source?: "smartrefill" | "smartrefill_legacy" | null,
): string {
  if (source === "smartrefill_legacy") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (source === "smartrefill") {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

export function platformRoleLabel(role?: string | null): string {
  if (!role || !role.trim() || role.trim() === "—") return "—";
  return role.trim();
}

/** Platform membership / signup status under Platform. */
export function platformMembershipLabel(role?: string | null): string | null {
  const normalized = platformRoleLabel(role);
  if (
    normalized === "Owner" ||
    normalized === "Staff" ||
    normalized === "Prospect" ||
    normalized === "Registered"
  ) {
    return normalized;
  }
  return null;
}

export function platformSourceToneClass(
  source?: "smartrefill" | "smartrefill_legacy" | null,
): string {
  if (source === "smartrefill_legacy") return "text-amber-800";
  if (source === "smartrefill") return "text-teal-800";
  return "text-zinc-700";
}

export function formatCustomerCount(count?: number | null): string | null {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return null;
  }
  const n = Math.floor(count);
  return `${n.toLocaleString()} customer${n === 1 ? "" : "s"}`;
}

export function leadChannelLabels(channels: {
  viber?: boolean;
  email?: boolean;
  messenger?: boolean;
  smsCall?: boolean;
}): string[] {
  const labels: string[] = [];
  if (channels.viber) labels.push("Viber");
  if (channels.email) labels.push("Email");
  if (channels.messenger) labels.push("Messenger");
  if (channels.smsCall) labels.push("SMS / Call");
  return labels;
}

export function formatLeadChannels(channels: {
  viber?: boolean;
  email?: boolean;
  messenger?: boolean;
  smsCall?: boolean;
}): string {
  const labels = leadChannelLabels(channels);
  return labels.length ? labels.join(" · ") : "—";
}

export function leadContactStatus(lead: {
  warmStatus?: string;
  stallReason?: string;
}): string {
  const status = lead.warmStatus?.trim();
  if (status) return status;
  return "—";
}

export function leadLatestNote(lead: {
  notes?: string;
  stallReason?: string;
}): string {
  const note = lead.notes?.trim() || lead.stallReason?.trim();
  return note || "—";
}

export function resolveSalesMemberLabel(
  uid: string | undefined,
  nameByUid: Map<string, string>,
): string {
  if (!uid) return "—";
  return nameByUid.get(uid) || uid;
}

export const LEAD_ACQUISITION_SOURCES = [
  "FB Ads",
  "Website",
  "Referrals",
] as const;

export type LeadAcquisitionSource = (typeof LEAD_ACQUISITION_SOURCES)[number];

export const DEMO_STATUS_OPTIONS = [
  { value: "attended", label: "Attended" },
  { value: "missed", label: "Missed" },
  { value: "not_needed", label: "Not needed" },
  { value: "not_applicable", label: "Not applicable" },
] as const;

export type DemoStatus = (typeof DEMO_STATUS_OPTIONS)[number]["value"];

export function isAcquisitionSource(
  value?: string | null,
): value is LeadAcquisitionSource {
  return LEAD_ACQUISITION_SOURCES.includes(value as LeadAcquisitionSource);
}

export function demoStatusLabel(value?: string | null): string {
  switch (value) {
  case "attended":
  case "yes":
  case "live":
    return "Attended";
  case "missed":
  case "no":
    return "Missed";
  case "not_needed":
    return "Not needed";
  case "not_applicable":
    return "Not applicable";
  default:
    return "—";
  }
}

export function demoStatusToneClass(value?: string | null): string {
  switch (value) {
  case "attended":
  case "yes":
  case "live":
    return "text-emerald-800";
  case "missed":
  case "no":
    return "text-red-700";
  case "not_needed":
    return "text-zinc-600";
  case "not_applicable":
    return "text-zinc-500";
  default:
    return "text-zinc-400";
  }
}

/** Normalize legacy demo values for form selects. */
export function normalizeDemoStatus(
  value?: string | null,
): DemoStatus | "" {
  switch (value) {
  case "attended":
  case "yes":
  case "live":
    return "attended";
  case "missed":
  case "no":
    return "missed";
  case "not_needed":
    return "not_needed";
  case "not_applicable":
    return "not_applicable";
  default:
    return "";
  }
}

export function formatLeadSourceLine(lead: {
  leadSource?: string;
  sourceWebsite?: string;
  referredBy?: string;
  referredByAffiliateCode?: string;
  contentSources?: Array<"webinar" | "training" | "article" | "story">;
}): string {
  const source = lead.leadSource?.trim();
  const content = formatContentSourcesLine(lead.contentSources);
  let base = "—";
  if (source) {
    if (source === "Website") {
      const site = lead.sourceWebsite?.trim();
      base = site ? `Website · ${site}` : "Website";
    } else if (source === "Referrals") {
      const who = lead.referredBy?.trim();
      const code = lead.referredByAffiliateCode?.trim();
      if (who && code) base = `Referrals · ${who} · ${code}`;
      else if (who) base = `Referrals · ${who}`;
      else if (code) base = `Referrals · ${code}`;
      else base = "Referrals";
    } else {
      base = source;
    }
  }
  if (!content) return base;
  if (base === "—" || base === content) return content;
  if (base.includes(content)) return base;
  return `${base} · ${content}`;
}

const CONTENT_SOURCE_LABELS: Record<
  "webinar" | "training" | "article" | "story",
  string
> = {
  webinar: "Webinar",
  training: "Training",
  article: "Article",
  story: "Story",
};

export function formatContentSourcesLine(
  sources?: Array<"webinar" | "training" | "article" | "story"> | null,
): string {
  if (!sources?.length) return "";
  const unique: string[] = [];
  for (const source of sources) {
    const label = CONTENT_SOURCE_LABELS[source];
    if (label && !unique.includes(label)) unique.push(label);
  }
  return unique.join(" · ");
}

export function isContentPipelineLead(lead: {
  sourceKind?: string | null;
  contentSources?: string[] | null;
}): boolean {
  if (lead.sourceKind === "content") return true;
  return Array.isArray(lead.contentSources) && lead.contentSources.length > 0;
}

export function formatAccountReadyLine(lead: {
  accountReady?: boolean;
  workspace?: { accountReady?: boolean; planName?: string };
}): string {
  const ready = Boolean(lead.accountReady ?? lead.workspace?.accountReady);
  if (!ready) return "No";
  const plan = lead.workspace?.planName?.trim();
  return plan || "Yes";
}

export function onboardedMonitorFlagLabel(
  flag: import("@/lib/definitions").OnboardedMonitorFlag,
): string {
  switch (flag) {
  case "journey_inactive_day8":
    return "Day 8 inactive";
  case "recommend_move_to_cold":
    return "Move to cold?";
  case "subscription_expiring_soon":
    return "Expires in ≤7 days";
  case "subscription_grace_period":
    return "In grace period";
  case "subscription_renew":
    return "Plan renewed";
  case "subscription_change":
    return "Plan changed";
  }
}

export function onboardedMonitorFlagToneClass(
  flag: import("@/lib/definitions").OnboardedMonitorFlag,
): string {
  switch (flag) {
  case "journey_inactive_day8":
    return "bg-amber-50 text-amber-900";
  case "recommend_move_to_cold":
    return "bg-sky-50 text-sky-900";
  case "subscription_grace_period":
    return "bg-red-50 text-red-800";
  case "subscription_expiring_soon":
    return "bg-orange-50 text-orange-900";
  case "subscription_renew":
    return "bg-emerald-50 text-emerald-900";
  case "subscription_change":
    return "bg-violet-50 text-violet-900";
  }
}

/** Compact journey progress for onboarded cards (Getting started checklist + login days). */
export function formatOnboardedJourneyChip(
  monitor: import("@/lib/definitions").OnboardedMonitor | undefined,
): string | null {
  if (!monitor) return null;
  const setup = `Setup ${monitor.gettingStartedCompleted}/9`;
  const activeDays = `${monitor.activityDayCount} active days`;
  if (monitor.journeyPhase === "graduated") {
    return `Graduated · ${setup} · ${activeDays}`;
  }
  const dayLabel =
    monitor.journeyDay <= 15 ? `Day ${monitor.journeyDay}/15` : `Day ${monitor.journeyDay}`;
  return `${dayLabel} · ${setup} · ${activeDays}`;
}

/**
 * Owner last sign-in from Firebase Auth (`lastSignInAt`), or legacy
 * login_events day (`lastActiveDay` / `YYYY-MM-DD`).
 */
export function formatLastSignIn(
  lastSignInAt?: string | null,
  lastActiveDayFallback?: string | null,
): string {
  const raw = lastSignInAt?.trim() || lastActiveDayFallback?.trim() || "";
  if (!raw) return "Never";
  // calendarDayUtc is date-only; parse as UTC noon to avoid timezone day-shift
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00.000Z` : raw;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Resolve Auth last sign-in for display on onboarded leads. */
export function resolveLeadLastSignIn(lead: {
  lastSignInAt?: string | null;
  lastActiveDay?: string | null;
}): string {
  return formatLastSignIn(lead.lastSignInAt, lead.lastActiveDay);
}

export const   LEAD_HISTORY_FIELD_LABELS: Record<string, string> = {
  businessName: "Business",
  ownerName: "Owner",
  email: "Email",
  phone: "Phone",
  address: "Address",
  stage: "Stage",
  attemptCount: "Attempts",
  assignedToUid: "Assignee",
  lastContactAt: "Last contact",
  lastContactedByUid: "Contacted by",
  nextFollowUpAt: "Follow-up",
  attendedDemo: "Demo",
  warmStatus: "Status",
  stallReason: "Note",
  notes: "Note",
  leadSource: "Source",
  sourceWebsite: "Website",
  referredBy: "Referred by",
  referredByClientId: "Referrer client",
  referredByUserId: "Referrer account",
  referredByAffiliateId: "Affiliate",
  referredByAffiliateCode: "Affiliate code",
  accountReady: "Account ready",
  linkedBusinessId: "Business ID",
  channels: "Channels",
  lastOutreachMessageId: "Outreach message",
  lastOutreachOpenedAt: "Email opened at",
  inquiredAt: "Date inquire",
  registeredAt: "Date registered",
};

export function leadHistoryFieldLabel(field: string): string {
  return LEAD_HISTORY_FIELD_LABELS[field] || field;
}
