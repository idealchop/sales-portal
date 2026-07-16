import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  PlaybackProvider,
  TutorialTargetAppId,
  VideoCategory,
  VideoStatus,
  VideoVisibility,
} from "../../constants/events-training";
import {
  DEFAULT_TUTORIAL_APP_PAGES_BY_APP,
  PLAYBACK_PROVIDERS,
  VIDEO_CATEGORIES,
  VIDEO_CATEGORY_TUTORIAL,
  VIDEO_STATUSES,
  VIDEO_VISIBILITY,
} from "../../constants/events-training";
import { toIsoString } from "../sales-serializer";
import { videosCollection } from "./events-training-db";
import {
  defaultThumbnailUrl,
  extractPlaybackId,
  normalizePlaybackInput,
} from "./events-training-playback";
import {
  resolvePublishAppId,
  resolveTutorialTargeting,
} from "./tutorial-apps-service";

export type TrainingVideoRecord = {
  id: string;
  name: string;
  description: string;
  recordedAt: string | null;
  status: VideoStatus;
  category: VideoCategory;
  subcategory: string | null;
  /** Target product app id (e.g. smartrefill). Pages depend on this. */
  appId: TutorialTargetAppId | null;
  /** App pages this tutorial targets (multi-select; valid for `appId`). */
  appPages: string[];
  webinarEventId: string | null;
  playbackProvider: PlaybackProvider;
  playbackUrl: string;
  playbackId: string | null;
  thumbnailUrl: string | null;
  featured: boolean;
  sortOrder: number;
  visibility: VideoVisibility;
  priceCents: number;
  currency: string;
  allowedPlanCodes: string[];
  allowAllMembers: boolean;
  certificationEnabled: boolean;
  archivedAt: string | null;
  tags: string[];
  viewCount: number;
  purchaseCount: number;
  commentCount: number;
  questionCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TrainingVideoMutationResult = {
  video: TrainingVideoRecord;
  /** True when this mutation first moves the video to published. */
  justPublished: boolean;
};

function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ?
    (value as T) :
    fallback;
}

function normalizeVisibility(raw: unknown): VideoVisibility {
  if (raw === "members" || raw === "subscription") return "private";
  return parseEnum(raw, VIDEO_VISIBILITY, "public");
}

function resolveAllowAllMembers(
  data: Record<string, unknown>,
  visibility: VideoVisibility,
): boolean {
  if (typeof data.allowAllMembers === "boolean") return data.allowAllMembers;
  // Legacy docs used visibility: "members" for all-member access.
  if (data.visibility === "members") return true;
  if (visibility !== "private") return false;
  const plans = Array.isArray(data.allowedPlanCodes) ?
    data.allowedPlanCodes :
    [];
  // Private with no plans and no explicit flag → all members.
  return plans.length === 0;
}

function assertAccessRules(input: {
  visibility: VideoVisibility;
  priceCents: number;
  allowedPlanCodes: string[];
  allowAllMembers: boolean;
}): void {
  if (input.visibility === "premium" && input.priceCents <= 0) {
    throw new Error("PREMIUM_PRICE_REQUIRED");
  }
  if (
    input.visibility === "private" &&
    !input.allowAllMembers &&
    input.allowedPlanCodes.length === 0
  ) {
    throw new Error("PRIVATE_ACCESS_REQUIRED");
  }
}

function resolveVideoCategory(data: Record<string, unknown>): VideoCategory {
  if (
    typeof data.category === "string" &&
    (VIDEO_CATEGORIES as readonly string[]).includes(data.category)
  ) {
    return data.category as VideoCategory;
  }
  // Legacy tutorials stored pages without an explicit category.
  if (Array.isArray(data.appPages) && data.appPages.length > 0) {
    return VIDEO_CATEGORY_TUTORIAL;
  }
  return "webinar";
}

function resolveAppId(
  data: Record<string, unknown>,
  _category: VideoCategory,
): TutorialTargetAppId {
  if (typeof data.appId === "string" && data.appId.trim()) {
    return data.appId.trim();
  }
  return "smartrefill";
}

function resolveAppPages(
  data: Record<string, unknown>,
  category: VideoCategory,
  appId: TutorialTargetAppId | null,
): string[] {
  const fromArray = Array.isArray(data.appPages) ?
    [
      ...new Set(
        data.appPages
          .map(String)
          .map((page) => page.trim())
          .filter(Boolean),
      ),
    ] :
    [];
  if (fromArray.length > 0) return fromArray;

  // Migrate single-select tutorials that stored the page in subcategory.
  const fallbackPages = appId ?
    DEFAULT_TUTORIAL_APP_PAGES_BY_APP[appId] ?? [] :
    [];
  if (
    category === VIDEO_CATEGORY_TUTORIAL &&
    typeof data.subcategory === "string" &&
    fallbackPages.includes(data.subcategory)
  ) {
    return [data.subcategory];
  }
  return [];
}

