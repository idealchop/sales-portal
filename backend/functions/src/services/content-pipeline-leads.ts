import { createHash } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { EVENTS_TRAINING_APP_ID } from "../constants/events-training";
import { mapWithConcurrency } from "../utils/map-with-concurrency";
import { extractRiverUserProfile } from "./sales-portal-access";
import { toIsoString } from "./sales-serializer";
import type { LeadChannels, LeadRecord } from "./leads-service";

export const CONTENT_SOURCE_KINDS = [
  "webinar",
  "training",
  "article",
  "story",
] as const;

export type ContentSourceKind = (typeof CONTENT_SOURCE_KINDS)[number];

export const CONTENT_SOURCE_LABELS: Record<ContentSourceKind, string> = {
  webinar: "Webinar",
  training: "Training",
  article: "Article",
  story: "Story",
};

export type ContentTouch = {
  email: string;
  userId?: string;
  displayName: string;
  phone?: string;
  businessId?: string;
  sources: ContentSourceKind[];
  titles: string[];
  occurredAt: string | null;
  referrerName?: string;
};

const EMPTY_CHANNELS: LeadChannels = {
  viber: false,
  email: true,
  messenger: false,
  smsCall: false,
};

const MAX_TITLES = 8;
const ENGAGEMENT_PARENT_CONCURRENCY = 8;

function eventsRoot(pipelineDb: Firestore) {
  return pipelineDb.collection("apps").doc(EVENTS_TRAINING_APP_ID);
}

export function normalizeContentEmail(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.includes("@") || !trimmed.includes(".")) return null;
  return trimmed;
}

export function contentLeadDocId(email: string): string {
  const digest = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
  return `sr-content:${digest}`;
}

export function isContentPipelineLead(lead: {
  sourceKind?: string | null;
  contentSources?: string[] | null;
}): boolean {
  if (lead.sourceKind === "content") return true;
  return Array.isArray(lead.contentSources) && lead.contentSources.length > 0;
}

export function isContentOnlyLead(lead: {
  sourceKind?: string | null;
}): boolean {
  return lead.sourceKind === "content";
}

export function formatContentLeadSource(
  sources: ContentSourceKind[],
): string {
  const unique: ContentSourceKind[] = [];
  for (const source of sources) {
    if (!unique.includes(source)) unique.push(source);
  }
  return unique.map((source) => CONTENT_SOURCE_LABELS[source]).join(" · ");
}

function unionSources(
  current: ContentSourceKind[] | undefined,
  extra: ContentSourceKind[],
): ContentSourceKind[] {
  const next: ContentSourceKind[] = [...(current ?? [])];
  for (const source of extra) {
    if (!next.includes(source)) next.push(source);
  }
  return next;
}

function unionTitles(current: string[] | undefined, extra: string[]): string[] {
  const next = [...(current ?? [])];
  for (const title of extra) {
    const trimmed = title.trim();
    if (!trimmed) continue;
    if (next.some((row) => row.toLowerCase() === trimmed.toLowerCase())) {
      continue;
    }
    next.push(trimmed);
    if (next.length >= MAX_TITLES) break;
  }
  return next.slice(0, MAX_TITLES);
}

function laterIso(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(right) > Date.parse(left) ? right : left;
}

function toIso(value: unknown): string | null {
  return toIsoString(value);
}

export function mergeContentTouches(
  touches: ContentTouch[],
): ContentTouch[] {
  const byEmail = new Map<string, ContentTouch>();
  for (const touch of touches) {
    const email = normalizeContentEmail(touch.email);
    if (!email) continue;
    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        ...touch,
        email,
        sources: unionSources([], touch.sources),
        titles: unionTitles([], touch.titles),
      });
      continue;
    }
    byEmail.set(email, {
      email,
      userId: existing.userId || touch.userId,
      displayName: existing.displayName || touch.displayName,
      phone: existing.phone || touch.phone,
      businessId: existing.businessId || touch.businessId,
      sources: unionSources(existing.sources, touch.sources),
      titles: unionTitles(existing.titles, touch.titles),
      occurredAt: laterIso(existing.occurredAt, touch.occurredAt),
      referrerName: existing.referrerName || touch.referrerName,
    });
  }
  return [...byEmail.values()];
}

