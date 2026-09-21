import { db, FieldValue } from "../config/firebase-admin";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  canAccessOwner,
  resolveAccessibleUserIds,
  type SalesActor,
} from "./sales-scope";
import { serializeDoc, toIsoString } from "./sales-serializer";
import {
  evaluateOnboardedJourney,
  evaluateOnboardedJourneyFromSnapshot,
  type OnboardedMonitor,
} from "./onboarded-journey-monitor";
import { loadOnboardedBusinessSnapshot } from "./load-onboarded-snapshot";
import { stampPipelineAffiliateOnPayingSubscription } from "./stamp-pipeline-affiliate";
import { mapWithConcurrency } from "../utils/map-with-concurrency";
import { buildSmartRefillPipelineLeads } from "./build-smartrefill-pipeline-leads";
import {
  assigneeWriteFields,
  leadHasAssignee,
  mergeAssigneeUids,
  normalizeAssigneeUids,
  removeAssigneeUids,
  resolveAssigneeUids,
} from "../lib/lead-assignees";

export type LeadStage =
  | "inquire"
  | "warm"
  | "cold"
  | "registered"
  | "onboarded"
  | "archive";

export type LeadQueue =
  | "all"
  | "content"
  | "warm"
  | "cold"
  | "onboarded"
  | "archive";

export type AttendedDemo =
  | "attended"
  | "missed"
  | "not_needed"
  | "not_applicable";

/** CRM acquisition channels (pipeline origin labels may still appear on leadSource). */
export const LEAD_ACQUISITION_SOURCES = [
  "FB Ads",
  "Website",
  "Referrals",
] as const;

export type LeadAcquisitionSource = (typeof LEAD_ACQUISITION_SOURCES)[number];

export type LeadSourceKind =
  | "inquiry"
  | "demo_request"
  | "business_inquiry"
  | "manual"
  | "content";

export type LeadContentSource =
  | "webinar"
  | "training"
  | "article"
  | "story";

/** Which SmartRefill database the row was loaded from. */
export type LeadPlatformSource = "smartrefill" | "smartrefill_legacy";

export type LeadChannels = {
  viber: boolean;
  email: boolean;
  messenger: boolean;
  smsCall: boolean;
};

export type LeadWorkspaceOverlay = {
  planName?: string;
  planCode?: string;
  billingCycle?: string;
  price?: number;
  trialDaysLeft?: number | null;
  onboardingComplete?: boolean;
  accountReady?: boolean;
};

export type {
  OnboardedJourneyPhase,
  OnboardedMonitor,
  OnboardedMonitorFlag,
} from "./onboarded-journey-monitor";

export type LeadRecord = {
  id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  email?: string;
  phone?: string;
  address?: string;
  stage: LeadStage;
  /** Legacy total; kept as warmAttemptCount + coldAttemptCount. */
  attemptCount: number;
  warmAttemptCount: number;
  coldAttemptCount: number;
  /** Canonical multi-assignee list. */
  assignedToUids?: string[];
  /** Legacy primary assignee — first of `assignedToUids` (or undefined). */
  assignedToUid?: string;
  firstContactAt?: string | null;
  lastContactAt?: string | null;
  /** Sales account who made the latest contact. */
  lastContactedByUid?: string;
  nextFollowUpAt?: string | null;
  attendedDemo?: AttendedDemo;
  warmStatus?: string;
  stallReason?: string;
  channels: LeadChannels;
  leadSource?: string;
  /** Which website when leadSource is Website. */
  sourceWebsite?: string;
  /** Who referred when leadSource is Referrals (display label). */
  referredBy?: string;
  /** CRM client id when referral is linked to an account/business. */
  referredByClientId?: string;
  /** Platform user id when referral is linked to a directory account. */
  referredByUserId?: string;
  referredByAffiliateId?: string;
  referredByAffiliateCode?: string;
  referredByEmail?: string;
  contentReferrer?: string;
  notes?: string;
  linkedBusinessId?: string;
  sourceKind?: LeadSourceKind;
  /** `smartrefill` = riverdb · `smartrefill_legacy` = prod-smartrefill */
  platformSource?: LeadPlatformSource;
  /** Role on that platform (e.g. owner, staff, registered, prospect). */
  platformRole?: string;
  accountReady?: boolean;
  dataImported?: "yes" | "no" | "in_progress";
  trainingPhase?: "phase_1" | "phase_2";
  /** When the prospect inquired / requested a demo. */
  inquiredAt?: string | null;
  /** When the account was registered. */
  registeredAt?: string | null;
  /** Total customers on the account when known. */
  customerCount?: number;
  /** Latest Brevo transactional message id from follow-up email. */
  lastOutreachMessageId?: string;
  /** When Brevo reported the follow-up email was opened. */
  lastOutreachOpenedAt?: string | null;
  /** Journey start for onboarded monitor. */
  onboardedAt?: string | null;
  gettingStartedCompleted?: number;
  activityDayCount?: number;
  lastActiveDay?: string | null;
  /** Firebase Auth last sign-in (`metadata.lastSignInTime`). */
  lastSignInAt?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
  subscriptionChangeType?: string | null;
  planName?: string;
  planCode?: string;
  billingCycle?: string;
  price?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdByUid?: string;
  /** Set when row was inserted/updated by pipeline gather. */
  pipelineGathered?: boolean;
  /** Webinar / training / article / story activity (Content leads tab). */
  contentSources?: LeadContentSource[];
  contentSummary?: string;
  workspace?: LeadWorkspaceOverlay;
  /** Computed Day 1–15 + subscription monitor (ephemeral on list/get). */
  onboardedMonitor?: OnboardedMonitor;
};

export type CreateLeadInput = {
  businessName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  stage?: LeadStage;
  attemptCount?: number;
  assignedToUid?: string;
  assignedToUids?: string[];
  firstContactAt?: string | null;
  lastContactAt?: string | null;
  lastContactedByUid?: string;
  nextFollowUpAt?: string | null;
  attendedDemo?: AttendedDemo;
  warmStatus?: string;
  stallReason?: string;
  channels?: Partial<LeadChannels>;
  leadSource?: string;
  sourceWebsite?: string;
  referredBy?: string;
  referredByClientId?: string;
  referredByUserId?: string;
  referredByAffiliateId?: string;
  referredByAffiliateCode?: string;
  referredByEmail?: string;
  contentReferrer?: string;
  notes?: string;
  linkedBusinessId?: string;
  sourceKind?: LeadSourceKind;
  accountReady?: boolean;
  dataImported?: "yes" | "no" | "in_progress";
  trainingPhase?: "phase_1" | "phase_2";
  inquiredAt?: string | null;
  registeredAt?: string | null;
  lastOutreachMessageId?: string | null;
  lastOutreachOpenedAt?: string | null;
};

export type UpdateLeadInput = CreateLeadInput & {
  bumpAttempt?: boolean;
  attendedDemo?: AttendedDemo | null;
};

export type LeadAnalytics = {
  funnel: Array<{ stage: LeadStage; count: number }>;
  bySource: Array<{ name: string; count: number }>;
  byAssignee: Array<{
    assignedToUid: string;
    count: number;
    overdueFollowUps: number;
  }>;
  queueCounts: Record<LeadQueue, number>;
  trialRisk: {
    daysLeftZero: number;
    daysLeftLte3: number;
  };
  stallReasons: Array<{ name: string; count: number }>;
};

const VALID_STAGES = new Set<LeadStage>([
  "inquire",
  "warm",
  "cold",
  "registered",
  "onboarded",
  "archive",
]);

const VALID_DEMO = new Set<AttendedDemo>([
  "attended",
  "missed",
  "not_needed",
  "not_applicable",
]);

/** Map legacy demo values stored before the attended/missed model. */
export function normalizeAttendedDemo(raw: unknown): AttendedDemo | undefined {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return undefined;
  const legacy: Record<string, AttendedDemo> = {
    yes: "attended",
    live: "attended",
    no: "missed",
    attended: "attended",
    missed: "missed",
    not_needed: "not_needed",
    not_applicable: "not_applicable",
  };
  return legacy[value];
}

export const LEAD_ARCHIVE_ATTEMPT_THRESHOLD = 8;
export const WARM_ATTEMPT_ARCHIVE_THRESHOLD = 8;
export const COLD_ATTEMPT_ARCHIVE_THRESHOLD = 3;
export const MISSED_DEMO_STATUS_LABEL = "Missed Demo";

