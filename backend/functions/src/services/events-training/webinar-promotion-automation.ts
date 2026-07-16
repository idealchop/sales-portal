/**
 * Auto promotion plan for published webinars (email + in-app / push).
 *
 * On publish:
 *  - Email members immediately
 *  - Weekly reminders until the event
 *  - Countdown email: 7d / 3d / 1d / 1h + ongoing at start
 */

import {
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import type {
  ScheduleAudience,
  ScheduleChannel,
  SchedulePurpose,
} from "../../constants/events-training";
import { toIsoString } from "../sales-serializer";
import {
  composeWebinarScheduleMessage,
  type SchedulePurpose as ComposerPurpose,
} from "./schedule-message-composer";
import {
  eventsTrainingRoot,
  schedulesCollection,
  webinarsCollection,
} from "./events-training-db";

export type PromotionMilestoneKey =
  | "publish"
  | "weekly"
  | "d7"
  | "d3"
  | "d1"
  | "h1"
  | "ongoing";

export type PromotionMilestoneDef = {
  key: PromotionMilestoneKey;
  label: string;
  purpose: SchedulePurpose;
  audience: ScheduleAudience;
  channels: ScheduleChannel[];
  timing:
    | { kind: "immediate" }
    | { kind: "weekly" }
    | { kind: "days_before"; days: number }
    | { kind: "hours_before"; hours: number }
    | { kind: "at_start" };
};

/** Canonical automated email plan. */
export const WEBINAR_PROMOTION_MILESTONES: PromotionMilestoneDef[] = [
  {
    key: "publish",
    label: "On publish",
    purpose: "new_webinar",
    audience: "all_members",
    channels: ["email", "in_app"],
    timing: { kind: "immediate" },
  },
  {
    key: "weekly",
    label: "Weekly reminder",
    purpose: "upcoming_webinar",
    audience: "all_members",
    channels: ["email", "in_app"],
    timing: { kind: "weekly" },
  },
  {
    key: "d7",
    label: "7 days before",
    purpose: "upcoming_webinar",
    audience: "all_members",
    channels: ["email", "in_app"],
    timing: { kind: "days_before", days: 7 },
  },
  {
    key: "d3",
    label: "3 days before",
    purpose: "upcoming_webinar",
    audience: "all_members",
    channels: ["email", "in_app"],
    timing: { kind: "days_before", days: 3 },
  },
  {
    key: "d1",
    label: "1 day before",
    purpose: "reminder",
    audience: "all_members",
    channels: ["email", "in_app"],
    timing: { kind: "days_before", days: 1 },
  },
  {
    key: "h1",
    label: "1 hour before",
    purpose: "reminder",
    audience: "registrants",
    channels: ["email", "in_app", "push"],
    timing: { kind: "hours_before", hours: 1 },
  },
  {
    key: "ongoing",
    label: "On-going (at start)",
    purpose: "ongoing_webinar",
    audience: "registrants",
    channels: ["email", "in_app", "push"],
    timing: { kind: "at_start" },
  },
];

export type AutomationPlanItem = {
  milestoneKey: PromotionMilestoneKey;
  label: string;
  purpose: SchedulePurpose;
  audience: ScheduleAudience;
  channels: ScheduleChannel[];
  scheduleId: string | null;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  daysBefore: number | null;
  hoursBefore: number | null;
  scheduleKind: string;
};

export type WebinarAutomationPlan = {
  webinarId: string;
  webinarName: string;
  startsAt: string | null;
  status: string;
  automationEnabled: boolean;
  items: AutomationPlanItem[];
};

function weekdayFromIso(startsAt: string | null): number {
  if (!startsAt) return 1;
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return 1;
  return d.getUTCDay();
}

function computeNextRunAt(
  milestone: PromotionMilestoneDef,
  startsAt: string | null,
): Date | null {
  const now = new Date();
  if (milestone.timing.kind === "immediate") return now;
  if (!startsAt) return null;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return null;

  if (milestone.timing.kind === "at_start") return start;
  if (milestone.timing.kind === "days_before") {
    return new Date(start.getTime() - milestone.timing.days * 24 * 60 * 60 * 1000);
  }
  if (milestone.timing.kind === "hours_before") {
    return new Date(start.getTime() - milestone.timing.hours * 60 * 60 * 1000);
  }
  if (milestone.timing.kind === "weekly") {
    const next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return next < start ? next : null;
  }
  return null;
}

async function listSchedulesForWebinar(webinarId: string) {
  const snap = await schedulesCollection()
    .where("targetId", "==", webinarId)
    .limit(100)
    .get();
  return snap.docs;
}

async function findScheduleByMilestone(
  webinarId: string,
  milestoneKey: string,
): Promise<QueryDocumentSnapshot | null> {
  const docs = await listSchedulesForWebinar(webinarId);
  return (
    docs.find((doc) => String(doc.data()?.milestoneKey || "") === milestoneKey) ??
    null
  );
}

async function queueEmailNotification(input: {
  webinarId: string;
  purpose: SchedulePurpose;
  milestoneKey: string;
  actorUid: string;
  subject: string;
  body: string;
  audience: ScheduleAudience;
}): Promise<string> {
  const ref = eventsTrainingRoot()
    .collection("events_training_email_queue")
    .doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({
    webinarId: input.webinarId,
    purpose: input.purpose,
    milestoneKey: input.milestoneKey,
    subject: input.subject,
    body: input.body,
    audience: input.audience,
    status: "queued",
    channel: "email",
    createdByUid: input.actorUid,
    createdAt: now,
    updatedAt: now,
    sentAt: null,
  });
  return ref.id;
}

function webinarComposerInput(
  webinarId: string,
  data: Record<string, unknown>,
) {
  return {
    id: webinarId,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    speaker: String(data.speaker ?? ""),
    host: String(data.host ?? ""),
    startsAt: toIsoString(data.startsAt),
    endsAt: toIsoString(data.endsAt),
    timezone:
      typeof data.timezone === "string" && data.timezone.trim() ?
        data.timezone.trim() :
        "Asia/Manila",
    posterUrl: typeof data.posterUrl === "string" ? data.posterUrl : null,
    capacity:
      data.capacity == null || data.capacity === "" ?
        null :
        Number(data.capacity),
    registrationCount: Number(data.registrationCount) || 0,
    certificationEnabled: data.certificationEnabled === true,
    status: String(data.status ?? ""),
  };
}

async function upsertMilestoneSchedule(input: {
  webinarId: string;
  milestone: PromotionMilestoneDef;
  startsAt: string | null;
  actor: { uid: string; email?: string };
  automationEnabled: boolean;
}): Promise<string> {
  const existing = await findScheduleByMilestone(
    input.webinarId,
    input.milestone.key,
  );
  const nextRun = computeNextRunAt(input.milestone, input.startsAt);
  const now = FieldValue.serverTimestamp();

  let scheduleKind:
    | "fixed_datetime"
    | "recurring_weekday"
    | "relative_before_event" = "fixed_datetime";
  let daysBefore: number | null = null;
  let hoursBefore: number | null = null;
  let weekday: number | null = null;
  let fixedAt: Timestamp | null = null;

  const timing = input.milestone.timing;
  if (timing.kind === "immediate" || timing.kind === "at_start") {
    scheduleKind = "fixed_datetime";
    fixedAt = nextRun ? Timestamp.fromDate(nextRun) : null;
  } else if (timing.kind === "weekly") {
    scheduleKind = "recurring_weekday";
    weekday = weekdayFromIso(input.startsAt);
  } else if (timing.kind === "days_before") {
    scheduleKind = "relative_before_event";
    daysBefore = timing.days;
  } else if (timing.kind === "hours_before") {
    scheduleKind = "relative_before_event";
    daysBefore = 0;
    hoursBefore = timing.hours;
  }

  const payload = {
    targetType: "webinar_event" as const,
    targetId: input.webinarId,
    purpose: input.milestone.purpose,
    milestoneKey: input.milestone.key,
    milestoneLabel: input.milestone.label,
    automated: true,
    scheduleKind,
    fixedAt,
    weekday,
    daysBefore,
    hoursBefore,
    channels: input.milestone.channels,
    audience: input.milestone.audience,
    messageTemplate: "",
    emailTemplateKey: `webinar-${input.milestone.key}`,
    metaChannel: false,
    enabled: input.automationEnabled,
    nextRunAt: nextRun ? Timestamp.fromDate(nextRun) : null,
    updatedBy: { uid: input.actor.uid, email: input.actor.email ?? "" },
    updatedAt: now,
  };

  if (existing) {
    await existing.ref.set(payload, { merge: true });
    return existing.id;
  }

  const ref = schedulesCollection().doc();
  await ref.set({
    ...payload,
    lastRunAt: null,
    createdBy: { uid: input.actor.uid, email: input.actor.email ?? "" },
    createdAt: now,
  });
  return ref.id;
}

/**
 * Install / refresh the full automation plan when a webinar is published
 * (or when its start time changes while published).
 */
export async function installWebinarPromotionAutomation(input: {
  webinarId: string;
  actor: { uid: string; email?: string };
  /** When true, enqueue immediate email for the publish milestone. */
  fireImmediate?: boolean;
}): Promise<WebinarAutomationPlan> {
  const webinarId = input.webinarId.trim();
  if (!webinarId) throw new Error("TARGET_REQUIRED");

  const snap = await webinarsCollection().doc(webinarId).get();
  if (!snap.exists) throw new Error("WEBINAR_NOT_FOUND");
  const data = snap.data() ?? {};
  const status = String(data.status ?? "");
  const startsAt = toIsoString(data.startsAt);
  const automationEnabled = data.promotionAutomationEnabled !== false;
  const composedBase = composeWebinarScheduleMessage({
    purpose: "new_webinar",
    webinar: webinarComposerInput(webinarId, data),
  });

  await webinarsCollection().doc(webinarId).set(
    {
      promotionAutomationEnabled: automationEnabled,
      promotionAutomationInstalledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const activeKeys = new Set(
    WEBINAR_PROMOTION_MILESTONES.map((milestone) => milestone.key),
  );
  for (const milestone of WEBINAR_PROMOTION_MILESTONES) {
    await upsertMilestoneSchedule({
      webinarId,
      milestone,
      startsAt,
      actor: input.actor,
      automationEnabled: automationEnabled && status === "published",
    });
  }

  // Drop obsolete automated rows (e.g. retired Meta-only d2 milestone).
  const existing = await listSchedulesForWebinar(webinarId);
  await Promise.all(
    existing
      .filter((doc) => {
        const row = doc.data() ?? {};
        if (row.automated !== true) return false;
        const key = String(row.milestoneKey || "");
        return !key || !activeKeys.has(key as PromotionMilestoneKey);
      })
      .map((doc) => doc.ref.delete()),
  );

  if (
    input.fireImmediate &&
    status === "published" &&
    automationEnabled
  ) {
    const publishMilestone = WEBINAR_PROMOTION_MILESTONES.find(
      (m) => m.key === "publish",
    )!;
    if (publishMilestone.channels.includes("email")) {
      await queueEmailNotification({
        webinarId,
        purpose: publishMilestone.purpose,
        milestoneKey: "publish",
        actorUid: input.actor.uid,
        subject: composedBase.subject,
        body: composedBase.emailBody,
        audience: publishMilestone.audience,
      });
    }

    const publishSchedule = await findScheduleByMilestone(webinarId, "publish");
    if (publishSchedule) {
      await publishSchedule.ref.set(
        {
          lastRunAt: FieldValue.serverTimestamp(),
          // Immediate publish already ran — do not let the due-runner re-fire.
          nextRunAt: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  return getWebinarAutomationPlan(webinarId);
}

export async function getWebinarAutomationPlan(
  webinarId: string,
): Promise<WebinarAutomationPlan> {
  const id = webinarId.trim();
  if (!id) throw new Error("TARGET_REQUIRED");
  const snap = await webinarsCollection().doc(id).get();
  if (!snap.exists) throw new Error("WEBINAR_NOT_FOUND");
  const data = snap.data() ?? {};

  const schedDocs = await listSchedulesForWebinar(id);
  const byKey = new Map<string, QueryDocumentSnapshot>();
  for (const doc of schedDocs) {
    const data = doc.data() ?? {};
    if (data.automated !== true) continue;
    const key = String(data.milestoneKey || "");
    if (key) byKey.set(key, doc);
  }

  const items: AutomationPlanItem[] = WEBINAR_PROMOTION_MILESTONES.map(
    (milestone) => {
      const doc = byKey.get(milestone.key);
      const row = doc?.data() ?? {};
      return {
        milestoneKey: milestone.key,
        label: milestone.label,
        purpose: milestone.purpose,
        audience: milestone.audience,
        channels: milestone.channels,
        scheduleId: doc?.id ?? null,
        enabled: row.enabled !== false,
        nextRunAt: toIsoString(row.nextRunAt),
        lastRunAt: toIsoString(row.lastRunAt),
        daysBefore: row.daysBefore == null ? null : Number(row.daysBefore),
        hoursBefore: row.hoursBefore == null ? null : Number(row.hoursBefore),
        scheduleKind: String(row.scheduleKind || ""),
      };
    },
  );

  return {
    webinarId: id,
    webinarName: String(data.name ?? ""),
    startsAt: toIsoString(data.startsAt),
    status: String(data.status ?? ""),
    automationEnabled: data.promotionAutomationEnabled !== false,
    items,
  };
}

export async function setWebinarPromotionAutomationEnabled(input: {
  webinarId: string;
  enabled: boolean;
  actor: { uid: string; email?: string };
}): Promise<WebinarAutomationPlan> {
  const webinarId = input.webinarId.trim();
  await webinarsCollection().doc(webinarId).set(
    {
      promotionAutomationEnabled: input.enabled === true,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: { uid: input.actor.uid, email: input.actor.email ?? "" },
    },
    { merge: true },
  );

  const schedDocs = await listSchedulesForWebinar(webinarId);
  const batch = schedDocs
    .filter((doc) => doc.data()?.automated === true)
    .map((doc) =>
      doc.ref.set(
        {
          enabled: input.enabled === true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    );
  await Promise.all(batch);

  if (input.enabled) {
    return installWebinarPromotionAutomation({
      webinarId,
      actor: input.actor,
      fireImmediate: false,
    });
  }
  return getWebinarAutomationPlan(webinarId);
}

/** Preview composed copy for a specific milestone. */
export async function previewAutomationMilestone(input: {
  webinarId: string;
  milestoneKey: PromotionMilestoneKey;
}) {
  const snap = await webinarsCollection().doc(input.webinarId.trim()).get();
  if (!snap.exists) throw new Error("WEBINAR_NOT_FOUND");
  const milestone =
    WEBINAR_PROMOTION_MILESTONES.find((m) => m.key === input.milestoneKey) ??
    WEBINAR_PROMOTION_MILESTONES[0]!;
  return composeWebinarScheduleMessage({
    purpose: milestone.purpose as ComposerPurpose,
    webinar: webinarComposerInput(input.webinarId.trim(), snap.data() ?? {}),
  });
}
