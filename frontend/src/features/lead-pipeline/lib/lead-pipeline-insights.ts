import type { Lead, LeadQueue, LeadStage } from "@/lib/definitions";
import {
  LEAD_STAGE_LABELS,
  COLD_ATTEMPT_ARCHIVE_THRESHOLD,
  WARM_ATTEMPT_ARCHIVE_THRESHOLD,
  leadQueueBucket,
  normalizeDemoStatus,
  parseWarmStatus,
  warmStatusOptionByValue,
  type LeadQueueBucket,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";

export type NamedCount = { name: string; count: number };

/** One row per shared intensity band; warm_* and cold_* are separate stacks. */
export type AttemptsByQueueRow = {
  band: string;
  warm_Warm: number;
  warm_Cold: number;
  warm_Onboarded: number;
  warm_Archives: number;
  cold_Warm: number;
  cold_Cold: number;
  cold_Onboarded: number;
  cold_Archives: number;
};

export type QueueHealthRadarPoint = {
  queue: string;
  assignedPct: number;
  contactedPct: number;
  followUpPct: number;
  attemptLoad: number;
  fullMark: number;
};

export type LeadPipelineInsightModel = {
  total: number;
  kpis: {
    total: number;
    unassigned: number;
    overdueFollowUps: number;
    dueSoon: number;
    neverContacted: number;
    contactedLast7Days: number;
    accountReady: number;
  };
  byQueue: NamedCount[];
  funnel: NamedCount[];
  /** Cumulative funnel counts for area chart. */
  funnelCumulative: NamedCount[];
  byStatus: NamedCount[];
  byPlatform: NamedCount[];
  bySource: NamedCount[];
  byDemo: NamedCount[];
  byAssignee: Array<{
    name: string;
    count: number;
    overdueFollowUps: number;
  }>;
  followUpHealth: NamedCount[];
  /**
   * Attempt intensity by queue. Warm-track and cold-track are separate stacks
   * on a shared % of archive-limit axis (common denominator).
   */
  attemptsByQueue: AttemptsByQueueRow[];
  queueHealthRadar: QueueHealthRadarPoint[];
  byChannel: NamedCount[];
  accountReady: NamedCount[];
  trialRisk: {
    daysLeftZero: number;
    daysLeftLte3: number;
  };
};

const MS_DAY = 24 * 60 * 60 * 1000;

/** Shared intensity bands (% of each track's archive threshold). */
export const ATTEMPT_INTENSITY_BANDS = [
  "0",
  "<50%",
  "50–99%",
  "At limit",
] as const;

export type AttemptIntensityBand = (typeof ATTEMPT_INTENSITY_BANDS)[number];

type FunnelQueueLabel = "Warm" | "Cold" | "Onboarded" | "Archives";
type QueueLabel = FunnelQueueLabel | "Content";

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function toSortedCounts(map: Map<string, number>, limit?: number): NamedCount[] {
  const rows = [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

function platformLabel(lead: Lead): string {
  if (lead.platformSource === "smartrefill") return "SmartRefill";
  if (lead.platformSource === "smartrefill_legacy") return "Legacy SmartRefill";
  if (lead.leadSource?.trim()) return "Manual / CRM";
  return "Unknown";
}

function statusLabel(lead: Lead): string {
  const parsed = parseWarmStatus(lead.warmStatus);
  if (!parsed.value) return "No status";
  const option = warmStatusOptionByValue(parsed.value);
  if (!option) return lead.warmStatus?.trim() || "No status";
  if (option.requiresDetail && parsed.detail) {
    const detail =
      parsed.detail.length > 28 ?
        `${parsed.detail.slice(0, 28)}…`
      : parsed.detail;
    return `${option.label}: ${detail}`;
  }
  return option.label;
}

/**
 * Map attempt count onto a shared intensity band using that track's archive limit
 * (warm ÷ 8, cold ÷ 3) so both tracks share one X-axis.
 */
export function attemptIntensityBand(
  attempts: number,
  threshold: number,
): AttemptIntensityBand {
  const count = Math.max(0, Number(attempts) || 0);
  if (count <= 0) return "0";
  const limit = Math.max(1, threshold);
  const pct = count / limit;
  if (pct < 0.5) return "<50%";
  if (pct < 1) return "50–99%";
  return "At limit";
}

function queueLabel(queue: Exclude<LeadQueue, "all">): QueueLabel {
  switch (queue) {
  case "content":
    return "Content";
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

function funnelQueueLabel(queue: LeadQueueBucket): FunnelQueueLabel {
  switch (queue) {
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

function emptyAttemptRow(band: AttemptIntensityBand): AttemptsByQueueRow {
  return {
    band,
    warm_Warm: 0,
    warm_Cold: 0,
    warm_Onboarded: 0,
    warm_Archives: 0,
    cold_Warm: 0,
    cold_Cold: 0,
    cold_Onboarded: 0,
    cold_Archives: 0,
  };
}

const FUNNEL_ORDER: LeadStage[] = [
  "inquire",
  "warm",
  "registered",
  "cold",
  "onboarded",
  "archive",
];

const QUEUE_ORDER: Array<{ id: Exclude<LeadQueue, "all">; label: QueueLabel }> =
  [
    { id: "content", label: "Content" },
    { id: "warm", label: "Warm" },
    { id: "cold", label: "Cold" },
    { id: "onboarded", label: "Onboarded" },
    { id: "archive", label: "Archives" },
  ];

/**
 * Build insight charts from the currently loaded lead set
 * (already scoped by queue tab when not "all").
 */
export function buildLeadPipelineInsights(
  leads: Lead[],
  opts: {
    nowMs?: number;
    assigneeNames?: Record<string, string>;
  } = {},
): LeadPipelineInsightModel {
  const nowMs = opts.nowMs ?? Date.now();
  const dueSoonMs = nowMs + 7 * MS_DAY;
  const last7Ms = nowMs - 7 * MS_DAY;

  const statusMap = new Map<string, number>();
  const platformMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const demoMap = new Map<string, number>();
  const channelMap = new Map<string, number>();
  const accountReadyMap = new Map<string, number>([
    ["Ready", 0],
    ["Not ready", 0],
  ]);
  const followUpMap = new Map<string, number>([
    ["Overdue", 0],
    ["Due in 7 days", 0],
    ["Scheduled later", 0],
    ["No follow-up", 0],
  ]);
  const assigneeMap = new Map<
    string,
    { count: number; overdueFollowUps: number }
  >();

  const attemptStack = new Map<AttemptIntensityBand, AttemptsByQueueRow>();
  for (const band of ATTEMPT_INTENSITY_BANDS) {
    attemptStack.set(band, emptyAttemptRow(band));
  }

  const queueStats: Record<
    Exclude<LeadQueue, "all">,
    {
      total: number;
      assigned: number;
      contacted: number;
      withFollowUp: number;
      attemptSum: number;
    }
  > = {
    content: { total: 0, assigned: 0, contacted: 0, withFollowUp: 0, attemptSum: 0 },
    warm: { total: 0, assigned: 0, contacted: 0, withFollowUp: 0, attemptSum: 0 },
    cold: { total: 0, assigned: 0, contacted: 0, withFollowUp: 0, attemptSum: 0 },
    onboarded: {
      total: 0,
      assigned: 0,
      contacted: 0,
      withFollowUp: 0,
      attemptSum: 0,
    },
    archive: {
      total: 0,
      assigned: 0,
      contacted: 0,
      withFollowUp: 0,
      attemptSum: 0,
    },
  };

  let unassigned = 0;
  let overdueFollowUps = 0;
  let dueSoon = 0;
  let neverContacted = 0;
  let contactedLast7Days = 0;
  let accountReadyCount = 0;
  let daysLeftZero = 0;
  let daysLeftLte3 = 0;

  const queueCounts: Record<Exclude<LeadQueue, "all">, number> = {
    content: 0,
    warm: 0,
    cold: 0,
    onboarded: 0,
    archive: 0,
  };

  for (const lead of leads) {
    const funnelQueue = leadQueueBucket(lead.stage);
    const queue = lead.sourceKind === "content" ? "content" : funnelQueue;
    queueCounts[queue] += 1;

    const stats = queueStats[queue];
    stats.total += 1;

    const assigneeKey = lead.assignedToUid?.trim() || "";
    if (!assigneeKey) unassigned += 1;
    else stats.assigned += 1;

    const assigneeBucket = assigneeMap.get(assigneeKey || "unassigned") ?? {
      count: 0,
      overdueFollowUps: 0,
    };
    assigneeBucket.count += 1;

    if (lead.nextFollowUpAt) {
      stats.withFollowUp += 1;
      const followMs = new Date(lead.nextFollowUpAt).getTime();
      if (!Number.isNaN(followMs) && lead.stage !== "archive") {
        if (followMs < nowMs) {
          overdueFollowUps += 1;
          assigneeBucket.overdueFollowUps += 1;
          bump(followUpMap, "Overdue");
        } else if (followMs <= dueSoonMs) {
          dueSoon += 1;
          bump(followUpMap, "Due in 7 days");
        } else {
          bump(followUpMap, "Scheduled later");
        }
      } else {
        bump(followUpMap, "No follow-up");
      }
    } else {
      bump(followUpMap, "No follow-up");
    }
    assigneeMap.set(assigneeKey || "unassigned", assigneeBucket);

    if (!lead.lastContactAt && !lead.firstContactAt) {
      neverContacted += 1;
    } else {
      stats.contacted += 1;
      const lastMs = new Date(
        lead.lastContactAt || lead.firstContactAt || "",
      ).getTime();
      if (!Number.isNaN(lastMs) && lastMs >= last7Ms) {
        contactedLast7Days += 1;
      }
    }

    if (lead.accountReady || lead.workspace?.accountReady) {
      accountReadyCount += 1;
      bump(accountReadyMap, "Ready");
    } else {
      bump(accountReadyMap, "Not ready");
    }

    bump(statusMap, statusLabel(lead));
    bump(platformMap, platformLabel(lead));
    bump(sourceMap, lead.leadSource?.trim() || "Unknown");

    const demo = normalizeDemoStatus(lead.attendedDemo);
    bump(
      demoMap,
      demo === "attended" ? "Attended"
      : demo === "missed" ? "Missed"
      : demo === "not_needed" ? "Not needed"
      : demo === "not_applicable" ? "N/A"
      : "Not set",
    );

    const warmAttempts = Number(lead.warmAttemptCount) || 0;
    const coldAttempts = Number(lead.coldAttemptCount) || 0;
    const qLabel = funnelQueueLabel(funnelQueue);
    stats.attemptSum += warmAttempts + coldAttempts;

    const warmBand = attemptIntensityBand(
      warmAttempts,
      WARM_ATTEMPT_ARCHIVE_THRESHOLD,
    );
    const coldBand = attemptIntensityBand(
      coldAttempts,
      COLD_ATTEMPT_ARCHIVE_THRESHOLD,
    );
    const warmRow = attemptStack.get(warmBand)!;
    const coldRow = attemptStack.get(coldBand)!;
    warmRow[`warm_${qLabel}` as const] += 1;
    coldRow[`cold_${qLabel}` as const] += 1;

    if (lead.channels?.viber) bump(channelMap, "Viber");
    if (lead.channels?.email) bump(channelMap, "Email");
    if (lead.channels?.messenger) bump(channelMap, "Messenger");
    if (lead.channels?.smsCall) bump(channelMap, "SMS / Call");

    const daysLeft = lead.workspace?.trialDaysLeft;
    if (
      typeof daysLeft === "number" &&
      (lead.stage === "registered" || lead.stage === "onboarded")
    ) {
      if (daysLeft === 0) daysLeftZero += 1;
      if (daysLeft <= 3) daysLeftLte3 += 1;
    }
  }

  const funnel = FUNNEL_ORDER.map((stage) => ({
    name: LEAD_STAGE_LABELS[stage] ?? stage,
    count: leads.filter((lead) => lead.stage === stage).length,
  }));

  let running = 0;
  const funnelCumulative = funnel.map((row) => {
    running += row.count;
    return { name: row.name, count: running };
  });

  const attemptsByQueue: AttemptsByQueueRow[] = ATTEMPT_INTENSITY_BANDS.map(
    (band) => attemptStack.get(band)!,
  );

  const queueHealthRadar: QueueHealthRadarPoint[] = QUEUE_ORDER.map(
    ({ id, label }) => {
      const s = queueStats[id];
      const total = s.total || 1;
      const avgAttempts = s.attemptSum / total;
      const attemptLoad = Math.min(
        100,
        Math.round((avgAttempts / WARM_ATTEMPT_ARCHIVE_THRESHOLD) * 100),
      );
      return {
        queue: label,
        assignedPct: Math.round((s.assigned / total) * 100),
        contactedPct: Math.round((s.contacted / total) * 100),
        followUpPct: Math.round((s.withFollowUp / total) * 100),
        attemptLoad: s.total === 0 ? 0 : attemptLoad,
        fullMark: 100,
      };
    },
  );

  return {
    total: leads.length,
    kpis: {
      total: leads.length,
      unassigned,
      overdueFollowUps,
      dueSoon,
      neverContacted,
      contactedLast7Days,
      accountReady: accountReadyCount,
    },
    byQueue: QUEUE_ORDER.map((row) => ({
      name: row.label,
      count: queueCounts[row.id],
    })),
    funnel,
    funnelCumulative,
    byStatus: toSortedCounts(statusMap, 12),
    byPlatform: toSortedCounts(platformMap),
    bySource: toSortedCounts(sourceMap, 10),
    byDemo: toSortedCounts(demoMap),
    byAssignee: [...assigneeMap.entries()]
      .map(([id, row]) => ({
        name:
          id === "unassigned" ?
            "Unassigned"
          : opts.assigneeNames?.[id] || id.slice(0, 12),
        count: row.count,
        overdueFollowUps: row.overdueFollowUps,
      }))
      .sort((a, b) => b.count - a.count),
    followUpHealth: [
      "Overdue",
      "Due in 7 days",
      "Scheduled later",
      "No follow-up",
    ].map((name) => ({ name, count: followUpMap.get(name) ?? 0 })),
    attemptsByQueue,
    queueHealthRadar,
    byChannel: toSortedCounts(channelMap),
    accountReady: [
      { name: "Ready", count: accountReadyMap.get("Ready") ?? 0 },
      { name: "Not ready", count: accountReadyMap.get("Not ready") ?? 0 },
    ],
    trialRisk: { daysLeftZero, daysLeftLte3 },
  };
}