const WARM_REENGAGE_STATUS_PREFIXES = ["demo scheduled"];

/** Warm-queue statuses that reopen a missed-demo loop (another demo, follow-up). */
export function isWarmReengageStatus(status?: string | null): boolean {
  const value = (status || "").trim().toLowerCase();
  if (!value || value === "missed demo" || value.startsWith("missed demo")) {
    return false;
  }
  return WARM_REENGAGE_STATUS_PREFIXES.some(
    (prefix) => value === prefix || value.startsWith(`${prefix}`),
  );
}

export type LeadAttemptTrack = "warm" | "cold" | "none";

export function resolveAttemptBumpTrack(
  fromStage: LeadStage | string,
  toStage: LeadStage | string,
): LeadAttemptTrack {
  const from = queueForStage(fromStage as LeadStage);
  const to = queueForStage(toStage as LeadStage);

  if (from === "warm" && (to === "warm" || to === "cold" || to === "archive")) {
    return "warm";
  }
  if (from === "onboarded" && to === "warm") return "warm";
  if (from === "cold" && (to === "cold" || to === "archive")) return "cold";
  return "none";
}

/**
 * Enforce queue rules on lead updates:
 * - Subscribed / onboarded stage wins
 * - Warm attempts ≥8 or cold attempts ≥3 → archive
 * - Missed demo → cold + Missed Demo status, unless they re-engage
 *   (Demo Scheduled / other Warm statuses) — then Warm and clear missed
 */
export function applyLeadAutoQueueRules(input: {
  existing: Pick<
    LeadRecord,
    | "attemptCount"
    | "warmAttemptCount"
    | "coldAttemptCount"
    | "attendedDemo"
    | "warmStatus"
    | "stage"
  >;
  patch: Record<string, unknown>;
}): void {
  const { existing, patch } = input;

  const warmAttempts =
    typeof patch.warmAttemptCount === "number" &&
    Number.isFinite(patch.warmAttemptCount) ?
      Math.max(0, patch.warmAttemptCount) :
      Math.max(0, Number(existing.warmAttemptCount) || 0);
  const coldAttempts =
    typeof patch.coldAttemptCount === "number" &&
    Number.isFinite(patch.coldAttemptCount) ?
      Math.max(0, patch.coldAttemptCount) :
      Math.max(0, Number(existing.coldAttemptCount) || 0);

  const demoRaw =
    patch.attendedDemo !== undefined ? patch.attendedDemo : existing.attendedDemo;
  const nextDemo = normalizeAttendedDemo(demoRaw);

  const nextWarmStatus =
    typeof patch.warmStatus === "string" ?
      patch.warmStatus.trim() :
      (existing.warmStatus || "").trim();
  const nextStage =
    typeof patch.stage === "string" ? patch.stage : existing.stage;

  const goingOnboarded =
    nextStage === "onboarded" || nextWarmStatus === "Subscribed";
  if (goingOnboarded) {
    patch.stage = "onboarded";
    return;
  }

  if (
    warmAttempts >= WARM_ATTEMPT_ARCHIVE_THRESHOLD ||
    coldAttempts >= COLD_ATTEMPT_ARCHIVE_THRESHOLD
  ) {
    patch.stage = "archive";
    return;
  }

  if (nextDemo === "missed") {
    const patchedStatus =
      typeof patch.warmStatus === "string" ? patch.warmStatus.trim() : "";
    if (isWarmReengageStatus(patchedStatus)) {
      patch.attendedDemo = null;
      if (
        nextStage !== "warm" &&
        nextStage !== "inquire" &&
        nextStage !== "registered"
      ) {
        patch.stage = "warm";
      }
      return;
    }
    patch.attendedDemo = "missed";
    patch.stage = "cold";
    patch.warmStatus = MISSED_DEMO_STATUS_LABEL;
  }
}

const VALID_SOURCE_KIND = new Set<LeadSourceKind>([
  "inquiry",
  "demo_request",
  "business_inquiry",
  "manual",
  "content",
]);
const VALID_CONTENT_SOURCE = new Set<LeadContentSource>([
  "webinar",
  "training",
  "article",
  "story",
]);
const VALID_DATA_IMPORTED = new Set(["yes", "no", "in_progress"]);
const VALID_TRAINING = new Set(["phase_1", "phase_2"]);

const EMPTY_CHANNELS: LeadChannels = {
  viber: false,
  email: false,
  messenger: false,
  smsCall: false,
};

const FUNNEL_ORDER: LeadStage[] = [
  "inquire",
  "warm",
  "registered",
  "onboarded",
  "archive",
];

export function stagesForQueue(queue: LeadQueue): LeadStage[] | null {
  switch (queue) {
  case "warm":
    // Inquire/demo + SmartRefill registered without onboarding (+ legacy).
    return ["inquire", "warm", "registered"];
  case "cold":
    return ["cold"];
  case "onboarded":
    // SmartRefill (`riverdb`) only — registered + onboardingComplete.
    return ["onboarded"];
  case "archive":
    return ["archive"];
  case "content":
    // Source-based tab — not a funnel stage.
    return null;
  case "all":
  default:
    return null;
  }
}

export function queueForStage(
  stage: LeadStage,
): Exclude<LeadQueue, "all"> {
  if (stage === "inquire" || stage === "warm" || stage === "registered") {
    return "warm";
  }
  if (stage === "cold") return "cold";
  if (stage === "onboarded") return "onboarded";
  return "archive";
}

export function daysLeftFromExpiresAt(
  expiresAt: string | undefined,
  nowMs = Date.now(),
): number | null {
  if (!expiresAt) return null;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return null;
  return Math.max(0, Math.ceil((expiresMs - nowMs) / 86_400_000));
}

function normalizeChannels(value: unknown): LeadChannels {
  if (!value || typeof value !== "object") return { ...EMPTY_CHANNELS };
  const row = value as Record<string, unknown>;
  return {
    viber: Boolean(row.viber),
    email: Boolean(row.email),
    messenger: Boolean(row.messenger),
    smsCall: Boolean(row.smsCall),
  };
}

function parseContentSources(value: unknown): LeadContentSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sources = value.filter(
    (item): item is LeadContentSource =>
      typeof item === "string" && VALID_CONTENT_SOURCE.has(item as LeadContentSource),
  );
  return sources.length > 0 ? sources : undefined;
}

function leadHasContentActivity(lead: Pick<LeadRecord, "sourceKind" | "contentSources">): boolean {
  return (
    lead.sourceKind === "content" ||
    (Array.isArray(lead.contentSources) && lead.contentSources.length > 0)
  );
}

function optionalIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return toIsoString(value) ?? (typeof value === "string" ? value : null);
}

