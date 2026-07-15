import { FieldValue } from "firebase-admin/firestore";
import type {
  BlogStatus,
  VideoVisibility,
} from "../../constants/events-training";
import {
  BLOG_STATUSES,
  VIDEO_VISIBILITY,
} from "../../constants/events-training";
import { toIsoString } from "../sales-serializer";
import { blogsCollection } from "./events-training-db";
import { resolvePublishAppId } from "./tutorial-apps-service";

export type WrsBlogRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  /** Display byline shown on Resources. */
  authorName: string;
  heroImageUrl: string | null;
  status: BlogStatus;
  /** Firestore `apps/{appId}` this article publishes for. */
  appId: string;
  visibility: VideoVisibility;
  priceCents: number;
  currency: string;
  allowedPlanCodes: string[];
  allowAllMembers: boolean;
  /** Highlighted on Resources blog listings. */
  featured: boolean;
  publishedAt: string | null;
  archivedAt: string | null;
  tags: string[];
  allowAnonymousComments: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

function parseStatus(value: unknown): BlogStatus {
  return BLOG_STATUSES.includes(value as BlogStatus)
    ? (value as BlogStatus)
    : "draft";
}

function normalizeVisibility(raw: unknown): VideoVisibility {
  if (raw === "members" || raw === "subscription") return "private";
  return typeof raw === "string" &&
    (VIDEO_VISIBILITY as readonly string[]).includes(raw)
    ? (raw as VideoVisibility)
    : "public";
}

