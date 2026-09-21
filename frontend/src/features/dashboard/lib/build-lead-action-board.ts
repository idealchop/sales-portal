import type { Lead, OnboardedMonitorFlag } from "@/lib/definitions";
import {
  LEAD_STAGE_LABELS,
  leadQueueBucket,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";

export type LeadActionKind =
  | "overdue_follow_up"
  | "due_soon"
  | "never_contacted"
  | "no_follow_up"
  | "recommend_move_to_cold"
  | "subscription_grace_period"
  | "subscription_expiring_soon"
  | "journey_inactive_day8"
  | "subscription_renew"
  | "subscription_change"
  | "active";

export type LeadActionPriority = "high" | "medium" | "low";

export type LeadActionItem = {
  id: string;
  leadId: string;
  title: string;
  subtitle: string;
  kind: LeadActionKind;
  priority: LeadActionPriority;
  href: string;
  nextFollowUpAt?: string | null;
  stageLabel: string;
  queueLabel: string;
  email?: string;
  phone?: string;
  ownerName?: string;
  linkedBusinessId?: string;
  userId?: string;
  suggestedAction: string;
};

export type LeadActionBoardSummary = {
  assigned: number;
  overdue: number;
  dueSoon: number;
  neverContacted: number;
  contactedLast7Days: number;
};

export type LeadActionBoard = {
  summary: LeadActionBoardSummary;
  items: LeadActionItem[];
};

const MS_DAY = 24 * 60 * 60 * 1000;

const KIND_RANK: Record<LeadActionKind, number> = {
  overdue_follow_up: 0,
  recommend_move_to_cold: 1,
  subscription_grace_period: 2,
  subscription_expiring_soon: 3,
  journey_inactive_day8: 4,
  due_soon: 5,
  never_contacted: 6,
  subscription_renew: 7,
  subscription_change: 8,
  no_follow_up: 9,
  active: 10,
};

const MONITOR_FLAG_KIND: Partial<
  Record<OnboardedMonitorFlag, LeadActionKind>
> = {
  recommend_move_to_cold: "recommend_move_to_cold",
  subscription_grace_period: "subscription_grace_period",
  subscription_expiring_soon: "subscription_expiring_soon",
  journey_inactive_day8: "journey_inactive_day8",
  subscription_renew: "subscription_renew",
  subscription_change: "subscription_change",
};

function queueLabel(stage: Lead["stage"]): string {
  const bucket = leadQueueBucket(stage);
  switch (bucket) {
  case "warm":
    return "Warm";
  case "cold":
    return "Cold";
  case "onboarded":
    return "Onboarded";
  case "archive":
    return "Archives";
  }
}

function priorityForKind(kind: LeadActionKind): LeadActionPriority {
  switch (kind) {
  case "overdue_follow_up":
  case "recommend_move_to_cold":
  case "subscription_grace_period":
    return "high";
  case "subscription_expiring_soon":
  case "journey_inactive_day8":
  case "due_soon":
  case "never_contacted":
    return "medium";
  default:
    return "low";
  }
}

function bestMonitorKind(
  flags: OnboardedMonitorFlag[] | undefined,
): LeadActionKind | null {
  if (!flags?.length) return null;
  let best: LeadActionKind | null = null;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const flag of flags) {
    const kind = MONITOR_FLAG_KIND[flag];
    if (!kind) continue;
    const rank = KIND_RANK[kind];
    if (rank < bestRank) {
      best = kind;
      bestRank = rank;
    }
  }
  return best;
}

function classifyLead(
  lead: Lead,
  nowMs: number,
  dueSoonMs: number,
): { kind: LeadActionKind; priority: LeadActionPriority } {
  const followMs =
    lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).getTime() : NaN;
  const hasFollowUp = !Number.isNaN(followMs);
  const isArchive = leadQueueBucket(lead.stage) === "archive";
  const neverContacted = !lead.lastContactAt && !lead.firstContactAt;
  const monitorKind = bestMonitorKind(lead.onboardedMonitor?.flags);

  if (hasFollowUp && !isArchive && followMs < nowMs) {
    return { kind: "overdue_follow_up", priority: "high" };
  }

  // Onboarded monitor flags (flag-only cold / subscription) outrank soft follow-ups.
  if (monitorKind) {
    return { kind: monitorKind, priority: priorityForKind(monitorKind) };
  }

  if (hasFollowUp && !isArchive && followMs <= dueSoonMs) {
    return { kind: "due_soon", priority: "medium" };
  }
  if (neverContacted && !isArchive) {
    return { kind: "never_contacted", priority: "medium" };
  }
  if (!hasFollowUp && !isArchive && leadQueueBucket(lead.stage) !== "onboarded") {
    return { kind: "no_follow_up", priority: "low" };
  }
  return { kind: "active", priority: "low" };
}

function kindLabel(kind: LeadActionKind): string {
  switch (kind) {
  case "overdue_follow_up":
    return "Overdue check-in";
  case "due_soon":
    return "Check in this week";
  case "never_contacted":
    return "Say hello";
  case "no_follow_up":
    return "Set a follow-up";
  case "journey_inactive_day8":
    return "New station went quiet";
  case "recommend_move_to_cold":
    return "Went quiet";
  case "subscription_expiring_soon":
    return "Plan ending soon";
  case "subscription_grace_period":
    return "Plan lapsed — they can still come back";
  case "subscription_renew":
    return "Came back";
  case "subscription_change":
    return "Plan changed";
  case "active":
    return "Assigned lead";
  }
}