function mapVideo(id: string, data: Record<string, unknown>): TrainingVideoRecord {
  const visibility = normalizeVisibility(data.visibility);
  const category = resolveVideoCategory(data);
  const appId = resolveAppId(data, category);
  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    recordedAt: toIsoString(data.recordedAt),
    status: parseEnum(data.status, VIDEO_STATUSES, "draft"),
    category,
    subcategory:
      category === VIDEO_CATEGORY_TUTORIAL ?
        null :
        typeof data.subcategory === "string" ?
          data.subcategory :
          null,
    appId,
    appPages:
      category === VIDEO_CATEGORY_TUTORIAL ?
        resolveAppPages(data, category, appId) :
        [],
    webinarEventId:
      category === VIDEO_CATEGORY_TUTORIAL ?
        null :
        typeof data.webinarEventId === "string" ?
          data.webinarEventId :
          null,
    playbackProvider: parseEnum(data.playbackProvider, PLAYBACK_PROVIDERS, "youtube"),
    playbackUrl: String(data.playbackUrl ?? ""),
    playbackId: typeof data.playbackId === "string" ? data.playbackId : null,
    thumbnailUrl: typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : null,
    featured: data.featured === true,
    sortOrder: Number(data.sortOrder) || 0,
    visibility,
    priceCents: Number(data.priceCents) || 0,
    currency: typeof data.currency === "string" ? data.currency : "PHP",
    allowedPlanCodes: Array.isArray(data.allowedPlanCodes) ?
      data.allowedPlanCodes.map(String) :
      [],
    allowAllMembers: resolveAllowAllMembers(data, visibility),
    certificationEnabled: data.certificationEnabled === true,
    archivedAt: toIsoString(data.archivedAt),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    viewCount: Number(data.viewCount) || 0,
    purchaseCount: Number(data.purchaseCount) || 0,
    commentCount: Number(data.commentCount) || 0,
    questionCount: Number(data.questionCount) || 0,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function parseTimestamp(iso: string | null | undefined): Timestamp | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

export type UpsertVideoInput = {
  name?: string;
  description?: string;
  recordedAt?: string | null;
  status?: VideoStatus;
  category?: VideoCategory;
  subcategory?: string | null;
  appId?: TutorialTargetAppId | null;
  appPages?: string[];
  webinarEventId?: string | null;
  playbackProvider?: PlaybackProvider;
  playbackUrl?: string;
  thumbnailUrl?: string | null;
  featured?: boolean;
  sortOrder?: number;
  visibility?: VideoVisibility;
  priceCents?: number;
  currency?: string;
  allowedPlanCodes?: string[];
  allowAllMembers?: boolean;
  certificationEnabled?: boolean;
  tags?: string[];
};

function accessFromInput(
  input: UpsertVideoInput,
  current?: Record<string, unknown>,
): {
  visibility: VideoVisibility;
  priceCents: number;
  allowedPlanCodes: string[];
  allowAllMembers: boolean;
} {
  const visibility = normalizeVisibility(
    input.visibility ?? current?.visibility ?? "public",
  );
  const priceCents = Math.max(
    0,
    Number(
      input.priceCents !== undefined ? input.priceCents : (current?.priceCents ?? 0),
    ) || 0,
  );
  const allowedPlanCodes = Array.isArray(input.allowedPlanCodes) ?
    input.allowedPlanCodes.map(String) :
    Array.isArray(current?.allowedPlanCodes) ?
      current.allowedPlanCodes.map(String) :
      [];
  const allowAllMembers =
    typeof input.allowAllMembers === "boolean" ?
      input.allowAllMembers :
      typeof current?.allowAllMembers === "boolean" ?
        current.allowAllMembers :
        false;

  if (visibility === "public") {
    return {
      visibility,
      priceCents: 0,
      allowedPlanCodes: [],
      allowAllMembers: false,
    };
  }
  if (visibility === "premium") {
    return {
      visibility,
      priceCents,
      allowedPlanCodes: [],
      allowAllMembers: false,
    };
  }
  return {
    visibility,
    priceCents: 0,
    allowedPlanCodes: allowAllMembers ? [] : allowedPlanCodes,
    allowAllMembers,
  };
}

export async function listTrainingVideos(options?: {
  category?: VideoCategory;
}): Promise<TrainingVideoRecord[]> {
  const categoryFilter = options?.category;
  const snap = categoryFilter ?
    await videosCollection().where("category", "==", categoryFilter).get() :
    await videosCollection().get();
  return snap.docs
    .map((doc) => mapVideo(doc.id, doc.data()))
    .filter((video) =>
      categoryFilter ? video.category === categoryFilter : true,
    )
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (b.recordedAt ?? "").localeCompare(a.recordedAt ?? "");
    });
}