function contentSummary(titles: string[]): string | undefined {
  if (titles.length === 0) return undefined;
  return titles.join("; ");
}

function toLeadFromContentTouch(touch: ContentTouch): LeadRecord {
  const email = touch.email;
  const name = touch.displayName.trim() || email;
  const occurredAt = touch.occurredAt;
  const sourceLabel = formatContentLeadSource(touch.sources) || "Content";
  return {
    id: contentLeadDocId(email),
    userId: touch.userId || "smartrefill",
    businessName: name,
    ownerName: name,
    email,
    phone: touch.phone,
    stage: "inquire",
    attemptCount: 0,
    warmAttemptCount: 0,
    coldAttemptCount: 0,
    channels: { ...EMPTY_CHANNELS },
    leadSource: sourceLabel,
    notes: contentSummary(touch.titles),
    sourceKind: "content",
    platformSource: "smartrefill",
    platformRole: "Content",
    linkedBusinessId: touch.businessId,
    inquiredAt: occurredAt,
    firstContactAt: occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    createdByUid: "smartrefill",
    contentSources: touch.sources,
    contentSummary: contentSummary(touch.titles),
    contentReferrer: touch.referrerName?.trim() || undefined,
  };
}

/**
 * Attach content activity onto existing pipeline rows (same email/user),
 * and insert content-only leads for emails not already in the pipeline.
 */
export function applyContentTouchesToPipeline(
  pipeline: LeadRecord[],
  touches: ContentTouch[],
): LeadRecord[] {
  const mergedTouches = mergeContentTouches(touches);
  const byEmail = new Map<string, number>();
  const byUserId = new Map<string, number>();
  const next = pipeline.map((lead, index) => {
    const email = normalizeContentEmail(lead.email);
    if (email) byEmail.set(email, index);
    if (lead.userId && lead.userId !== "smartrefill") {
      byUserId.set(lead.userId, index);
    }
    return lead;
  });

  for (const touch of mergedTouches) {
    const emailIndex = byEmail.get(touch.email);
    const userIndex =
      touch.userId && touch.userId !== "smartrefill" ?
        byUserId.get(touch.userId) :
        undefined;
    const index = emailIndex ?? userIndex;
    if (index == null) {
      const lead = toLeadFromContentTouch(touch);
      byEmail.set(touch.email, next.length);
      if (lead.userId !== "smartrefill") byUserId.set(lead.userId, next.length);
      next.push(lead);
      continue;
    }

    const existing = next[index];
    const sources = unionSources(
      (existing.contentSources ?? []) as ContentSourceKind[],
      touch.sources,
    );
    const titles = unionTitles(
      existing.contentSummary?.split("; ").filter(Boolean),
      touch.titles,
    );
    next[index] = {
      ...existing,
      contentSources: sources,
      contentSummary: contentSummary(titles),
      inquiredAt: existing.inquiredAt || touch.occurredAt,
      contentReferrer:
        existing.referredBy?.trim() || existing.contentReferrer?.trim() ?
          existing.contentReferrer :
          touch.referrerName?.trim() || existing.contentReferrer,
    };
  }

  return next;
}

function sourceFromVideoCategory(category: string): ContentSourceKind {
  const value = category.trim().toLowerCase();
  if (value === "tutorial") return "training";
  if (value === "wrs_stories" || value === "story") return "story";
  return "webinar";
}

type Accumulator = {
  email?: string;
  userId?: string;
  displayName?: string;
  phone?: string;
  businessId?: string;
  source: ContentSourceKind;
  title: string;
  occurredAt: string | null;
  referrerName?: string;
};

function pushTouch(bucket: Accumulator[], row: Accumulator) {
  bucket.push(row);
}

async function collectSubcollectionUserIds(
  parentRef: FirebaseFirestore.DocumentReference,
  subcollections: string[],
): Promise<Array<{ userId: string; occurredAt: string | null; businessId?: string }>> {
  const rows: Array<{
    userId: string;
    occurredAt: string | null;
    businessId?: string;
  }> = [];
  for (const name of subcollections) {
    const snap = await parentRef.collection(name).limit(200).get();
    for (const doc of snap.docs) {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      if (data.anonymous === true) continue;
      const fromField =
        typeof data.userId === "string" ? data.userId.trim() : "";
      const fromId = doc.id.startsWith("guest:") ? "" : doc.id.trim();
      const userId = fromField || fromId;
      if (!userId || userId.startsWith("guest:")) continue;
      const businessId =
        typeof data.businessId === "string" && data.businessId.trim() ?
          data.businessId.trim() :
          undefined;
      rows.push({
        userId,
        occurredAt:
          toIso(data.createdAt) ||
          toIso(data.watchedAt) ||
          toIso(data.updatedAt),
        businessId,
      });
    }
  }
  return rows;
}