function suggestedAction(kind: LeadActionKind): string {
  switch (kind) {
  case "never_contacted":
    return "Send a hello, then set the next check-in so this does not get lost.";
  case "overdue_follow_up":
    return "Reach out today, then pick the next check-in date.";
  case "due_soon":
    return "Confirm the call or visit, then log that you checked in.";
  case "no_follow_up":
    return "Set a check-in date so this station stays on your week.";
  case "journey_inactive_day8":
    return "Ask if they got stuck during setup.";
  case "recommend_move_to_cold":
    return "Check if they still want SmartRefill. If not, move them to cold in the pipeline.";
  case "subscription_expiring_soon":
    return "Check in so they know how to stay on the plan.";
  case "subscription_grace_period":
    return "They can still come back — send a catch-up today.";
  case "subscription_renew":
    return "Say thanks and ask if they need help using the station.";
  case "subscription_change":
    return "Confirm the plan change and that they can still work as usual.";
  case "active":
    return "Open the pipeline if you need the full history.";
  }
}

/** Local calendar day `YYYY-MM-DD`. */
export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Today’s work includes overdue and undated tasks (they have no calendar
 * date, but they are still the job for this morning).
 */
export function leadActionMatchesDay(
  item: Pick<LeadActionItem, "nextFollowUpAt" | "kind">,
  selectedDay: string | null,
  todayKey: string,
): boolean {
  if (!selectedDay) return true;
  const key = item.nextFollowUpAt ? localDayKey(new Date(item.nextFollowUpAt)) : null;
  if (key === selectedDay) return true;
  if (selectedDay !== todayKey) return false;
  if (!key) return true;
  return key < todayKey;
}

function formatFollowUp(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Build a personal action board from leads assigned to the current user.
 * Archives are counted in assigned total but only surface when overdue was set.
 * Onboarded leads surface when they have journey / subscription monitor flags.
 */
export function buildLeadActionBoard(
  leads: Lead[],
  opts: { nowMs?: number; limit?: number } = {},
): LeadActionBoard {
  const nowMs = opts.nowMs ?? Date.now();
  const dueSoonMs = nowMs + 7 * MS_DAY;
  const last7Ms = nowMs - 7 * MS_DAY;
  const limit = opts.limit ?? 40;

  let overdue = 0;
  let dueSoon = 0;
  let neverContacted = 0;
  let contactedLast7Days = 0;

  const classified = leads.map((lead) => {
    const { kind, priority } = classifyLead(lead, nowMs, dueSoonMs);
    if (kind === "overdue_follow_up") overdue += 1;
    if (kind === "due_soon") dueSoon += 1;
    if (kind === "never_contacted") neverContacted += 1;

    const lastMs = new Date(
      lead.lastContactAt || lead.firstContactAt || "",
    ).getTime();
    if (!Number.isNaN(lastMs) && lastMs >= last7Ms) {
      contactedLast7Days += 1;
    }

    const stageLabel = LEAD_STAGE_LABELS[lead.stage] ?? lead.stage;
    const qLabel = queueLabel(lead.stage);
    const followLabel = formatFollowUp(lead.nextFollowUpAt);
    const status = lead.warmStatus?.trim();
    const journey =
      lead.onboardedMonitor ?
        `Day ${lead.onboardedMonitor.journeyDay}`
      : null;
    const subtitleParts = [
      kindLabel(kind),
      qLabel,
      journey,
      status || null,
      followLabel ? `Follow-up ${followLabel}` : null,
    ].filter(Boolean);

    return {
      id: lead.id,
      leadId: lead.id,
      title: lead.businessName || lead.ownerName || "Untitled lead",
      subtitle: subtitleParts.join(" · "),
      kind,
      priority,
      href: `/lead-pipeline`,
      nextFollowUpAt: lead.nextFollowUpAt,
      stageLabel,
      queueLabel: qLabel,
      email: lead.email?.trim() || undefined,
      phone: lead.phone?.trim() || undefined,
      ownerName: lead.ownerName,
      linkedBusinessId: lead.linkedBusinessId,
      userId: lead.userId,
      suggestedAction: suggestedAction(kind),
      _rank: KIND_RANK[kind],
      _followMs: lead.nextFollowUpAt ?
        new Date(lead.nextFollowUpAt).getTime()
      : Number.POSITIVE_INFINITY,
    };
  });

  const actionable = classified
    .filter((row) => row.kind !== "active")
    .sort((a, b) => {
      if (a._rank !== b._rank) return a._rank - b._rank;
      if (a._followMs !== b._followMs) return a._followMs - b._followMs;
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit)
    .map(({ _rank: _r, _followMs: _f, ...item }) => item);

  return {
    summary: {
      assigned: leads.length,
      overdue,
      dueSoon,
      neverContacted,
      contactedLast7Days,
    },
    items: actionable,
  };
}