export async function createTrainingVideo(
  input: UpsertVideoInput,
  actor: { uid: string; email?: string },
): Promise<TrainingVideoMutationResult> {
  if (!input.name?.trim()) throw new Error("NAME_REQUIRED");
  if (!input.playbackUrl?.trim()) throw new Error("PLAYBACK_URL_REQUIRED");

  const provider = parseEnum(
    input.playbackProvider,
    PLAYBACK_PROVIDERS,
    "youtube",
  );
  const playbackUrl = normalizePlaybackInput(input.playbackUrl);
  const playbackId = extractPlaybackId(provider, playbackUrl);
  const status = parseEnum(input.status, VIDEO_STATUSES, "draft");
  const resolvedCategory: VideoCategory =
    input.category === VIDEO_CATEGORY_TUTORIAL ||
    (Array.isArray(input.appPages) && input.appPages.length > 0) ?
      VIDEO_CATEGORY_TUTORIAL :
      parseEnum(input.category, VIDEO_CATEGORIES, "webinar");
  const isTutorial = resolvedCategory === VIDEO_CATEGORY_TUTORIAL;
  const access = accessFromInput(
    isTutorial ?
      {
        ...input,
        visibility: "public",
        priceCents: 0,
        allowAllMembers: false,
        allowedPlanCodes: [],
      } :
      input,
  );
  assertAccessRules(access);
  const targeting = isTutorial ?
    await resolveTutorialTargeting(input.appId, input.appPages) :
    {
      appId: await resolvePublishAppId(input.appId),
      appPages: [] as string[],
    };
  const appId = targeting.appId;
  const appPages = targeting.appPages;

  const ref = videosCollection().doc();
  const now = FieldValue.serverTimestamp();
  const thumbnailUrl =
    input.thumbnailUrl ??
    defaultThumbnailUrl(provider, playbackUrl, playbackId);

  await ref.set({
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    recordedAt: parseTimestamp(input.recordedAt ?? null) ?? now,
    status,
    /** Identity discriminator for Smart Refill / CMS queries. */
    category: resolvedCategory,
    subcategory: isTutorial ? null : (input.subcategory ?? null),
    appId,
    appPages: isTutorial ? appPages : [],
    webinarEventId: isTutorial ? null : (input.webinarEventId ?? null),
    playbackProvider: provider,
    playbackUrl,
    playbackId,
    thumbnailUrl,
    featured: isTutorial ? false : input.featured === true,
    sortOrder: Number(input.sortOrder) || 0,
    visibility: isTutorial ? "public" : access.visibility,
    priceCents: isTutorial ? 0 : access.priceCents,
    currency: input.currency?.trim() || "PHP",
    allowedPlanCodes: isTutorial ? [] : access.allowedPlanCodes,
    allowAllMembers: isTutorial ? false : access.allowAllMembers,
    certificationEnabled: isTutorial ? false : input.certificationEnabled === true,
    archivedAt: status === "archived" ? now : null,
    publishedAt: status === "published" ? now : null,
    tags: input.tags ?? [],
    viewCount: 0,
    purchaseCount: 0,
    commentCount: 0,
    questionCount: 0,
    createdBy: { uid: actor.uid, email: actor.email ?? "" },
    updatedBy: { uid: actor.uid, email: actor.email ?? "" },
    createdAt: now,
    updatedAt: now,
  });

  const saved = await ref.get();
  const video = mapVideo(saved.id, saved.data() ?? {});
  return {
    video,
    justPublished: status === "published",
  };
}