/**
 * Collect webinar registrations + training/story/article/webinar engagement
 * from SmartRefill `apps/smartrefill` on the pipeline Firestore.
 */
export async function loadContentPipelineTouches(
  pipelineDb: Firestore,
  usersByUid: Map<string, Record<string, unknown>>,
): Promise<ContentTouch[]> {
  const root = eventsRoot(pipelineDb);
  const [
    registrationsSnap,
    webinarsSnap,
    videosSnap,
    blogsSnap,
    videoEngagementSnap,
    blogEngagementSnap,
    webinarEngagementSnap,
  ] = await Promise.all([
    root.collection("webinar_registrations").get(),
    root.collection("webinar_events").get(),
    root.collection("training_videos").get(),
    root.collection("wrs_blogs").get(),
    root.collection("training_video_engagement").get(),
    root.collection("blog_engagement").get(),
    root.collection("webinar_event_engagement").get(),
  ]);

  const webinarMeta = new Map<string, { title: string; speaker?: string }>();
  for (const doc of webinarsSnap.docs) {
    const data = doc.data() ?? {};
    const title =
      (typeof data.name === "string" && data.name.trim()) ||
      (typeof data.title === "string" && data.title.trim()) ||
      "Webinar";
    const speaker =
      typeof data.speaker === "string" && data.speaker.trim() ?
        data.speaker.trim() :
        undefined;
    webinarMeta.set(doc.id, { title, speaker });
  }

  const videoMeta = new Map<
    string,
    { title: string; source: ContentSourceKind }
  >();
  for (const doc of videosSnap.docs) {
    const data = doc.data() ?? {};
    const title =
      (typeof data.title === "string" && data.title.trim()) ||
      (typeof data.name === "string" && data.name.trim()) ||
      "Video";
    videoMeta.set(doc.id, {
      title,
      source: sourceFromVideoCategory(String(data.category || "")),
    });
  }

  const blogMeta = new Map<string, { title: string; author?: string }>();
  for (const doc of blogsSnap.docs) {
    const data = doc.data() ?? {};
    const title =
      (typeof data.title === "string" && data.title.trim()) || "Article";
    const author =
      (typeof data.authorName === "string" && data.authorName.trim()) ||
      (data.author &&
      typeof data.author === "object" &&
      typeof (data.author as { name?: string }).name === "string" ?
        (data.author as { name: string }).name.trim() :
        "");
    blogMeta.set(doc.id, { title, author: author || undefined });
  }

  const raw: Accumulator[] = [];

  for (const doc of registrationsSnap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const status = String(data.status || "").toLowerCase();
    if (status === "cancelled" || status === "declined") continue;
    const userId =
      typeof data.userId === "string" && data.userId.trim() ?
        data.userId.trim() :
        undefined;
    const profile = userId ? extractRiverUserProfile(usersByUid.get(userId)) : {};
    const email =
      normalizeContentEmail(
        typeof data.email === "string" ? data.email : profile.email,
      ) ?? null;
    if (!email) continue;
    const displayName =
      (typeof data.displayName === "string" && data.displayName.trim()) ||
      profile.displayName ||
      email;
    const eventId = String(data.eventId || "");
    const webinar = webinarMeta.get(eventId);
    raw.push({
      email,
      userId,
      displayName,
      phone: profile.phone,
      businessId:
        typeof data.businessId === "string" && data.businessId.trim() ?
          data.businessId.trim() :
          undefined,
      source: "webinar",
      title: webinar?.title || "Webinar",
      occurredAt: toIso(data.createdAt) || toIso(data.updatedAt),
      referrerName: webinar?.speaker,
    });
  }

  const engagementJobs: Array<{
    ref: FirebaseFirestore.DocumentReference;
    source: ContentSourceKind;
    title: string;
    referrerName?: string;
    subcollections: string[];
  }> = [];

  for (const doc of videoEngagementSnap.docs) {
    const meta = videoMeta.get(doc.id);
    engagementJobs.push({
      ref: doc.ref,
      source: meta?.source ?? "story",
      title: meta?.title || "Video",
      subcollections: ["likes", "posts", "views"],
    });
  }
  for (const doc of blogEngagementSnap.docs) {
    const blog = blogMeta.get(doc.id);
    engagementJobs.push({
      ref: doc.ref,
      source: "article",
      title: blog?.title || "Article",
      referrerName: blog?.author,
      subcollections: ["likes", "posts"],
    });
  }
  for (const doc of webinarEngagementSnap.docs) {
    const webinar = webinarMeta.get(doc.id);
    engagementJobs.push({
      ref: doc.ref,
      source: "webinar",
      title: webinar?.title || "Webinar",
      referrerName: webinar?.speaker,
      subcollections: ["likes", "posts"],
    });
  }

  const engagementPeople = await mapWithConcurrency(
    engagementJobs,
    ENGAGEMENT_PARENT_CONCURRENCY,
    async (job) => {
      const people = await collectSubcollectionUserIds(
        job.ref,
        job.subcollections,
      );
      return people.map((person) => ({
        ...person,
        source: job.source,
        title: job.title,
        referrerName: job.referrerName,
      }));
    },
  );

  for (const group of engagementPeople) {
    for (const person of group) {
      const profile = extractRiverUserProfile(usersByUid.get(person.userId));
      const email = normalizeContentEmail(profile.email);
      if (!email) continue;
      pushTouch(raw, {
        email,
        userId: person.userId,
        displayName: profile.displayName || email,
        phone: profile.phone,
        businessId: person.businessId,
        source: person.source,
        title: person.title,
        occurredAt: person.occurredAt,
        referrerName: person.referrerName,
      });
    }
  }

  for (const doc of videosSnap.docs) {
    const commentsSnap = await doc.ref.collection("comments").limit(80).get();
    const meta = videoMeta.get(doc.id);
    const title = meta?.title || "Video";
    const source = meta?.source ?? "training";
    for (const comment of commentsSnap.docs) {
      const data = (comment.data() ?? {}) as Record<string, unknown>;
      const userId =
        typeof data.userId === "string" ? data.userId.trim() : "";
      if (!userId) continue;
      const profile = extractRiverUserProfile(usersByUid.get(userId));
      const email = normalizeContentEmail(
        typeof data.email === "string" ? data.email : profile.email,
      );
      if (!email) continue;
      raw.push({
        email,
        userId,
        displayName:
          (typeof data.displayName === "string" && data.displayName.trim()) ||
          profile.displayName ||
          email,
        phone: profile.phone,
        source,
        title,
        occurredAt: toIso(data.createdAt),
      });
    }
  }

  for (const doc of blogsSnap.docs) {
    const commentsSnap = await doc.ref.collection("comments").limit(80).get();
    const title = blogMeta.get(doc.id)?.title || "Article";
    const author = blogMeta.get(doc.id)?.author;
    for (const comment of commentsSnap.docs) {
      const data = (comment.data() ?? {}) as Record<string, unknown>;
      const userId =
        typeof data.userId === "string" ? data.userId.trim() : "";
      if (!userId) continue;
      const profile = extractRiverUserProfile(usersByUid.get(userId));
      const email = normalizeContentEmail(
        typeof data.email === "string" ? data.email : profile.email,
      );
      if (!email) continue;
      raw.push({
        email,
        userId,
        displayName:
          (typeof data.displayName === "string" && data.displayName.trim()) ||
          profile.displayName ||
          email,
        phone: profile.phone,
        source: "article",
        title,
        occurredAt: toIso(data.createdAt),
        referrerName: author,
      });
    }
  }

  return mergeContentTouches(
    raw.map((row) => ({
      email: row.email || "",
      userId: row.userId,
      displayName: row.displayName || row.email || "Content visitor",
      phone: row.phone,
      businessId: row.businessId,
      sources: [row.source],
      titles: [row.title],
      occurredAt: row.occurredAt,
      referrerName: row.referrerName,
    })),
  );
}
