/**
 * Delivery runner for webinar promotion automation:
 * Fire due automated schedules → enqueue email notifications.
 */

import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import type { SchedulePurpose } from "../../constants/events-training";
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
import {
  WEBINAR_PROMOTION_MILESTONES,
} from "./webinar-promotion-automation";

export type DueScheduleProcessResult = {
  scanned: number;
  fired: number;
  emailQueued: number;
  errors: number;
};

function emailQueueCollection() {
  return eventsTrainingRoot().collection("events_training_email_queue");
}

function milestoneDef(key: string) {
  return WEBINAR_PROMOTION_MILESTONES.find((m) => m.key === key) ?? null;
}

function computeNextRunAfterFire(input: {
  milestoneKey: string;
  startsAt: string | null;
  scheduleKind: string;
}): Date | null {
  if (input.scheduleKind === "recurring_weekday" || input.milestoneKey === "weekly") {
    if (!input.startsAt) return null;
    const start = new Date(input.startsAt);
    if (Number.isNaN(start.getTime())) return null;
    const next = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return next < start ? next : null;
  }
  return null;
}

async function queueEmailFromSchedule(input: {
  webinarId: string;
  purpose: SchedulePurpose;
  milestoneKey: string;
  subject: string;
  body: string;
  audience: string;
}): Promise<string> {
  const ref = emailQueueCollection().doc();
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
    createdByUid: "system:events-training-delivery",
    createdAt: now,
    updatedAt: now,
    sentAt: null,
  });
  return ref.id;
}

/**
 * Find due automated schedules, enqueue email jobs, advance nextRunAt.
 */
export async function processDueAutomatedSchedules(
  limit = 40,
): Promise<DueScheduleProcessResult> {
  const nowTs = Timestamp.now();
  const snap = await schedulesCollection()
    .where("nextRunAt", "<=", nowTs)
    .limit(Math.max(1, Math.min(limit, 80)))
    .get();

  let fired = 0;
  let emailQueued = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    const row = doc.data() ?? {};
    if (row.enabled === false) continue;
    if (row.automated !== true) continue;

    const webinarId = String(row.targetId || "").trim();
    const milestoneKey = String(row.milestoneKey || "").trim();
    if (!webinarId || !milestoneKey) continue;

    const def = milestoneDef(milestoneKey);
    if (!def) {
      // Retired milestones (e.g. Meta-only d2) — clear so they stop re-firing.
      await doc.ref.set(
        {
          nextRunAt: null,
          enabled: false,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      continue;
    }
    if (milestoneKey === "publish") {
      await doc.ref.set(
        {
          nextRunAt: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      continue;
    }

    try {
      const webinarSnap = await webinarsCollection().doc(webinarId).get();
      if (!webinarSnap.exists) {
        errors += 1;
        continue;
      }
      const webinar = webinarSnap.data() ?? {};
      if (String(webinar.status || "") !== "published") continue;
      if (webinar.promotionAutomationEnabled === false) continue;

      const composed = composeWebinarScheduleMessage({
        purpose: def.purpose as ComposerPurpose,
        webinar: {
          id: webinarId,
          name: String(webinar.name ?? ""),
          description: String(webinar.description ?? ""),
          speaker: String(webinar.speaker ?? ""),
          host: String(webinar.host ?? ""),
          startsAt: toIsoString(webinar.startsAt),
          endsAt: toIsoString(webinar.endsAt),
          timezone:
            typeof webinar.timezone === "string" && webinar.timezone.trim() ?
              webinar.timezone.trim() :
              "Asia/Manila",
          posterUrl:
            typeof webinar.posterUrl === "string" ? webinar.posterUrl : null,
          capacity:
            webinar.capacity == null || webinar.capacity === "" ?
              null :
              Number(webinar.capacity),
          registrationCount: Number(webinar.registrationCount) || 0,
          certificationEnabled: webinar.certificationEnabled === true,
          status: String(webinar.status ?? ""),
        },
      });

      const channels = Array.isArray(row.channels) ?
        (row.channels as string[]) :
        def.channels;

      if (channels.includes("email")) {
        await queueEmailFromSchedule({
          webinarId,
          purpose: def.purpose,
          milestoneKey,
          subject: composed.subject,
          body: composed.emailBody,
          audience: String(row.audience || def.audience),
        });
        emailQueued += 1;
      }

      const nextRun = computeNextRunAfterFire({
        milestoneKey,
        startsAt: toIsoString(webinar.startsAt),
        scheduleKind: String(row.scheduleKind || ""),
      });

      await doc.ref.set(
        {
          lastRunAt: FieldValue.serverTimestamp(),
          nextRunAt: nextRun ? Timestamp.fromDate(nextRun) : null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      fired += 1;
    } catch {
      errors += 1;
    }
  }

  return {
    scanned: snap.size,
    fired,
    emailQueued,
    errors,
  };
}

/** Run due schedule delivery (email queue). */
export async function runEventsTrainingPromotionDelivery(): Promise<{
  schedules: DueScheduleProcessResult;
}> {
  const schedules = await processDueAutomatedSchedules();
  return { schedules };
}