export async function updateTrainingVideo(
  videoId: string,
  input: UpsertVideoInput,
  actor: { uid: string; email?: string },
): Promise<TrainingVideoMutationResult> {
  const ref = videosCollection().doc(videoId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");

  const current = snap.data() ?? {};
  const previousStatus = parseEnum(current.status, VIDEO_STATUSES, "draft");
  const patch: Record<string, unknown> = {
    updatedBy: { uid: actor.uid, email: actor.email ?? "" },
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.recordedAt !== undefined) {
    patch.recordedAt = parseTimestamp(input.recordedAt);
  }

  const currentCategory = resolveVideoCategory(current);
  const nextCategory: VideoCategory =
    input.category !== undefined ?
      parseEnum(input.category, VIDEO_CATEGORIES, currentCategory) :
      currentCategory;
  const isTutorial = nextCategory === VIDEO_CATEGORY_TUTORIAL;

  // Always reaffirm tutorial identity so docs stay queryable by category.
  if (isTutorial) {
    patch.category = VIDEO_CATEGORY_TUTORIAL;
    patch.subcategory = null;
    patch.webinarEventId = null;
    if (input.featured !== undefined) patch.featured = false;
    if (
      input.visibility !== undefined ||
      input.priceCents !== undefined ||
      input.allowedPlanCodes !== undefined ||
      input.allowAllMembers !== undefined ||
      input.category !== undefined
    ) {
      patch.visibility = "public";
      patch.priceCents = 0;
      patch.allowedPlanCodes = [];
      patch.allowAllMembers = false;
      patch.certificationEnabled = false;
    }
  } else if (input.category !== undefined) {
    patch.category = nextCategory;
  }

  if (!isTutorial && input.subcategory !== undefined) {
    patch.subcategory = input.subcategory;
  }

  const targetingChanged =
    input.appId !== undefined ||
    input.appPages !== undefined ||
    input.category !== undefined;
  const needsTutorialTargetHeal =
    isTutorial &&
    (!(typeof current.appId === "string" && current.appId.trim()) ||
      !Array.isArray(current.appPages) ||
      current.appPages.length === 0);

  if (isTutorial && (targetingChanged || needsTutorialTargetHeal)) {
    const sourceAppId =
      input.appId !== undefined ? input.appId : current.appId;
    const sourcePages =
      input.appPages ??
      (Array.isArray(current.appPages) ? current.appPages.map(String) : []);
    const targeting = await resolveTutorialTargeting(sourceAppId, sourcePages);
    patch.appId = targeting.appId;
    patch.appPages = targeting.appPages;
  } else if (!isTutorial && targetingChanged) {
    const sourceAppId =
      input.appId !== undefined ? input.appId : current.appId;
    patch.appId = await resolvePublishAppId(
      typeof sourceAppId === "string" ? sourceAppId : null,
    );
    patch.appPages = [];
  }

  if (!isTutorial && input.webinarEventId !== undefined) {
    patch.webinarEventId = input.webinarEventId;
  }
  if (input.thumbnailUrl !== undefined) patch.thumbnailUrl = input.thumbnailUrl;
  if (!isTutorial && input.featured !== undefined) patch.featured = input.featured;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.currency !== undefined) patch.currency = input.currency.trim();
  if (!isTutorial && input.certificationEnabled !== undefined) {
    patch.certificationEnabled = input.certificationEnabled;
  }
  if (input.tags !== undefined) patch.tags = input.tags;

  if (
    !isTutorial &&
    (input.visibility !== undefined ||
      input.priceCents !== undefined ||
      input.allowedPlanCodes !== undefined ||
      input.allowAllMembers !== undefined)
  ) {
    const access = accessFromInput(input, current);
    assertAccessRules(access);
    patch.visibility = access.visibility;
    patch.priceCents = access.priceCents;
    patch.allowedPlanCodes = access.allowedPlanCodes;
    patch.allowAllMembers = access.allowAllMembers;
  }

  if (input.playbackProvider !== undefined || input.playbackUrl !== undefined) {
    const provider = parseEnum(
      input.playbackProvider ?? current.playbackProvider,
      PLAYBACK_PROVIDERS,
      "youtube",
    );
    const playbackUrl = normalizePlaybackInput(
      String(input.playbackUrl ?? current.playbackUrl ?? ""),
    );
    if (!playbackUrl) throw new Error("PLAYBACK_URL_REQUIRED");
    const playbackId = extractPlaybackId(provider, playbackUrl);
    patch.playbackProvider = provider;
    patch.playbackUrl = playbackUrl;
    patch.playbackId = playbackId;
    if (input.thumbnailUrl === undefined) {
      patch.thumbnailUrl = defaultThumbnailUrl(provider, playbackUrl, playbackId);
    }
  }

  if (input.status !== undefined) {
    const status = parseEnum(input.status, VIDEO_STATUSES, "draft");
    patch.status = status;
    if (status === "published" && previousStatus !== "published") {
      patch.publishedAt = FieldValue.serverTimestamp();
    }
    if (status === "archived") {
      patch.archivedAt = FieldValue.serverTimestamp();
    }
  }

  await ref.set(patch, { merge: true });
  const saved = await ref.get();
  const video = mapVideo(saved.id, saved.data() ?? {});
  const justPublished =
    video.status === "published" && previousStatus !== "published";
  return { video, justPublished };
}

export async function deleteTrainingVideo(videoId: string): Promise<void> {
  const ref = videosCollection().doc(videoId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  await ref.delete();
}
