import type { Lead, LeadAnalytics } from "@/lib/definitions";
import {
  leadQueueBucket,
  normalizeDemoStatus,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import {
  leadHasAssignee,
  resolveAssigneeUids,
} from "@/features/lead-pipeline/lib/lead-assignees";
import { isStalledWarmDemoLead } from "@/features/lead-pipeline/lib/lead-referral-partners";
import type { UserSubscriptionListItem } from "@/features/dashboard/lib/build-user-subscriptions-list";
import {
  daysSinceIso,
  estimateSalesHomeChance,
  type SalesHomeChance,
} from "@/features/dashboard/lib/estimate-sales-home-chance";
import { trialDaysRemainingCount } from "@/lib/dashboard/subscription-labels";

export type SalesHomeIntent =
  | "hello"
  | "close_deal"
  | "referred"
  | "setup"
  | "trial"
  | "plan_risk"
  | "quiet";

export type SalesHomeLink = {
  label: string;
  href: string;
};

export type SalesHomeStationRow = {
  id: string;
  leadId?: string;
  businessName: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  linkedBusinessId?: string;
  now: string;
  shouldBe: string;
  whatIf: string;
  nowLevel: number;
  shouldLevel: number;
  intent: SalesHomeIntent;
  stageLabel: string;
  assignedToYou: boolean;
  canAssign: boolean;
  hasLead: boolean;
  links: SalesHomeLink[];
  chance: SalesHomeChance;
};

type SalesHomeStory = {
  intent: SalesHomeIntent;
  now: string;
  shouldBe: string;
  whatIf: string;
  nowLevel: number;
  shouldLevel: number;
  links: SalesHomeLink[];
};

export type SalesHomeFocus = {
  needFirstHello: number;
  followUpOverdue: number;
  mayLeave: number;
  reachedThisWeek: number;
  talkingWithUs: number;
  alreadyIn: number;
  wentQuiet: number;
  toWin: SalesHomeStationRow[];
  toKeep: SalesHomeStationRow[];
  voucherProspects: number;
};

const MS_DAY = 24 * 60 * 60 * 1000;

const TRIAL_LINK: SalesHomeLink = {
  label: "Open trial roster",
  href: "/subscriptions/trial",
};
const SMARTREFILL_LINK: SalesHomeLink = {
  label: "Open SmartRefill",
  href: "/webapp/smartrefill",
};
const VOUCHER_LINK: SalesHomeLink = {
  label: "Open vouchers",
  href: "/subscriptions/vouchers-affiliates",
};

function isOpenQueue(lead: Lead): boolean {
  return leadQueueBucket(lead.stage) !== "archive";
}

function neverContacted(lead: Lead): boolean {
  return !lead.lastContactAt && !lead.firstContactAt;
}

function followUpOverdue(lead: Lead, nowMs: number): boolean {
  if (!lead.nextFollowUpAt || !isOpenQueue(lead)) return false;
  const due = Date.parse(lead.nextFollowUpAt);
  return Number.isFinite(due) && due < nowMs;
}

function contactedThisWeek(lead: Lead, nowMs: number): boolean {
  const lastMs = Date.parse(lead.lastContactAt || lead.firstContactAt || "");
  if (!Number.isFinite(lastMs)) return false;
  return lastMs >= nowMs - 7 * MS_DAY;
}

function trialDaysLeft(lead: Lead): number | null {
  const days = lead.workspace?.trialDaysLeft;
  if (typeof days !== "number" || !Number.isFinite(days)) return null;
  return days;
}

function stageLabel(lead: Lead): string {
  const bucket = leadQueueBucket(lead.stage);
  if (bucket === "warm") return "Talking with us";
  if (bucket === "onboarded") return "Already in";
  if (bucket === "cold") return "Went quiet";
  if (bucket === "archive") return "Archived";
  return "Heard about us";
}

function stationName(lead: Lead): string {
  return lead.businessName?.trim() || lead.ownerName?.trim() || "Untitled station";
}

function keepFromLead(lead: Lead): SalesHomeStory | null {
  if (!isOpenQueue(lead)) return null;
  const flags = lead.onboardedMonitor?.flags ?? [];
  if (flags.includes("subscription_grace_period")) {
    return {
      intent: "plan_risk",
      now: "Plan lapsed — still recoverable",
      shouldBe: "Back on a live plan, using the station",
      whatIf: "If nobody checks in, access stays broken and they leave",
      nowLevel: 1,
      shouldLevel: 4,
      links: [SMARTREFILL_LINK],
    };
  }
  if (flags.includes("subscription_expiring_soon")) {
    return {
      intent: "plan_risk",
      now: "Plan ends within 7 days, no next step yet",
      shouldBe: "They already know what happens when it renews",
      whatIf: "If we stay quiet, the plan ends in silence",
      nowLevel: 2,
      shouldLevel: 4,
      links: [SMARTREFILL_LINK],
    };
  }
  const days = trialDaysLeft(lead);
  if (days !== null && days <= 3) {
    return trialStory(days);
  }
  if (flags.includes("journey_inactive_day8")) {
    return {
      intent: "quiet",
      now: "New station went quiet this week",
      shouldBe: "They sign in again and keep using it",
      whatIf: "If this week stays silent, they never form a habit",
      nowLevel: 2,
      shouldLevel: 4,
      links: [SMARTREFILL_LINK],
    };
  }
  if (flags.includes("recommend_move_to_cold")) {
    return {
      intent: "quiet",
      now: "No activity — we do not know if they still want this",
      shouldBe: "A clear yes or no, and a live station if yes",
      whatIf: "If we do not ask, they fade without a reason",
      nowLevel: 1,
      shouldLevel: 3,
      links: [SMARTREFILL_LINK],
    };
  }
  if (
    lead.stage === "onboarded" &&
    (lead.gettingStartedCompleted ?? 0) < 3 &&
    (lead.onboardedMonitor?.journeyDay ?? 0) >= 8
  ) {
    return {
      intent: "setup",
      now: "In the app, setup still unfinished",
      shouldBe: "Getting started complete so they can operate",
      whatIf: "If setup stays stuck, they never run day to day",
      nowLevel: 2,
      shouldLevel: 4,
      links: [SMARTREFILL_LINK],
    };
  }
  return null;
}

function trialStory(days: number): SalesHomeStory {
  if (days < 0) {
    return {
      intent: "trial",
      now: "Trial already ended",
      shouldBe: "They know the next step",
      whatIf: "They disappear because the trial stopped with no one there",
      nowLevel: 1,
      shouldLevel: 4,
      links: [TRIAL_LINK],
    };
  }
  if (days === 0) {
    return {
      intent: "trial",
      now: "Trial ended today",
      shouldBe: "A next step agreed today",
      whatIf: "If we miss today, they drop off overnight",
      nowLevel: 1,
      shouldLevel: 4,
      links: [TRIAL_LINK],
    };
  }
  return {
    intent: "trial",
    now: `Trial has ${days} day${days === 1 ? "" : "s"} left`,
    shouldBe: "Check-in before it ends so they are not surprised",
    whatIf: "If we wait until it expires, they leave overnight",
    nowLevel: 2,
    shouldLevel: 4,
    links: [TRIAL_LINK],
  };
}

function winFromLead(
  lead: Lead,
  closeDealIds: Set<string>,
  checkoutIds: Set<string>,
): SalesHomeStory | null {
  if (!isOpenQueue(lead)) return null;
  if (closeDealIds.has(lead.id)) {
    return {
      intent: "close_deal",
      now: "Demo done, then it stalled",
      shouldBe: "They pick a next step and keep talking",
      whatIf: "If this sits, the demo was wasted and they never come in",
      nowLevel: 2,
      shouldLevel: 4,
      links: [VOUCHER_LINK],
    };
  }
  if (checkoutIds.has(lead.id)) {
    return {
      intent: "referred",
      now: "Someone already sent them in",
      shouldBe: "We greet them and they finish signing up",
      whatIf: "If we ignore the referral, they and the partner both go quiet",
      nowLevel: 2,
      shouldLevel: 4,
      links: [VOUCHER_LINK],
    };
  }
  if (neverContacted(lead) && lead.stage !== "onboarded") {
    return {
      intent: "hello",
      now: "Waiting — nobody has said hello",
      shouldBe: "A first check-in so they know someone is with them",
      whatIf: "If we stay quiet, they assume we are not serious and go cold",
      nowLevel: 1,
      shouldLevel: 3,
      links: [],
    };
  }
  if (lead.stage === "registered") {
    return {
      intent: "setup",
      now: "Signed up, not fully in yet",
      shouldBe: "Setup finished so they can actually use the station",
      whatIf: "If setup stays incomplete, they never become a real station",
      nowLevel: 2,
      shouldLevel: 4,
      links: [SMARTREFILL_LINK],
    };
  }
  if (lead.stage === "onboarded" && neverContacted(lead)) {
    return {
      intent: "hello",
      now: "Already in the app, 0 welcomes",
      shouldBe: "One welcome so they know we are here",
      whatIf: "If nobody says hello, they use it alone and may not stay",
      nowLevel: 3,
      shouldLevel: 4,
      links: [SMARTREFILL_LINK],
    };
  }
  return null;
}

function chanceFromLead(
  lead: Lead,
  intent: SalesHomeIntent,
  nowMs: number,
): SalesHomeChance {
  return estimateSalesHomeChance({
    intent,
    stage: lead.stage,
    assigned: resolveAssigneeUids(lead).length > 0,
    hasEmail: Boolean(lead.email?.trim()),
    hasPhone: Boolean(lead.phone?.trim()),
    neverContacted: neverContacted(lead),
    contactedThisWeek: contactedThisWeek(lead, nowMs),
    attendedDemo: normalizeDemoStatus(lead.attendedDemo) === "attended",
    stallReason: lead.stallReason,
    warmAttempts: lead.warmAttemptCount ?? lead.attemptCount,
    followUpOverdue: followUpOverdue(lead, nowMs),
    trialDays: trialDaysLeft(lead),
    gettingStarted:
      lead.gettingStartedCompleted ?? lead.onboardedMonitor?.gettingStartedCompleted,
    activityDays: lead.onboardedMonitor?.activityDayCount,
    isActive: lead.onboardedMonitor?.isActive,
    daysSinceContact: daysSinceIso(
      lead.lastContactAt || lead.firstContactAt,
      nowMs,
    ),
    referred: Boolean(
      lead.referredBy?.trim() ||
        lead.referredByAffiliateCode?.trim() ||
        lead.contentReferrer?.trim(),
    ),
  });
}

function toRow(
  lead: Lead,
  scored: SalesHomeStory,
  uid: string | undefined,
  nowMs: number,
): SalesHomeStationRow {
  const assignedToYou = Boolean(uid && leadHasAssignee(lead, uid));
  return {
    id: lead.id,
    leadId: lead.id,
    businessName: stationName(lead),
    ownerName: lead.ownerName,
    email: lead.email?.trim() || undefined,
    phone: lead.phone?.trim() || undefined,
    linkedBusinessId: lead.linkedBusinessId,
    now: scored.now,
    shouldBe: scored.shouldBe,
    whatIf: scored.whatIf,
    nowLevel: scored.nowLevel,
    shouldLevel: scored.shouldLevel,
    intent: scored.intent,
    stageLabel: stageLabel(lead),
    assignedToYou,
    canAssign: Boolean(uid && !assignedToYou),
    hasLead: true,
    links: scored.links,
    chance: chanceFromLead(lead, scored.intent, nowMs),
  };
}

function matchLeadForBusiness(
  leads: Lead[],
  item: UserSubscriptionListItem,
): Lead | undefined {
  const email = item.ownerEmail?.trim().toLowerCase();
  return leads.find(
    (lead) =>
      lead.linkedBusinessId === item.businessId ||
      (email && lead.email?.trim().toLowerCase() === email),
  );
}

function subscriptionKeepRow(
  item: UserSubscriptionListItem,
  now: Date,
  matched: Lead | undefined,
  uid?: string,
): SalesHomeStationRow | null {
  const days = trialDaysRemainingCount(item.subscription.expiresAt, now);
  const isTrial = item.planTier === "trial" || item.opsBucket === "trial";
  const trialSoon = isTrial && days !== null && days <= 3;
  if (!trialSoon && !item.isGrace && !item.isExpiringSoon) return null;

  const intent: SalesHomeIntent = trialSoon ? "trial" : "plan_risk";
  const story: SalesHomeStory =
    trialSoon && days !== null ?
      trialStory(days)
    : item.isGrace ?
      {
        intent,
        now: "Plan lapsed — still recoverable",
        shouldBe: "Back on a live plan, using the station",
        whatIf: "If nobody checks in, access stays broken and they leave",
        nowLevel: 1,
        shouldLevel: 4,
        links: [SMARTREFILL_LINK],
      }
    : {
        intent,
        now: "Plan ends within 7 days, no next step yet",
        shouldBe: "They already know what happens when it renews",
        whatIf: "If we stay quiet, the plan ends in silence",
        nowLevel: 2,
        shouldLevel: 4,
        links: [SMARTREFILL_LINK],
      };

  if (matched) {
    return toRow(matched, story, uid, now.getTime());
  }

  return {
    id: `sub:${item.businessId}`,
    businessName: item.businessName,
    email: item.ownerEmail,
    linkedBusinessId: item.businessId,
    now: story.now,
    shouldBe: story.shouldBe,
    whatIf: story.whatIf,
    nowLevel: story.nowLevel,
    shouldLevel: story.shouldLevel,
    intent: story.intent,
    stageLabel: "Already in",
    assignedToYou: false,
    canAssign: false,
    hasLead: false,
    links: story.links,
    chance: estimateSalesHomeChance({
      intent: story.intent,
      stage: "onboarded",
      hasEmail: Boolean(item.ownerEmail),
      trialDays: days,
      isGrace: item.isGrace,
      daysSinceLogin: daysSinceIso(item.lastActiveDay, now.getTime()),
    }),
  };
}

function winRank(intent: SalesHomeIntent): number {
  if (intent === "close_deal") return 0;
  if (intent === "referred") return 1;
  if (intent === "hello") return 2;
  if (intent === "setup") return 3;
  return 9;
}

function keepRank(intent: SalesHomeIntent): number {
  if (intent === "trial") return 0;
  if (intent === "plan_risk") return 1;
  if (intent === "setup") return 2;
  return 3;
}

function mergeLinks(
  current: SalesHomeLink[],
  extra: SalesHomeLink[],
): SalesHomeLink[] {
  const seen = new Set(current.map((link) => link.href));
  const next = [...current];
  for (const link of extra) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    next.push(link);
  }
  return next;
}

