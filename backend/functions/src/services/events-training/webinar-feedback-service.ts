import { FieldValue } from "firebase-admin/firestore";
import {
  WEBINAR_FEEDBACK_STATUSES,
  type WebinarFeedbackStatus,
} from "../../constants/events-training";
import { toIsoString } from "../sales-serializer";
import { webinarEventFeedbackCollection } from "./events-training-db";

export type WebinarFeedbackRecord = {
  id: string;
  eventId: string;
  eventName: string;
  email: string;
  displayName: string | null;
  registrationId: string | null;
  rating: number;
  feedback: string | null;
  recommend: boolean;
  recommendation: string | null;
  source: string | null;
  status: WebinarFeedbackStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export type WebinarFeedbackSummary = {
  count: number;
  averageRating: number | null;
  recommendCount: number;
  recommendRate: number | null;
  ratingCounts: [number, number, number, number, number];
};

type FeedbackScore = Pick<WebinarFeedbackRecord, "rating" | "recommend">;

export function emptyWebinarFeedbackSummary(): WebinarFeedbackSummary {
  return {
    count: 0,
    averageRating: null,
    recommendCount: 0,
    recommendRate: null,
    ratingCounts: [0, 0, 0, 0, 0],
  };
}

export function parseWebinarFeedbackStatus(
  value: unknown,
): WebinarFeedbackStatus {
  return typeof value === "string" &&
    (WEBINAR_FEEDBACK_STATUSES as readonly string[]).includes(value) ?
    (value as WebinarFeedbackStatus) :
    "pending";
}

function parseRating(value: unknown): number | null {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  return Math.round(rating);
}

function parseRecommend(value: unknown): boolean {
  return value === true || value === "true" || value === "yes" || value === "1";
}

function readText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export function mapWebinarFeedbackDoc(
  id: string,
  data: Record<string, unknown>,
): WebinarFeedbackRecord | null {
  const eventId = String(data.eventId ?? "").trim();
  const rating = parseRating(data.rating);
  if (!eventId || rating == null) return null;
  return {
    id,
    eventId,
    eventName: String(data.eventName ?? "").trim(),
    email: String(data.email ?? "").trim(),
    displayName: readText(data.displayName),
    registrationId: readText(data.registrationId),
    rating,
    feedback: readText(data.feedback),
    recommend: parseRecommend(data.recommend),
    recommendation: readText(data.recommendation),
    source: readText(data.source),
    status: parseWebinarFeedbackStatus(data.status),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export function summarizeWebinarFeedback(
  items: FeedbackScore[],
): WebinarFeedbackSummary {
  const summary = emptyWebinarFeedbackSummary();
  if (items.length === 0) return summary;

  let ratingSum = 0;
  for (const item of items) {
    ratingSum += item.rating;
    summary.ratingCounts[item.rating - 1] += 1;
    if (item.recommend) summary.recommendCount += 1;
  }

  summary.count = items.length;
  summary.averageRating = Math.round((ratingSum / items.length) * 10) / 10;
  summary.recommendRate =
    Math.round((summary.recommendCount / items.length) * 1000) / 1000;
  return summary;
}

function sortNewestFirst(items: WebinarFeedbackRecord[]): WebinarFeedbackRecord[] {
  return [...items].sort((a, b) =>
    (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? ""),
  );
}

function collectMapped(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): WebinarFeedbackRecord[] {
  const items: WebinarFeedbackRecord[] = [];
  for (const doc of docs) {
    const mapped = mapWebinarFeedbackDoc(doc.id, doc.data());
    if (mapped) items.push(mapped);
  }
  return sortNewestFirst(items);
}

export async function listWebinarFeedback(
  eventId: string,
): Promise<WebinarFeedbackRecord[]> {
  const id = eventId.trim();
  if (!id) return [];

  const snap = await webinarEventFeedbackCollection()
    .where("eventId", "==", id)
    .limit(500)
    .get();
  return collectMapped(snap.docs);
}

export async function listAllWebinarFeedback(): Promise<WebinarFeedbackRecord[]> {
  try {
    const snap = await webinarEventFeedbackCollection().limit(2000).get();
    return collectMapped(snap.docs);
  } catch (error) {
    console.error("listAllWebinarFeedback failed", error);
    return [];
  }
}

export async function listWebinarFeedbackSummaries(): Promise<
  Record<string, WebinarFeedbackSummary>
> {
  try {
    const items = await listAllWebinarFeedback();
    const byEvent = new Map<string, FeedbackScore[]>();
    for (const item of items) {
      const rows = byEvent.get(item.eventId) ?? [];
      rows.push(item);
      byEvent.set(item.eventId, rows);
    }

    const summaries: Record<string, WebinarFeedbackSummary> = {};
    for (const [eventId, rows] of byEvent) {
      summaries[eventId] = summarizeWebinarFeedback(rows);
    }
    return summaries;
  } catch (error) {
    console.error("listWebinarFeedbackSummaries failed", error);
    return {};
  }
}

export async function moderateWebinarFeedback(
  eventId: string,
  feedbackId: string,
  status: string,
): Promise<WebinarFeedbackRecord> {
  if (
    !(WEBINAR_FEEDBACK_STATUSES as readonly string[]).includes(status)
  ) {
    throw new Error("INVALID_COMMENT_STATUS");
  }
  const ref = webinarEventFeedbackCollection().doc(feedbackId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("COMMENT_NOT_FOUND");
  const mapped = mapWebinarFeedbackDoc(snap.id, snap.data() ?? {});
  if (!mapped || mapped.eventId !== eventId.trim()) {
    throw new Error("COMMENT_NOT_FOUND");
  }
  await ref.update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return {
    ...mapped,
    status: status as WebinarFeedbackStatus,
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteWebinarFeedback(
  eventId: string,
  feedbackId: string,
): Promise<void> {
  const ref = webinarEventFeedbackCollection().doc(feedbackId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const mapped = mapWebinarFeedbackDoc(snap.id, snap.data() ?? {});
  if (mapped && mapped.eventId !== eventId.trim()) {
    throw new Error("COMMENT_NOT_FOUND");
  }
  await ref.delete();
}