function resolveAllowAllMembers(
  data: Record<string, unknown>,
  visibility: VideoVisibility,
): boolean {
  if (typeof data.allowAllMembers === "boolean") return data.allowAllMembers;
  if (data.visibility === "members") return true;
  if (visibility !== "private") return false;
  const plans = Array.isArray(data.allowedPlanCodes)
    ? data.allowedPlanCodes
    : [];
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

function resolveAccess(
  input: UpsertBlogInput,
  current?: WrsBlogRecord | null,
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
    Math.floor(
      Number(
        input.priceCents !== undefined
          ? input.priceCents
          : (current?.priceCents ?? 0),
      ) || 0,
    ),
  );
  const allowedPlanCodes = Array.isArray(input.allowedPlanCodes)
    ? input.allowedPlanCodes.map(String)
    : Array.isArray(current?.allowedPlanCodes)
      ? current.allowedPlanCodes.map(String)
      : [];
  const allowAllMembers =
    typeof input.allowAllMembers === "boolean"
      ? input.allowAllMembers
      : typeof current?.allowAllMembers === "boolean"
        ? current.allowAllMembers
        : true;

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

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const slug = base || `post-${Date.now()}`;
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const snap = await blogsCollection()
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    const taken = snap.docs.some((doc) => doc.id !== excludeId);
    if (!taken) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

function resolveAuthorName(data: Record<string, unknown>): string {
  if (typeof data.authorName === "string" && data.authorName.trim()) {
    return data.authorName.trim();
  }
  const author = data.author;
  if (author && typeof author === "object") {
    const record = author as Record<string, unknown>;
    if (typeof record.name === "string" && record.name.trim()) {
      return record.name.trim();
    }
    if (typeof record.displayName === "string" && record.displayName.trim()) {
      return record.displayName.trim();
    }
  }
  return "";
}

function mapBlog(id: string, data: Record<string, unknown>): WrsBlogRecord {
  const visibility = normalizeVisibility(data.visibility);
  const appId =
    typeof data.appId === "string" && data.appId.trim()
      ? data.appId.trim()
      : "smartrefill";
  return {
    id,
    title: String(data.title ?? ""),
    slug: String(data.slug ?? id),
    excerpt: String(data.excerpt ?? ""),
    body: String(data.body ?? ""),
    authorName: resolveAuthorName(data),
    heroImageUrl: typeof data.heroImageUrl === "string" ? data.heroImageUrl : null,
    status: parseStatus(data.status),
    appId,
    visibility,
    priceCents: Number(data.priceCents) || 0,
    currency: typeof data.currency === "string" ? data.currency : "PHP",
    allowedPlanCodes: Array.isArray(data.allowedPlanCodes)
      ? data.allowedPlanCodes.map(String)
      : [],
    allowAllMembers: resolveAllowAllMembers(data, visibility),
    featured: data.featured === true,
    publishedAt: toIsoString(data.publishedAt),
    archivedAt: toIsoString(data.archivedAt),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    allowAnonymousComments: data.allowAnonymousComments !== false,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export type UpsertBlogInput = {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  authorName?: string;
  heroImageUrl?: string | null;
  status?: BlogStatus;
  appId?: string | null;
  visibility?: VideoVisibility;
  priceCents?: number;
  allowedPlanCodes?: string[];
  allowAllMembers?: boolean;
  featured?: boolean;
  tags?: string[];
  allowAnonymousComments?: boolean;
};

export async function listWrsBlogs(): Promise<WrsBlogRecord[]> {
  const snap = await blogsCollection().get();
  return snap.docs
    .map((doc) => mapBlog(doc.id, doc.data()))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export async function createWrsBlog(
  input: UpsertBlogInput,
  actor: { uid: string; email?: string },
): Promise<WrsBlogRecord> {
  if (!input.title?.trim()) throw new Error("TITLE_REQUIRED");

  const status = parseStatus(input.status);
  const access = resolveAccess(input);
  assertAccessRules(access);
  const appId = await resolvePublishAppId(input.appId);
  const slug = await uniqueSlug(input.slug?.trim() || slugify(input.title));
  const ref = blogsCollection().doc();
  const now = FieldValue.serverTimestamp();

  const authorName = input.authorName?.trim() ?? "";

  await ref.set({
    title: input.title.trim(),
    slug,
    excerpt: input.excerpt?.trim() ?? "",
    body: input.body?.trim() ?? "",
    authorName,
    heroImageUrl: input.heroImageUrl ?? null,
    status,
    appId,
    visibility: access.visibility,
    priceCents: access.priceCents,
    currency: "PHP",
    allowedPlanCodes: access.allowedPlanCodes,
    allowAllMembers: access.allowAllMembers,
    featured: input.featured === true,
    unlockPrice:
      access.visibility === "premium"
        ? Math.round((access.priceCents / 100) * 100) / 100
        : null,
    publishedAt: status === "published" ? now : null,
    archivedAt: status === "archived" ? now : null,
    tags: input.tags ?? [],
    allowAnonymousComments: input.allowAnonymousComments !== false,
    author: {
      uid: actor.uid,
      email: actor.email ?? "",
      name: authorName,
    },
    createdBy: { uid: actor.uid, email: actor.email ?? "" },
    updatedBy: { uid: actor.uid, email: actor.email ?? "" },
    createdAt: now,
    updatedAt: now,
  });

  const saved = await ref.get();
  return mapBlog(saved.id, saved.data() ?? {});
}

export async function updateWrsBlog(
  blogId: string,
  input: UpsertBlogInput,
  actor: { uid: string; email?: string },
): Promise<WrsBlogRecord> {
  const ref = blogsCollection().doc(blogId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");

  const previous = mapBlog(snap.id, snap.data() ?? {});
  const accessTouched =
    input.visibility !== undefined ||
    input.priceCents !== undefined ||
    input.allowedPlanCodes !== undefined ||
    input.allowAllMembers !== undefined;
  const access = accessTouched ? resolveAccess(input, previous) : null;
  if (access) assertAccessRules(access);

  const patch: Record<string, unknown> = {
    updatedBy: { uid: actor.uid, email: actor.email ?? "" },
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.excerpt !== undefined) patch.excerpt = input.excerpt.trim();
  if (input.body !== undefined) patch.body = input.body.trim();
  if (input.authorName !== undefined) {
    const authorName = input.authorName.trim();
    patch.authorName = authorName;
    patch.author = {
      uid: actor.uid,
      email: actor.email ?? "",
      name: authorName,
    };
  }
  if (input.heroImageUrl !== undefined) patch.heroImageUrl = input.heroImageUrl;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.allowAnonymousComments !== undefined) {
    patch.allowAnonymousComments = input.allowAnonymousComments;
  }
  if (input.featured !== undefined) {
    patch.featured = input.featured === true;
  }
  if (input.appId !== undefined) {
    patch.appId = await resolvePublishAppId(input.appId, previous.appId);
  }
  if (access) {
    patch.visibility = access.visibility;
    patch.priceCents = access.priceCents;
    patch.currency = "PHP";
    patch.allowedPlanCodes = access.allowedPlanCodes;
    patch.allowAllMembers = access.allowAllMembers;
    patch.unlockPrice =
      access.visibility === "premium"
        ? Math.round((access.priceCents / 100) * 100) / 100
        : null;
  }

  if (input.slug !== undefined) {
    patch.slug = await uniqueSlug(
      slugify(input.slug) ||
        slugify(String(patch.title ?? snap.data()?.title ?? "")),
      blogId,
    );
  } else if (input.title !== undefined) {
    const currentSlug = String(snap.data()?.slug ?? "");
    if (currentSlug.startsWith("post-") || !currentSlug) {
      patch.slug = await uniqueSlug(slugify(input.title), blogId);
    }
  }

  if (input.status !== undefined) {
    const status = parseStatus(input.status);
    patch.status = status;
    if (status === "published" && snap.data()?.status !== "published") {
      patch.publishedAt = FieldValue.serverTimestamp();
    }
    if (status === "archived") {
      patch.archivedAt = FieldValue.serverTimestamp();
    }
  }

  await ref.set(patch, { merge: true });
  const saved = await ref.get();
  return mapBlog(saved.id, saved.data() ?? {});
}

export async function deleteWrsBlog(blogId: string): Promise<void> {
  const ref = blogsCollection().doc(blogId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  await ref.delete();
}