export function normalizeLead(
  id: string,
  data: Record<string, unknown>,
): LeadRecord {
  const base = serializeDoc<Record<string, unknown>>(id, data);
  const stageRaw = String(base.stage || "inquire");
  const stage = VALID_STAGES.has(stageRaw as LeadStage) ?
    (stageRaw as LeadStage) :
    "inquire";
  const sourceKindRaw = String(base.sourceKind || "");
  const platformRaw = String(base.platformSource || "");
  const dataImportedRaw = String(base.dataImported || "");
  const trainingRaw = String(base.trainingPhase || "");

  return {
    id,
    userId: String(base.userId || ""),
    businessName: String(base.businessName || ""),
    ownerName: String(base.ownerName || ""),
    email: typeof base.email === "string" ? base.email : undefined,
    phone: typeof base.phone === "string" ? base.phone : undefined,
    address: typeof base.address === "string" ? base.address : undefined,
    stage,
    attemptCount: (() => {
      const legacy = Number.isFinite(Number(base.attemptCount)) ?
        Math.max(0, Number(base.attemptCount)) :
        0;
      const warm =
        Number.isFinite(Number(base.warmAttemptCount)) ?
          Math.max(0, Number(base.warmAttemptCount)) :
          legacy;
      const cold =
        Number.isFinite(Number(base.coldAttemptCount)) ?
          Math.max(0, Number(base.coldAttemptCount)) :
          0;
      return warm + cold;
    })(),
    warmAttemptCount: Number.isFinite(Number(base.warmAttemptCount)) ?
      Math.max(0, Number(base.warmAttemptCount)) :
      Number.isFinite(Number(base.attemptCount)) ?
        Math.max(0, Number(base.attemptCount)) :
        0,
    coldAttemptCount: Number.isFinite(Number(base.coldAttemptCount)) ?
      Math.max(0, Number(base.coldAttemptCount)) :
      0,
    assignedToUids: resolveAssigneeUids(base),
    assignedToUid: resolveAssigneeUids(base)[0],
    firstContactAt: optionalIso(base.firstContactAt),
    lastContactAt: optionalIso(base.lastContactAt),
    lastContactedByUid:
      typeof base.lastContactedByUid === "string" &&
      base.lastContactedByUid.trim() ?
        base.lastContactedByUid.trim() :
        undefined,
    nextFollowUpAt: optionalIso(base.nextFollowUpAt),
    attendedDemo: normalizeAttendedDemo(base.attendedDemo),
    warmStatus:
      typeof base.warmStatus === "string" ? base.warmStatus : undefined,
    stallReason:
      typeof base.stallReason === "string" ? base.stallReason : undefined,
    channels: normalizeChannels(base.channels),
    leadSource:
      typeof base.leadSource === "string" ? base.leadSource : undefined,
    sourceWebsite:
      typeof base.sourceWebsite === "string" && base.sourceWebsite.trim() ?
        base.sourceWebsite.trim() :
        undefined,
    referredBy:
      typeof base.referredBy === "string" && base.referredBy.trim() ?
        base.referredBy.trim() :
        undefined,
    referredByClientId:
      typeof base.referredByClientId === "string" &&
      base.referredByClientId.trim() ?
        base.referredByClientId.trim() :
        undefined,
    referredByUserId:
      typeof base.referredByUserId === "string" &&
      base.referredByUserId.trim() ?
        base.referredByUserId.trim() :
        undefined,
    referredByAffiliateId:
      typeof base.referredByAffiliateId === "string" &&
      base.referredByAffiliateId.trim() ?
        base.referredByAffiliateId.trim() :
        undefined,
    referredByAffiliateCode:
      typeof base.referredByAffiliateCode === "string" &&
      base.referredByAffiliateCode.trim() ?
        base.referredByAffiliateCode.trim() :
        undefined,
    referredByEmail:
      typeof base.referredByEmail === "string" && base.referredByEmail.trim() ?
        base.referredByEmail.trim().toLowerCase() :
        undefined,
    contentReferrer:
      typeof base.contentReferrer === "string" && base.contentReferrer.trim() ?
        base.contentReferrer.trim() :
        undefined,
    notes: typeof base.notes === "string" ? base.notes : undefined,
    linkedBusinessId:
      typeof base.linkedBusinessId === "string" && base.linkedBusinessId.trim() ?
        base.linkedBusinessId.trim() :
        undefined,
    sourceKind: VALID_SOURCE_KIND.has(sourceKindRaw as LeadSourceKind) ?
      (sourceKindRaw as LeadSourceKind) :
      undefined,
    platformSource:
      platformRaw === "smartrefill" || platformRaw === "smartrefill_legacy" ?
        (platformRaw as LeadPlatformSource) :
        undefined,
    platformRole:
      typeof base.platformRole === "string" && base.platformRole.trim() ?
        base.platformRole.trim() :
        undefined,
    accountReady:
      typeof base.accountReady === "boolean" ? base.accountReady : undefined,
    dataImported: VALID_DATA_IMPORTED.has(dataImportedRaw) ?
      (dataImportedRaw as LeadRecord["dataImported"]) :
      undefined,
    trainingPhase: VALID_TRAINING.has(trainingRaw) ?
      (trainingRaw as LeadRecord["trainingPhase"]) :
      undefined,
    inquiredAt: optionalIso(base.inquiredAt),
    registeredAt: optionalIso(base.registeredAt),
    customerCount:
      typeof base.customerCount === "number" &&
      Number.isFinite(base.customerCount) &&
      base.customerCount >= 0 ?
        Math.floor(base.customerCount) :
        undefined,
    lastOutreachMessageId:
      typeof base.lastOutreachMessageId === "string" &&
      base.lastOutreachMessageId.trim() ?
        base.lastOutreachMessageId.trim() :
        undefined,
    lastOutreachOpenedAt: optionalIso(base.lastOutreachOpenedAt),
    onboardedAt: optionalIso(base.onboardedAt),
    gettingStartedCompleted: Number.isFinite(Number(base.gettingStartedCompleted)) ?
      Math.max(0, Math.floor(Number(base.gettingStartedCompleted))) :
      undefined,
    activityDayCount: Number.isFinite(Number(base.activityDayCount)) ?
      Math.max(0, Math.floor(Number(base.activityDayCount))) :
      undefined,
    lastActiveDay:
      typeof base.lastActiveDay === "string" && base.lastActiveDay.trim() ?
        base.lastActiveDay.trim() :
        null,
    lastSignInAt: optionalIso(base.lastSignInAt),
    subscriptionStatus:
      typeof base.subscriptionStatus === "string" &&
      base.subscriptionStatus.trim() ?
        base.subscriptionStatus.trim() :
        null,
    subscriptionExpiresAt: optionalIso(base.subscriptionExpiresAt),
    subscriptionChangeType:
      typeof base.subscriptionChangeType === "string" &&
      base.subscriptionChangeType.trim() ?
        base.subscriptionChangeType.trim() :
        null,
    createdAt: optionalIso(base.createdAt),
    updatedAt: optionalIso(base.updatedAt),
    createdByUid:
      typeof base.createdByUid === "string" ? base.createdByUid : undefined,
    pipelineGathered: base.pipelineGathered === true,
    contentSources: parseContentSources(base.contentSources),
    contentSummary:
      typeof base.contentSummary === "string" && base.contentSummary.trim() ?
        base.contentSummary.trim() :
        undefined,
    workspace: workspaceFromPersistedLead(base),
  };
}

function workspaceFromPersistedLead(
  base: Record<string, unknown>,
): LeadWorkspaceOverlay | undefined {
  const nested =
    base.workspace && typeof base.workspace === "object" && !Array.isArray(base.workspace) ?
      (base.workspace as Record<string, unknown>) :
      {};
  const planName =
    typeof nested.planName === "string" ? nested.planName :
      typeof base.planName === "string" ? base.planName :
        undefined;
  const planCode =
    typeof nested.planCode === "string" ? nested.planCode :
      typeof base.planCode === "string" ? base.planCode :
        undefined;
  const billingCycle =
    typeof nested.billingCycle === "string" ? nested.billingCycle :
      typeof base.billingCycle === "string" ? base.billingCycle :
        undefined;
  const priceRaw = nested.price ?? base.price;
  const price = Number(priceRaw);
  const onboardingComplete =
    typeof nested.onboardingComplete === "boolean" ?
      nested.onboardingComplete :
      undefined;
  const accountReady =
    typeof nested.accountReady === "boolean" ? nested.accountReady : undefined;
  const expiresAt =
    typeof nested.trialDaysLeft === "number" ? null :
      typeof base.subscriptionExpiresAt === "string" ? base.subscriptionExpiresAt :
        typeof nested.expiresAt === "string" ? nested.expiresAt :
          null;
  const trialDaysLeft =
    typeof nested.trialDaysLeft === "number" ? nested.trialDaysLeft :
      daysLeftFromExpiresAt(expiresAt ?? undefined);
  const billingCycleLower = (billingCycle || "").toLowerCase();
  const isTrial =
    billingCycleLower === "trial" ||
    (planName || "").toLowerCase().includes("trial");

  if (
    !planName &&
    !planCode &&
    !billingCycle &&
    !Number.isFinite(price) &&
    onboardingComplete === undefined &&
    accountReady === undefined &&
    trialDaysLeft === null
  ) {
    return undefined;
  }
  return {
    planName,
    planCode,
    billingCycle,
    price: Number.isFinite(price) ? price : undefined,
    trialDaysLeft: isTrial || trialDaysLeft !== null ? trialDaysLeft : null,
    onboardingComplete,
    accountReady,
  };
}

