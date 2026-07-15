/**
 * Delivery runners for webinar promotion automation:
 * 1) Publish queued Meta community Page posts
 * 2) Fire due automated schedules → enqueue Meta (+ email queue stub)
 */

import {
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "../../config/firebase-admin";
import { EVENTS_TRAINING_COLLECTIONS } from "../../constants/events-training";
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
import { publishMetaCommunityPagePost } from "./meta-page-publish-service";
import {
  WEBINAR_PROMOTION_MILESTONES,
  type PromotionMilestoneKey,
} from "./webinar-promotion-automation";

export type MetaQueueProcessResult = {
  attempted: number;
  posted: number;
  failed: number;
  skipped: number;
};

export type DueScheduleProcessResult = {
  scanned: number;
  fired: number;
  metaQueued: number;
  emailQueued: number;
  errors: number;
};

function metaPostLogCollection() {
  return eventsTrainingRoot().collection(
    EVENTS_TRAINING_COLLECTIONS.metaPostLog,
  );
}

function emailQueueCollection() {
  return eventsTrainingRoot().collection("events_training_email_queue");
}

async function claimQueuedMetaPost(
  doc: QueryDocumentSnapshot,
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const fresh = await tx.get(doc.ref);
    if (!fresh.exists) return false;
    const status = String(fresh.data()?.status || "");
    if (status !== "queued") return false;
    tx.set(
      doc.ref,
      {
        status: "posting",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  });
}

/** Drain `meta_post_log` docs with status=queued and publish to Facebook Page. */
export async function processQueuedMetaCommunityPosts(
  limit = 20,
): Promise<MetaQueueProcessResult> {
  const snap = await metaPostLogCollection()
    .where("status", "==", "queued")
    .limit(Math.max(1, Math.min(limit, 50)))
    .get();

  let posted = 0;
  let failed = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const claimed = await claimQueuedMetaPost(doc);
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const data = doc.data() ?? {};
    const caption = String(data.caption || "").trim();
    const result = await publishMetaCommunityPagePost({
      message: caption,
      link:
        typeof data.registerUrl === "string" ? data.registerUrl : null,
      photoUrl: typeof data.posterUrl === "string" ? data.posterUrl : null,
    });

    if (result.ok) {
      posted += 1;
      await doc.ref.set(
        {
          status: "posted",
          metaPostId: result.postId,
          postedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          error: null,
        },
        { merge: true },
      );
    } else {
      failed += 1;
      await doc.ref.set(
        {
          status: "failed",
          error: result.reason,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  return {
    attempted: snap.size,
    posted,
    failed,
    skipped,
  };
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
  // One-shot milestones do not repeat.
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

async function queueMetaFromSchedule(input: {
  webinarId: string;
  purpose: SchedulePurpose;
  milestoneKey: string;
  caption: string;
  subject: string;
  registerUrl: string;
  posterUrl: string | null;
  seatsRemaining: number | null;
  capacity: number | null;
  certificationEnabled: boolean;
  scheduleId: string;
}): Promise<string> {
  const ref = metaPostLogCollection().doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({
    webinarId: input.webinarId,
    purpose: input.purpose,
    milestoneKey: input.milestoneKey,
    scheduleId: input.scheduleId,
    caption: input.caption,
    subject: input.subject,
    registerUrl: input.registerUrl,
    posterUrl: input.posterUrl,
    seatsRemaining: input.seatsRemaining,
    capacity: input.capacity,
    certificationEnabled: input.certificationEnabled,
    status: "queued",
    channel: "meta_community_page",
    createdByUid: "system:events-training-delivery",
    createdAt: now,
    updatedAt: now,
    postedAt: null,
  });
  return ref.id;
}

/**
 * Find due automated schedules, enqueue channel jobs, advance nextRunAt.
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
  let metaQueued = 0;
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
    if (!def) continue;
    // Immediate publish is handled at install time.
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

      if (channels.includes("meta")) {
        await queueMetaFromSchedule({
          webinarId,
          purpose: def.purpose,
          milestoneKey: milestoneKey as PromotionMilestoneKey,
          caption: composed.metaCaption,
          subject: composed.subject,
          registerUrl: composed.registerUrl,
          posterUrl: composed.posterUrl,
          seatsRemaining: composed.seatsRemaining,
          capacity: composed.capacity,
          certificationEnabled: composed.certificationEnabled,
          scheduleId: doc.id,
        });
        metaQueued += 1;
      }

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
    metaQueued,
    emailQueued,
    errors,
  };
}

/** Run both delivery phases (schedules first, then Meta publish). */
export async function runEventsTrainingPromotionDelivery(): Promise<{
  schedules: DueScheduleProcessResult;
  meta: MetaQueueProcessResult;
}> {
  const schedules = await processDueAutomatedSchedules();
  const meta = await processQueuedMetaCommunityPosts();
  return { schedules, meta };
}