function upgradeKeepRow(
  existing: SalesHomeStationRow,
  incoming: SalesHomeStationRow,
): void {
  if (keepRank(incoming.intent) < keepRank(existing.intent)) {
    existing.intent = incoming.intent;
    existing.now = incoming.now;
    existing.shouldBe = incoming.shouldBe;
    existing.whatIf = incoming.whatIf;
    existing.nowLevel = incoming.nowLevel;
    existing.shouldLevel = incoming.shouldLevel;
    existing.links = incoming.links;
    existing.chance = incoming.chance;
  }
  existing.links = mergeLinks(existing.links, incoming.links);
  if (incoming.email && !existing.email) existing.email = incoming.email;
  if (incoming.linkedBusinessId && !existing.linkedBusinessId) {
    existing.linkedBusinessId = incoming.linkedBusinessId;
  }
}

/**
 * Sales home: who to win, who to keep. No money, prices, or commissions.
 */
export function buildSalesHomeFocus(
  leads: Lead[],
  analytics: LeadAnalytics | null,
  opts: {
    nowMs?: number;
    uid?: string;
    limit?: number;
    subscriptions?: UserSubscriptionListItem[];
  } = {},
): SalesHomeFocus {
  const nowMs = opts.nowMs ?? Date.now();
  const limit = opts.limit ?? 8;
  const uid = opts.uid;
  const now = new Date(nowMs);

  const closeDealIds = new Set(
    leads.filter((lead) => isStalledWarmDemoLead(lead, nowMs)).map((lead) => lead.id),
  );
  const checkoutIds = new Set(
    leads
      .filter((lead) => {
        if (closeDealIds.has(lead.id) || lead.accountReady) return false;
        if (
          lead.stage !== "inquire" &&
          lead.stage !== "warm" &&
          lead.stage !== "registered"
        ) {
          return false;
        }
        const referred = Boolean(
          lead.referredBy?.trim() ||
            lead.referredByAffiliateCode?.trim() ||
            lead.contentReferrer?.trim(),
        );
        const attended = normalizeDemoStatus(lead.attendedDemo) === "attended";
        return referred && (attended || lead.stage === "registered");
      })
      .map((lead) => lead.id),
  );

  let needFirstHello = 0;
  let overdue = 0;
  let mayLeave = 0;
  let reachedThisWeek = 0;
  const toWin: SalesHomeStationRow[] = [];
  const toKeep: SalesHomeStationRow[] = [];
  const seenWin = new Set<string>();
  const seenKeep = new Set<string>();

  for (const lead of leads) {
    if (!isOpenQueue(lead)) continue;
    if (neverContacted(lead)) needFirstHello += 1;
    if (followUpOverdue(lead, nowMs)) overdue += 1;
    if (contactedThisWeek(lead, nowMs)) reachedThisWeek += 1;
    const keep = keepFromLead(lead);
    if (keep) {
      mayLeave += 1;
      if (!seenKeep.has(lead.id)) {
        seenKeep.add(lead.id);
        toKeep.push(toRow(lead, keep, uid, nowMs));
      }
    }
    const win = winFromLead(lead, closeDealIds, checkoutIds);
    if (win && !seenWin.has(lead.id)) {
      seenWin.add(lead.id);
      toWin.push(toRow(lead, win, uid, nowMs));
    }
  }

  for (const item of opts.subscriptions ?? []) {
    const matched = matchLeadForBusiness(leads, item);
    const row = subscriptionKeepRow(item, now, matched, uid);
    if (!row) continue;
    const existing = toKeep.find(
      (keep) =>
        keep.id === row.id ||
        (row.leadId && keep.leadId === row.leadId) ||
        (item.businessId && keep.linkedBusinessId === item.businessId),
    );
    if (existing) {
      upgradeKeepRow(existing, row);
      continue;
    }
    seenKeep.add(row.leadId || row.id);
    seenKeep.add(item.businessId);
    toKeep.push(row);
    mayLeave += 1;
  }

  toWin.sort(
    (a, b) =>
      winRank(a.intent) - winRank(b.intent) ||
      b.chance.percent - a.chance.percent ||
      Number(b.assignedToYou) - Number(a.assignedToYou),
  );
  toKeep.sort(
    (a, b) =>
      keepRank(a.intent) - keepRank(b.intent) ||
      b.chance.percent - a.chance.percent ||
      Number(b.assignedToYou) - Number(a.assignedToYou),
  );
  toWin.splice(limit);
  toKeep.splice(limit);

  return {
    needFirstHello,
    followUpOverdue: overdue,
    mayLeave,
    reachedThisWeek,
    talkingWithUs: analytics?.queueCounts.warm ?? 0,
    alreadyIn: analytics?.queueCounts.onboarded ?? 0,
    wentQuiet: analytics?.queueCounts.cold ?? 0,
    toWin,
    toKeep,
    voucherProspects: closeDealIds.size + checkoutIds.size,
  };
}