export function filterLeads(
  leads: LeadRecord[],
  opts: {
    queue?: LeadQueue;
    stage?: LeadStage;
    assignee?: string;
    q?: string;
  },
): LeadRecord[] {
  const stages = opts.stage ?
    [opts.stage] :
    opts.queue ?
      stagesForQueue(opts.queue) :
      null;
  const assignee = opts.assignee?.trim();
  const q = opts.q?.trim().toLowerCase();

  return leads.filter((lead) => {
    if (opts.queue === "content") {
      if (!leadHasContentActivity(lead)) return false;
    } else if (stages) {
      if (!stages.includes(lead.stage)) return false;
      // Content-only guests live on the Content tab, not Warm.
      if (opts.queue === "warm" && lead.sourceKind === "content") return false;
    }
    if (assignee && !leadHasAssignee(lead, assignee)) return false;
    if (!q) return true;
    const haystack = [
      lead.businessName,
      lead.ownerName,
      lead.email,
      lead.phone,
      lead.leadSource,
      lead.sourceWebsite,
      lead.referredBy,
      lead.referredByAffiliateCode,
      lead.referredByEmail,
      lead.contentReferrer,
      lead.notes,
      lead.stallReason,
      lead.contentSummary,
      ...(lead.contentSources ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function buildLeadsAnalytics(
  leads: LeadRecord[],
  nowMs = Date.now(),
): LeadAnalytics {
  const funnel = FUNNEL_ORDER.map((stage) => ({
    stage,
    count: leads.filter((lead) => lead.stage === stage).length,
  }));

  const sourceMap = new Map<string, number>();
  const stallMap = new Map<string, number>();
  const assigneeMap = new Map<
    string,
    { count: number; overdueFollowUps: number }
  >();

  let daysLeftZero = 0;
  let daysLeftLte3 = 0;

  for (const lead of leads) {
    const source = lead.leadSource?.trim() || "Unknown";
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);

    if (lead.stallReason?.trim()) {
      const reason = lead.stallReason.trim();
      stallMap.set(reason, (stallMap.get(reason) ?? 0) + 1);
    }

    const assigneeKeysRaw = resolveAssigneeUids(lead);
    const assigneeKeys =
      assigneeKeysRaw.length > 0 ? assigneeKeysRaw : ["unassigned"];
    const overdue =
      lead.nextFollowUpAt ?
        (() => {
          const followMs = new Date(lead.nextFollowUpAt).getTime();
          return (
            !Number.isNaN(followMs) &&
            followMs < nowMs &&
            lead.stage !== "archive"
          );
        })()
      : false;
    for (const assigneeKey of assigneeKeys) {
      const bucket = assigneeMap.get(assigneeKey) ?? {
        count: 0,
        overdueFollowUps: 0,
      };
      bucket.count += 1;
      if (overdue) bucket.overdueFollowUps += 1;
      assigneeMap.set(assigneeKey, bucket);
    }

    const daysLeft = lead.workspace?.trialDaysLeft;
    if (
      typeof daysLeft === "number" &&
      (lead.stage === "registered" || lead.stage === "onboarded")
    ) {
      if (daysLeft === 0) daysLeftZero += 1;
      if (daysLeft <= 3) daysLeftLte3 += 1;
    }
  }

  const queueCounts: Record<LeadQueue, number> = {
    all: leads.length,
    content: leads.filter((lead) => leadHasContentActivity(lead)).length,
    warm: leads.filter(
      (lead) =>
        queueForStage(lead.stage) === "warm" && lead.sourceKind !== "content",
    ).length,
    cold: leads.filter((lead) => queueForStage(lead.stage) === "cold").length,
    onboarded: leads.filter((lead) => queueForStage(lead.stage) === "onboarded")
      .length,
    archive: leads.filter((lead) => queueForStage(lead.stage) === "archive")
      .length,
  };

  return {
    funnel,
    bySource: [...sourceMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    byAssignee: [...assigneeMap.entries()]
      .map(([assignedToUid, row]) => ({ assignedToUid, ...row }))
      .sort((a, b) => b.count - a.count),
    queueCounts,
    trialRisk: { daysLeftZero, daysLeftLte3 },
    stallReasons: [...stallMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  };
}

async function loadWorkspaceOverlay(
  businessId: string,
): Promise<LeadWorkspaceOverlay | undefined> {
  const snapshot = await loadOnboardedBusinessSnapshot(businessId);
  if (!snapshot) return undefined;

  const trialDaysLeft = daysLeftFromExpiresAt(
    snapshot.subscriptionExpiresAt ?? undefined,
  );
  const billingCycle = snapshot.billingCycle?.toLowerCase();
  const isTrial =
    billingCycle === "trial" ||
    (snapshot.planName || "").toLowerCase().includes("trial");

  return {
    planName: snapshot.planName,
    planCode: snapshot.planCode,
    billingCycle: snapshot.billingCycle,
    price: snapshot.price,
    trialDaysLeft: isTrial || trialDaysLeft !== null ? trialDaysLeft : null,
    onboardingComplete: snapshot.onboardingComplete,
    accountReady: snapshot.onboardingComplete,
  };
}

function attachOnboardedMonitorFromSnapshot(lead: LeadRecord): LeadRecord {
  if (lead.stage !== "onboarded") return lead;
  const onboardedMonitor = evaluateOnboardedJourneyFromSnapshot({
    onboardedAt: lead.onboardedAt,
    gettingStartedCompleted: lead.gettingStartedCompleted,
    activityDayCount: lead.activityDayCount,
    subscriptionStatus: lead.subscriptionStatus,
    subscriptionExpiresAt: lead.subscriptionExpiresAt,
    subscriptionChangeType: lead.subscriptionChangeType,
    registeredAt: lead.registeredAt,
  });
  return { ...lead, onboardedMonitor };
}

function attachOnboardedMonitorFromLive(
  lead: LeadRecord,
  snapshot: Awaited<ReturnType<typeof loadOnboardedBusinessSnapshot>>,
): LeadRecord {
  if (!snapshot || lead.stage !== "onboarded") {
    return attachOnboardedMonitorFromSnapshot(lead);
  }
  const onboardedMonitor = evaluateOnboardedJourney({
    onboardedAt:
      snapshot.onboardedAt || lead.onboardedAt || lead.registeredAt || null,
    gettingStartedCompleted: snapshot.gettingStartedCompleted,
    activityDayCount: snapshot.activityDayCount,
    subscription: snapshot.currentSubscription,
    recentSubscriptionChanges: snapshot.recentSubscriptionChanges,
  });
  return {
    ...lead,
    onboardedAt: snapshot.onboardedAt ?? lead.onboardedAt,
    gettingStartedCompleted: snapshot.gettingStartedCompleted,
    activityDayCount: snapshot.activityDayCount,
    lastActiveDay: snapshot.lastActiveDay,
    lastSignInAt: snapshot.lastSignInAt,
    subscriptionStatus: snapshot.subscriptionStatus,
    subscriptionExpiresAt: snapshot.subscriptionExpiresAt,
    subscriptionChangeType: snapshot.subscriptionChangeType,
    onboardedMonitor,
    workspace: {
      planName: snapshot.planName,
      planCode: snapshot.planCode,
      billingCycle: snapshot.billingCycle,
      price: snapshot.price,
      trialDaysLeft: daysLeftFromExpiresAt(
        snapshot.subscriptionExpiresAt ?? undefined,
      ),
      onboardingComplete: snapshot.onboardingComplete,
      accountReady: snapshot.onboardingComplete,
    },
    accountReady: lead.accountReady ?? snapshot.onboardingComplete,
  };
}

async function enrichLeadsWithWorkspace(
  leads: LeadRecord[],
): Promise<LeadRecord[]> {
  const ids = [
    ...new Set(
      leads
        .map((lead) => lead.linkedBusinessId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ids.length === 0) {
    return leads.map(attachOnboardedMonitorFromSnapshot);
  }

  const overlays = await Promise.all(
    ids.map(async (id) => [id, await loadWorkspaceOverlay(id)] as const),
  );
  const byId = new Map(overlays);

  return leads.map((lead) => {
    let next = lead;
    if (lead.linkedBusinessId) {
      const workspace = byId.get(lead.linkedBusinessId);
      if (workspace) {
        next = {
          ...lead,
          workspace,
          accountReady: lead.accountReady ?? workspace.accountReady,
        };
      }
    }
    return attachOnboardedMonitorFromSnapshot(next);
  });
}

/** Live enrich onboarded leads (login days + subscription) for getLead / targeted list. */
async function enrichOnboardedMonitorsLive(
  leads: LeadRecord[],
): Promise<LeadRecord[]> {
  const targets = leads.filter(
    (lead) => lead.stage === "onboarded" && lead.linkedBusinessId,
  );
  if (targets.length === 0) {
    return leads.map(attachOnboardedMonitorFromSnapshot);
  }

  const snapshots = new Map<
    string,
    Awaited<ReturnType<typeof loadOnboardedBusinessSnapshot>>
  >();
  await mapWithConcurrency(targets, 8, async (lead) => {
    const businessId = lead.linkedBusinessId!;
    if (snapshots.has(businessId)) return;
    const snap = await loadOnboardedBusinessSnapshot(businessId, lead.userId);
    snapshots.set(businessId, snap);
  });

  return leads.map((lead) => {
    if (lead.stage !== "onboarded" || !lead.linkedBusinessId) {
      return attachOnboardedMonitorFromSnapshot(lead);
    }
    return attachOnboardedMonitorFromLive(
      lead,
      snapshots.get(lead.linkedBusinessId) ?? null,
    );
  });
}

/**
 * Fast path: list persisted `leads` only (shared sales pipeline workspace).
 * Use POST /leads/gather to pull SmartRefill + legacy into this collection.
 */
async function listAccessibleLeads(_actor: SalesActor): Promise<LeadRecord[]> {
  const snap = await db.collection("leads").get();
  return snap.docs
    .map((doc) => normalizeLead(doc.id, doc.data() ?? {}))
    .map(attachOnboardedMonitorFromSnapshot);
}

export async function listLeads(
  actor: SalesActor,
  opts: {
    queue?: LeadQueue;
    stage?: LeadStage;
    assignee?: string;
    q?: string;
  } = {},
): Promise<LeadRecord[]> {
  // Fast path: use denormalized workspace / monitor fields already on each lead
  // (written by gather + PATCH). Live N× business enrichment belongs on getLead.
  const leads = await listAccessibleLeads(actor);
  return filterLeads(leads, opts).sort((a, b) =>
    String(b.updatedAt || b.createdAt || "").localeCompare(
      String(a.updatedAt || a.createdAt || ""),
    ),
  );
}

export async function getLeadsAnalytics(
  actor: SalesActor,
): Promise<LeadAnalytics> {
  const leads = await listAccessibleLeads(actor);
  return buildLeadsAnalytics(leads);
}

function canViewLeadRecord(
  actor: SalesActor,
  lead: LeadRecord,
  accessible: string[] | "all",
): boolean {
  if (accessible === "all") return true;
  // Gathered SmartRefill / legacy prospects are a shared sales workspace.
  if (lead.pipelineGathered || lead.platformSource || lead.createdByUid === "pipeline-gather") {
    return true;
  }
  if (lead.userId === "smartrefill") return true;
  return canAccessOwner(actor, lead.userId, accessible);
}

export async function getLead(
  actor: SalesActor,
  leadId: string,
): Promise<LeadRecord | null> {
  const snap = await db.collection("leads").doc(leadId).get();
  if (!snap.exists) return null;

  const lead = normalizeLead(snap.id, snap.data() ?? {});
  const accessible = await resolveAccessibleUserIds(actor);
  if (!canViewLeadRecord(actor, lead, accessible)) return null;
  const [enriched] = await enrichOnboardedMonitorsLive([lead]);
  if (enriched.linkedBusinessId && !enriched.workspace) {
    const [withWorkspace] = await enrichLeadsWithWorkspace([enriched]);
    return withWorkspace;
  }
  return enriched;
}

function parseOptionalDate(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("INVALID_DATE");
  return parsed.toISOString();
}

export async function createLead(
  actor: SalesActor,
  input: CreateLeadInput,
): Promise<LeadRecord> {
  if (!input.businessName?.trim() || !input.ownerName?.trim()) {
    throw new Error("LEAD_FIELDS_REQUIRED");
  }

  const stage =
    input.stage && VALID_STAGES.has(input.stage) ? input.stage : "inquire";
  const attendedDemo = input.attendedDemo ?
    normalizeAttendedDemo(input.attendedDemo) || input.attendedDemo :
    undefined;
  if (attendedDemo && !VALID_DEMO.has(attendedDemo)) {
    throw new Error("INVALID_DEMO");
  }
  if (input.sourceKind && !VALID_SOURCE_KIND.has(input.sourceKind)) {
    throw new Error("INVALID_SOURCE_KIND");
  }
  if (input.dataImported && !VALID_DATA_IMPORTED.has(input.dataImported)) {
    throw new Error("INVALID_DATA_IMPORTED");
  }
  if (input.trainingPhase && !VALID_TRAINING.has(input.trainingPhase)) {
    throw new Error("INVALID_TRAINING_PHASE");
  }

  const linkedBusinessId = input.linkedBusinessId?.trim() || undefined;
  if (linkedBusinessId) {
    const businessSnap = await db
      .collection("businesses")
      .doc(linkedBusinessId)
      .get();
    if (!businessSnap.exists) throw new Error("LINKED_BUSINESS_NOT_FOUND");
  }

  const initialAssignees =
    input.assignedToUids !== undefined ?
      normalizeAssigneeUids(input.assignedToUids)
    : input.assignedToUid?.trim() ?
      [input.assignedToUid.trim()]
    : [actor.uid];
  const assigneeFields = assigneeWriteFields(initialAssignees);

  const ref = db.collection("leads").doc();
  const payload = {
    userId: actor.uid,
    createdByUid: actor.uid,
    businessName: input.businessName.trim(),
    ownerName: input.ownerName.trim(),
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "",
    address: input.address?.trim() || "",
    stage,
    attemptCount: Math.max(0, Number(input.attemptCount) || 0),
    warmAttemptCount: Math.max(0, Number(input.attemptCount) || 0),
    coldAttemptCount: 0,
    ...assigneeFields,
    firstContactAt: parseOptionalDate(input.firstContactAt ?? null),
    lastContactAt: parseOptionalDate(input.lastContactAt ?? null),
    lastContactedByUid: input.lastContactedByUid?.trim() || null,
    nextFollowUpAt: parseOptionalDate(input.nextFollowUpAt ?? null),
    attendedDemo: attendedDemo || null,
    warmStatus: input.warmStatus?.trim() || "",
    stallReason: input.stallReason?.trim() || "",
    channels: {
      ...EMPTY_CHANNELS,
      ...(input.channels || {}),
    },
    leadSource: input.leadSource?.trim() || "",
    sourceWebsite:
      input.leadSource?.trim() === "Website" ?
        input.sourceWebsite?.trim() || "" :
        "",
    referredBy:
      input.leadSource?.trim() === "Referrals" ?
        input.referredBy?.trim() || "" :
        "",
    referredByClientId:
      input.leadSource?.trim() === "Referrals" ?
        input.referredByClientId?.trim() || null :
        null,
    referredByUserId:
      input.leadSource?.trim() === "Referrals" ?
        input.referredByUserId?.trim() || null :
        null,
    referredByAffiliateId:
      input.leadSource?.trim() === "Referrals" ?
        input.referredByAffiliateId?.trim() || null :
        null,
    referredByAffiliateCode:
      input.leadSource?.trim() === "Referrals" ?
        input.referredByAffiliateCode?.trim() || null :
        null,
    referredByEmail:
      input.leadSource?.trim() === "Referrals" ?
        input.referredByEmail?.trim().toLowerCase() || null :
        null,
    contentReferrer: input.contentReferrer?.trim() || null,
    notes: input.notes?.trim() || "",
    linkedBusinessId: linkedBusinessId || null,
    sourceKind: input.sourceKind || "manual",
    accountReady: input.accountReady ?? false,
    dataImported: input.dataImported || "no",
    trainingPhase: input.trainingPhase || "phase_1",
    inquiredAt: parseOptionalDate(input.inquiredAt ?? null),
    registeredAt: parseOptionalDate(input.registeredAt ?? null),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(payload);
  await appendLeadHistory(ref.id, {
    type: "created",
    kind: "created",
    summary: summarizeLeadHistory([], "created"),
    changes: [],
    actorUid: actor.uid,
  });
  const saved = await getLead(actor, ref.id);
  if (!saved) throw new Error("NOT_FOUND");
  return saved;
}

export async function updateLead(
  actor: SalesActor,
  leadId: string,
  input: UpdateLeadInput,
): Promise<LeadRecord> {
  let existing = await getLead(actor, leadId);
  if (!existing && leadId.startsWith("sr-")) {
    // First CRM overlay on a SmartRefill-sourced row.
    const pipeline = await buildSmartRefillPipelineLeads();
    existing = pipeline.find((lead) => lead.id === leadId) ?? null;
  }
  if (!existing) throw new Error("NOT_FOUND");

  const accessible = await resolveAccessibleUserIds(actor);
  if (
    existing.userId !== "smartrefill" &&
    !canAccessOwner(actor, existing.userId, accessible)
  ) {
    throw new Error("FORBIDDEN");
  }

  if (input.stage !== undefined && !VALID_STAGES.has(input.stage)) {
    throw new Error("INVALID_STAGE");
  }
  if (input.attendedDemo !== undefined && input.attendedDemo !== null) {
    const demo =
      normalizeAttendedDemo(input.attendedDemo) || input.attendedDemo;
    if (!VALID_DEMO.has(demo)) throw new Error("INVALID_DEMO");
  }
  if (input.sourceKind !== undefined && !VALID_SOURCE_KIND.has(input.sourceKind)) {
    throw new Error("INVALID_SOURCE_KIND");
  }
  if (
    input.dataImported !== undefined &&
    !VALID_DATA_IMPORTED.has(input.dataImported)
  ) {
    throw new Error("INVALID_DATA_IMPORTED");
  }
  if (
    input.trainingPhase !== undefined &&
    !VALID_TRAINING.has(input.trainingPhase)
  ) {
    throw new Error("INVALID_TRAINING_PHASE");
  }

  const linkedBusinessId =
    input.linkedBusinessId !== undefined ?
      input.linkedBusinessId.trim() || null :
      undefined;
  if (linkedBusinessId) {
    const businessSnap = await db
      .collection("businesses")
      .doc(linkedBusinessId)
      .get();
    if (!businessSnap.exists) throw new Error("LINKED_BUSINESS_NOT_FOUND");
  }

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.businessName !== undefined) {
    patch.businessName = input.businessName.trim();
  }
  if (input.ownerName !== undefined) patch.ownerName = input.ownerName.trim();
  if (input.email !== undefined) patch.email = input.email.trim();
  if (input.phone !== undefined) patch.phone = input.phone.trim();
  if (input.address !== undefined) patch.address = input.address.trim();
  if (input.stage !== undefined) patch.stage = input.stage;
  if (input.attemptCount !== undefined) {
    patch.attemptCount = Math.max(0, Number(input.attemptCount) || 0);
  }
  if (input.bumpAttempt) {
    const intendedStage =
      typeof patch.stage === "string" && VALID_STAGES.has(patch.stage as LeadStage) ?
        (patch.stage as LeadStage) :
        existing.stage;
    const track = resolveAttemptBumpTrack(existing.stage, intendedStage);
    const warm =
      Number.isFinite(Number(existing.warmAttemptCount)) ?
        Math.max(0, Number(existing.warmAttemptCount)) :
        Math.max(0, Number(existing.attemptCount) || 0);
    const cold = Math.max(0, Number(existing.coldAttemptCount) || 0);
    const nextWarm = track === "warm" ? warm + 1 : warm;
    const nextCold = track === "cold" ? cold + 1 : cold;
    patch.warmAttemptCount = nextWarm;
    patch.coldAttemptCount = nextCold;
    patch.attemptCount = nextWarm + nextCold;
  }
  if (input.assignedToUids !== undefined) {
    Object.assign(patch, assigneeWriteFields(input.assignedToUids));
  } else if (input.assignedToUid !== undefined) {
    Object.assign(
      patch,
      assigneeWriteFields(
        input.assignedToUid.trim() ? [input.assignedToUid.trim()] : [],
      ),
    );
  }
  if (input.firstContactAt !== undefined) {
    patch.firstContactAt = parseOptionalDate(input.firstContactAt);
  }
  if (input.lastContactAt !== undefined) {
    patch.lastContactAt = parseOptionalDate(input.lastContactAt);
  }
  if (input.lastContactedByUid !== undefined) {
    patch.lastContactedByUid = input.lastContactedByUid.trim() || null;
  }
  if (input.nextFollowUpAt !== undefined) {
    patch.nextFollowUpAt = parseOptionalDate(input.nextFollowUpAt);
  }
  if (input.attendedDemo !== undefined) {
    patch.attendedDemo =
      input.attendedDemo === null ?
        null :
        normalizeAttendedDemo(input.attendedDemo) || input.attendedDemo;
  }
  if (input.warmStatus !== undefined) {
    patch.warmStatus = input.warmStatus.trim();
  }
  if (input.stallReason !== undefined) {
    patch.stallReason = input.stallReason.trim();
  }
  if (input.channels !== undefined) {
    patch.channels = { ...existing.channels, ...input.channels };
  }
  if (input.leadSource !== undefined) {
    patch.leadSource = input.leadSource.trim();
    const source = input.leadSource.trim();
    if (source === "Website") {
      patch.sourceWebsite =
        input.sourceWebsite !== undefined ?
          input.sourceWebsite.trim() :
          existing.sourceWebsite || "";
      patch.referredBy = "";
      patch.referredByClientId = null;
      patch.referredByUserId = null;
      patch.referredByAffiliateId = null;
      patch.referredByAffiliateCode = null;
      patch.referredByEmail = null;
    } else if (source === "Referrals") {
      patch.referredBy =
        input.referredBy !== undefined ?
          input.referredBy.trim() :
          existing.referredBy || "";
      patch.referredByClientId =
        input.referredByClientId !== undefined ?
          input.referredByClientId.trim() || null :
          existing.referredByClientId || null;
      patch.referredByUserId =
        input.referredByUserId !== undefined ?
          input.referredByUserId.trim() || null :
          existing.referredByUserId || null;
      patch.referredByAffiliateId =
        input.referredByAffiliateId !== undefined ?
          input.referredByAffiliateId.trim() || null :
          existing.referredByAffiliateId || null;
      patch.referredByAffiliateCode =
        input.referredByAffiliateCode !== undefined ?
          input.referredByAffiliateCode.trim() || null :
          existing.referredByAffiliateCode || null;
      patch.referredByEmail =
        input.referredByEmail !== undefined ?
          input.referredByEmail.trim().toLowerCase() || null :
          existing.referredByEmail || null;
      patch.sourceWebsite = "";
    } else {
      patch.sourceWebsite = "";
      patch.referredBy = "";
      patch.referredByClientId = null;
      patch.referredByUserId = null;
      patch.referredByAffiliateId = null;
      patch.referredByAffiliateCode = null;
      patch.referredByEmail = null;
    }
  } else {
    if (input.sourceWebsite !== undefined) {
      patch.sourceWebsite = input.sourceWebsite.trim();
    }
    if (input.referredBy !== undefined) {
      patch.referredBy = input.referredBy.trim();
    }
    if (input.referredByClientId !== undefined) {
      patch.referredByClientId = input.referredByClientId.trim() || null;
    }
    if (input.referredByUserId !== undefined) {
      patch.referredByUserId = input.referredByUserId.trim() || null;
    }
    if (input.referredByAffiliateId !== undefined) {
      patch.referredByAffiliateId = input.referredByAffiliateId.trim() || null;
    }
    if (input.referredByAffiliateCode !== undefined) {
      patch.referredByAffiliateCode =
        input.referredByAffiliateCode.trim() || null;
    }
    if (input.referredByEmail !== undefined) {
      patch.referredByEmail = input.referredByEmail.trim().toLowerCase() || null;
    }
    if (input.contentReferrer !== undefined) {
      patch.contentReferrer = input.contentReferrer.trim() || null;
    }
  }
  if (input.notes !== undefined) patch.notes = input.notes.trim();
  if (linkedBusinessId !== undefined) patch.linkedBusinessId = linkedBusinessId;
  if (input.sourceKind !== undefined) patch.sourceKind = input.sourceKind;
  if (input.accountReady !== undefined) patch.accountReady = input.accountReady;
  if (input.dataImported !== undefined) patch.dataImported = input.dataImported;
  if (input.trainingPhase !== undefined) {
    patch.trainingPhase = input.trainingPhase;
  }
  if (input.inquiredAt !== undefined) {
    patch.inquiredAt = parseOptionalDate(input.inquiredAt);
  }
  if (input.registeredAt !== undefined) {
    patch.registeredAt = parseOptionalDate(input.registeredAt);
  }
  if (input.lastOutreachMessageId !== undefined) {
    patch.lastOutreachMessageId =
      input.lastOutreachMessageId?.trim() || null;
  }
  if (input.lastOutreachOpenedAt !== undefined) {
    patch.lastOutreachOpenedAt = parseOptionalDate(input.lastOutreachOpenedAt);
  }

  // Linking a workspace: newly registered → warm queue; onboarded if setup done.
  if (
    linkedBusinessId &&
    (existing.stage === "inquire" ||
      existing.stage === "warm" ||
      existing.stage === "cold" ||
      existing.stage === "registered")
  ) {
    if (input.stage && VALID_STAGES.has(input.stage)) {
      patch.stage = input.stage;
    } else {
      const overlay = await loadWorkspaceOverlay(linkedBusinessId);
      patch.stage =
        overlay?.onboardingComplete === true ? "onboarded" : "registered";
      if (overlay?.onboardingComplete === true) {
        patch.accountReady = true;
      }
    }
  }

  applyLeadAutoQueueRules({ existing, patch });

  const ref = db.collection("leads").doc(leadId);
  const snap = await ref.get();
  const isFirstOverlay = !snap.exists;
  const historyChanges = buildLeadHistoryChanges(existing, patch);
  if (!snap.exists) {
    await ref.set({
      userId: actor.uid,
      createdByUid: actor.uid,
      businessName: existing.businessName,
      ownerName: existing.ownerName,
      email: existing.email || "",
      phone: existing.phone || "",
      address: existing.address || "",
      stage: existing.stage,
      attemptCount: existing.attemptCount,
      warmAttemptCount: existing.warmAttemptCount,
      coldAttemptCount: existing.coldAttemptCount,
      assignedToUids: existing.assignedToUids?.length
        ? existing.assignedToUids
        : existing.assignedToUid
          ? [existing.assignedToUid]
          : [actor.uid],
      assignedToUid: existing.assignedToUid || actor.uid,
      channels: existing.channels,
      leadSource: existing.leadSource || "",
      notes: existing.notes || "",
      linkedBusinessId: existing.linkedBusinessId || null,
      sourceKind: existing.sourceKind || "manual",
      externalId: leadId,
      platformSource: existing.platformSource || "smartrefill",
      createdAt: FieldValue.serverTimestamp(),
      ...patch,
    });
  } else {
    await ref.update(patch);
  }

  if (historyChanges.length > 0 || isFirstOverlay) {
    const historyKind = isFirstOverlay ?
      "tracking_started" :
      "updated";
    const classified = classifyLeadHistoryKind(historyChanges, historyKind);
    await appendLeadHistory(leadId, {
      type: isFirstOverlay ? "created" : "updated",
      kind: classified,
      summary: summarizeLeadHistory(historyChanges, historyKind),
      changes: filterChangesForKind(historyChanges, classified),
      snapshot:
        classified === "details" ?
          buildDetailsSnapshot(existing, historyChanges) :
          undefined,
      actorUid: actor.uid,
    });
  }

  const updated = await getLead(actor, leadId);
  if (!updated) throw new Error("NOT_FOUND");
  await stampPipelineAffiliateOnPayingSubscription({
    linkedBusinessId: updated.linkedBusinessId,
    stage: updated.stage,
    referredByAffiliateId: updated.referredByAffiliateId,
    referredByAffiliateCode: updated.referredByAffiliateCode,
    planCode: updated.workspace?.planCode || updated.planCode,
    planName: updated.workspace?.planName || updated.planName,
    billingCycle: updated.workspace?.billingCycle || updated.billingCycle,
    price: updated.workspace?.price ?? updated.price,
    accountReady: updated.accountReady,
  });
  return updated;
}

export type BulkAssignMode = "set" | "add" | "remove" | "clear";

export type BulkAssignLeadsInput = {
  leadIds: string[];
  mode: BulkAssignMode;
  assignedToUids?: string[];
};

const BULK_ASSIGN_MAX = 200;

export async function bulkAssignLeads(
  actor: SalesActor,
  input: BulkAssignLeadsInput,
): Promise<{
  updated: LeadRecord[];
  failed: Array<{ leadId: string; error: string }>;
}> {
  const mode = input.mode;
  if (!["set", "add", "remove", "clear"].includes(mode)) {
    throw new Error("INVALID_BULK_ASSIGN_MODE");
  }

  const leadIds = [
    ...new Set(
      (Array.isArray(input.leadIds) ? input.leadIds : [])
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  if (leadIds.length === 0) throw new Error("LEAD_IDS_REQUIRED");
  if (leadIds.length > BULK_ASSIGN_MAX) throw new Error("TOO_MANY_LEAD_IDS");

  const targetUids = normalizeAssigneeUids(input.assignedToUids);
  if ((mode === "set" || mode === "add" || mode === "remove") && targetUids.length === 0) {
    throw new Error("ASSIGNEES_REQUIRED");
  }

  const updated: LeadRecord[] = [];
  const failed: Array<{ leadId: string; error: string }> = [];

  for (const leadId of leadIds) {
    try {
      const existing = await getLead(actor, leadId);
      if (!existing && leadId.startsWith("sr-")) {
        // Allow first overlay via updateLead path.
      } else if (!existing) {
        failed.push({ leadId, error: "NOT_FOUND" });
        continue;
      }

      const current = existing ? resolveAssigneeUids(existing) : [];
      let next: string[];
      if (mode === "clear") {
        next = [];
      } else if (mode === "set") {
        next = targetUids;
      } else if (mode === "add") {
        next = mergeAssigneeUids(current, targetUids);
      } else {
        next = removeAssigneeUids(current, targetUids);
      }

      const same =
        next.length === current.length &&
        next.every((uid, i) => uid === current[i]);
      if (same && existing) {
        updated.push(existing);
        continue;
      }

      const row = await updateLead(actor, leadId, { assignedToUids: next });
      updated.push(row);
    } catch (error) {
      failed.push({
        leadId,
        error: error instanceof Error ? error.message : "UPDATE_FAILED",
      });
    }
  }

  return { updated, failed };
}

export type LeadHistoryKind =
  | "created"
  | "tracking_started"
  | "details"
  | "status";

export type LeadHistoryChange = {
  field: string;
  from: string | null;
  to: string | null;
};

export type LeadHistoryEvent = {
  id: string;
  type: "created" | "updated";
  kind: LeadHistoryKind;
  summary: string;
  changes: LeadHistoryChange[];
  /** Previous detail values when kind is details. */
  snapshot?: Record<string, string | null>;
  actorUid: string;
  createdAt: string | null;
};

const DETAIL_HISTORY_FIELDS = [
  "businessName",
  "ownerName",
  "email",
  "phone",
  "address",
  "leadSource",
  "sourceWebsite",
  "referredBy",
  "referredByClientId",
  "referredByUserId",
  "referredByAffiliateId",
  "referredByAffiliateCode",
  "referredByEmail",
  "contentReferrer",
  "linkedBusinessId",
  "inquiredAt",
  "registeredAt",
] as const;

const STATUS_HISTORY_FIELDS = [
  "warmStatus",
  "stage",
  "attendedDemo",
  "accountReady",
  "lastContactAt",
  "lastContactedByUid",
  "nextFollowUpAt",
  "notes",
  "stallReason",
  "channels",
  "attemptCount",
  "warmAttemptCount",
  "coldAttemptCount",
  "assignedToUid",
  "assignedToUids",
  "lastOutreachMessageId",
  "lastOutreachOpenedAt",
] as const;

const HISTORY_FIELDS = [
  ...DETAIL_HISTORY_FIELDS,
  ...STATUS_HISTORY_FIELDS,
] as const;

function historyDisplayValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function existingFieldValue(
  lead: LeadRecord,
  field: (typeof HISTORY_FIELDS)[number],
): unknown {
  if (field === "channels") return lead.channels;
  return (lead as Record<string, unknown>)[field];
}

export function buildLeadHistoryChanges(
  existing: LeadRecord,
  patch: Record<string, unknown>,
): LeadHistoryChange[] {
  const changes: LeadHistoryChange[] = [];
  for (const field of HISTORY_FIELDS) {
    if (!(field in patch)) continue;
    const from = historyDisplayValue(existingFieldValue(existing, field));
    const to = historyDisplayValue(patch[field]);
    if (from === to) continue;
    changes.push({ field, from, to });
  }
  return changes;
}

function hasFieldChange(
  changes: LeadHistoryChange[],
  fields: readonly string[],
): boolean {
  return changes.some((change) => fields.includes(change.field));
}

export function classifyLeadHistoryKind(
  changes: LeadHistoryChange[],
  kind: "created" | "updated" | "tracking_started",
): LeadHistoryKind {
  if (kind === "created") return "created";
  if (kind === "tracking_started") return "tracking_started";
  const detailChanged = hasFieldChange(changes, DETAIL_HISTORY_FIELDS);
  const statusChanged = hasFieldChange(changes, STATUS_HISTORY_FIELDS);
  // Status updates often also bump attempts / notes — prefer status.
  if (
    changes.some(
      (change) =>
        change.field === "warmStatus" ||
        change.field === "stage" ||
        change.field === "attendedDemo",
    )
  ) {
    return "status";
  }
  if (detailChanged && !statusChanged) return "details";
  if (detailChanged) return "details";
  return "status";
}

export function summarizeLeadHistory(
  changes: LeadHistoryChange[],
  kind: "created" | "updated" | "tracking_started",
): string {
  const classified = classifyLeadHistoryKind(changes, kind);
  switch (classified) {
  case "created":
    return "Lead created";
  case "tracking_started":
    return "CRM tracking started";
  case "details":
    return "Updated details";
  case "status":
    return "Updated status";
  default:
    return "Lead updated";
  }
}

function buildDetailsSnapshot(
  existing: LeadRecord,
  changes: LeadHistoryChange[],
): Record<string, string | null> | undefined {
  const changedDetailFields = new Set(
    changes
      .filter((change) =>
        (DETAIL_HISTORY_FIELDS as readonly string[]).includes(change.field),
      )
      .map((change) => change.field),
  );
  if (changedDetailFields.size === 0) return undefined;

  const snapshot: Record<string, string | null> = {};
  for (const field of DETAIL_HISTORY_FIELDS) {
    // Always include inquire/registered in the old snapshot for context.
    if (
      changedDetailFields.has(field) ||
      field === "inquiredAt" ||
      field === "registeredAt"
    ) {
      snapshot[field] = historyDisplayValue(existingFieldValue(existing, field));
    }
  }
  return snapshot;
}

function filterChangesForKind(
  changes: LeadHistoryChange[],
  kind: LeadHistoryKind,
): LeadHistoryChange[] {
  if (kind === "details") {
    return changes.filter((change) =>
      (DETAIL_HISTORY_FIELDS as readonly string[]).includes(change.field),
    );
  }
  if (kind === "status") {
    // Keep the meaningful status fields; drop noisy attempt/channel dumps from ledger.
    const preferred = new Set([
      "warmStatus",
      "stage",
      "attendedDemo",
      "accountReady",
      "lastContactAt",
      "lastContactedByUid",
      "nextFollowUpAt",
      "notes",
      "stallReason",
      "channels",
      "assignedToUid",
      "assignedToUids",
      "attemptCount",
      "warmAttemptCount",
      "coldAttemptCount",
    ]);
    const filtered = changes.filter((change) => preferred.has(change.field));
    return filtered.length ? filtered : changes;
  }
  return changes;
}

async function appendLeadHistory(
  leadId: string,
  input: {
    type: "created" | "updated";
    kind: LeadHistoryKind;
    summary: string;
    changes: LeadHistoryChange[];
    snapshot?: Record<string, string | null>;
    actorUid: string;
  },
): Promise<void> {
  await db.collection("leads").doc(leadId).collection("history").add({
    type: input.type,
    kind: input.kind,
    summary: input.summary,
    changes: input.changes,
    snapshot: input.snapshot || null,
    actorUid: input.actorUid,
    createdAt: FieldValue.serverTimestamp(),
  });
}

function normalizeHistoryKind(
  raw: unknown,
  type: "created" | "updated",
  summary: string,
  changes: LeadHistoryChange[],
): LeadHistoryKind {
  if (
    raw === "created" ||
    raw === "tracking_started" ||
    raw === "details" ||
    raw === "status"
  ) {
    return raw;
  }
  if (type === "created" || summary === "Lead created") return "created";
  if (summary === "CRM tracking started") return "tracking_started";
  if (summary === "Updated details" || summary.toLowerCase().includes("detail")) {
    return "details";
  }
  return classifyLeadHistoryKind(changes, "updated");
}

export async function listLeadHistory(
  actor: SalesActor,
  leadId: string,
): Promise<LeadHistoryEvent[]> {
  const lead = await getLead(actor, leadId);
  if (!lead) throw new Error("NOT_FOUND");

  const historySnap = await db
    .collection("leads")
    .doc(leadId)
    .collection("history")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return historySnap.docs.map((doc) => {
    const data = doc.data() || {};
    const changesRaw = Array.isArray(data.changes) ? data.changes : [];
    const changes = changesRaw
      .map((row: Record<string, unknown>) => ({
        field: String(row.field || ""),
        from:
          row.from === null || row.from === undefined ?
            null :
            String(row.from),
        to: row.to === null || row.to === undefined ? null : String(row.to),
      }))
      .filter((row: LeadHistoryChange) => Boolean(row.field));
    const type = data.type === "created" ? "created" : "updated";
    const summary =
      typeof data.summary === "string" ? data.summary : "Lead updated";
    const kind = normalizeHistoryKind(data.kind, type, summary, changes);
    const snapshotRaw =
      data.snapshot && typeof data.snapshot === "object" ?
        (data.snapshot as Record<string, unknown>) :
        null;
    const snapshot =
      snapshotRaw ?
        Object.fromEntries(
          Object.entries(snapshotRaw).map(([key, value]) => [
            key,
            value === null || value === undefined ? null : String(value),
          ]),
        ) :
        undefined;

    return {
      id: doc.id,
      type,
      kind,
      summary,
      changes,
      snapshot,
      actorUid: typeof data.actorUid === "string" ? data.actorUid : "",
      createdAt: toIsoString(data.createdAt),
    };
  });
}

const AWAITING_REPLY_STATUS = "Awaiting reply";
const EMAIL_OPENED_STATUS = "Email opened";

function normalizeBrevoMessageId(raw?: string | null): string {
  return String(raw || "")
    .trim()
    .replace(/^<|>$/g, "");
}

/**
 * Apply a Brevo transactional "opened" / "uniqueOpened" event.
 * Only promotes leads that are currently "Awaiting reply".
 */
export async function markLeadEmailOpened(input: {
  messageId?: string | null;
  email?: string | null;
  openedAt?: string | null;
}): Promise<{ updated: boolean; leadId?: string; reason?: string }> {
  const messageId = normalizeBrevoMessageId(input.messageId);
  const email = String(input.email || "").trim().toLowerCase();
  const openedAt = input.openedAt || new Date().toISOString();

  let leadDoc: QueryDocumentSnapshot | null = null;

  if (messageId) {
    const byMessage = await db
      .collection("leads")
      .where("lastOutreachMessageId", "==", messageId)
      .limit(1)
      .get();
    if (!byMessage.empty) {
      leadDoc = byMessage.docs[0];
    } else {
      // Brevo may include angle brackets; also try the raw form.
      const byRaw = await db
        .collection("leads")
        .where("lastOutreachMessageId", "==", input.messageId?.trim() || "")
        .limit(1)
        .get();
      if (!byRaw.empty) leadDoc = byRaw.docs[0];
    }
  }

  if (!leadDoc && email) {
    const byEmail = await db
      .collection("leads")
      .where("email", "==", email)
      .where("warmStatus", "==", AWAITING_REPLY_STATUS)
      .limit(1)
      .get();
    if (!byEmail.empty) leadDoc = byEmail.docs[0];
  }

  if (!leadDoc) {
    return { updated: false, reason: "lead_not_found" };
  }

  const existing = normalizeLead(
    leadDoc.id,
    leadDoc.data() as Record<string, unknown>,
  );
  if (existing.warmStatus !== AWAITING_REPLY_STATUS) {
    return {
      updated: false,
      leadId: existing.id,
      reason: "not_awaiting_reply",
    };
  }

  const patch = {
    warmStatus: EMAIL_OPENED_STATUS,
    lastOutreachOpenedAt: openedAt,
    notes: "Follow-up email opened by recipient.",
    stallReason: "Follow-up email opened by recipient.",
    updatedAt: FieldValue.serverTimestamp(),
  };

  const historyChanges = buildLeadHistoryChanges(existing, patch);
  await leadDoc.ref.update(patch);
  if (historyChanges.length > 0) {
    await appendLeadHistory(existing.id, {
      type: "updated",
      kind: "status",
      summary: summarizeLeadHistory(historyChanges, "updated"),
      changes: filterChangesForKind(historyChanges, "status"),
      actorUid: "brevo",
    });
  }

  return { updated: true, leadId: existing.id };
}
