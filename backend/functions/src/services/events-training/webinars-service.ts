import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  VideoVisibility,
  WebinarStatus,
} from "../../constants/events-training";
import {
  VIDEO_VISIBILITY,
  WEBINAR_STATUSES,
} from "../../constants/events-training";
import { toIsoString } from "../sales-serializer";
import { webinarsCollection } from "./events-training-db";
import { resolvePublishAppId } from "./tutorial-apps-service";

export type WebinarRecord = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  speaker: string;
  host: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  posterUrl: string | null;
  status: WebinarStatus;
  /** Firestore `apps/{appId}` this webinar publishes for. */
  appId: string;
  visibility: VideoVisibility;
  priceCents: number;
  currency: string;
  allowedPlanCodes: string[];
  allowAllMembers: boolean;
  capacity: number | null;
  registrationCount: number;
  /** When true, SmartRefill registers members as accepted immediately. */
  autoAccept: boolean;
  joinLink: string | null;
  linkedVideoId: string | null;
  certificationEnabled: boolean;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
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

function parseStatus(value: unknown): WebinarStatus {
  return parseEnum(value, WEBINAR_STATUSES, "draft");
}

function normalizeVisibility(raw: unknown): VideoVisibility {
  if (raw === "members" || raw === "subscription") return "private";
  return parseEnum(raw, VIDEO_VISIBILITY, "private");
}

function resolveAllowAllMembers(
  data: Record<string, unknown>,
  visibility: VideoVisibility,
): boolean {
  if (typeof data.allowAllMembers === "boolean") return data.allowAllMembers;
  if (data.visibility === "members") return true;
  if (visibility !== "private") return false;
  const plans = Array.isArray(data.allowedPlanCodes) ?
    data.allowedPlanCodes :
    [];
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
  input: UpsertWebinarInput,
  current?: WebinarRecord | null,
): {
  visibility: VideoVisibility;
  priceCents: number;
  allowedPlanCodes: string[];
  allowAllMembers: boolean;
} {
  const visibility = normalizeVisibility(
    input.visibility ?? current?.visibility ?? "private",
  );
  const priceCents = Math.max(
    0,
    Math.floor(
      Number(
        input.priceCents !== undefined ?
          input.priceCents :
          (current?.priceCents ?? 0),
      ) || 0,
    ),
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
        true;

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

function mapWebinar(id: string, data: Record<string, unknown>): WebinarRecord {
  const visibility = normalizeVisibility(data.visibility);
  const appId =
    typeof data.appId === "string" && data.appId.trim() ?
      data.appId.trim() :
      "smartrefill";
  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    speaker: String(data.speaker ?? ""),
    host: String(data.host ?? ""),
    startsAt: toIsoString(data.startsAt),
    endsAt: toIsoString(data.endsAt),
    timezone: typeof data.timezone === "string" ? data.timezone : "Asia/Manila",
    posterUrl: typeof data.posterUrl === "string" ? data.posterUrl : null,
    status: parseStatus(data.status),
    appId,
    visibility,
    priceCents: Number(data.priceCents) || 0,
    currency: typeof data.currency === "string" ? data.currency : "PHP",
    allowedPlanCodes: Array.isArray(data.allowedPlanCodes) ?
      data.allowedPlanCodes.map(String) :
      [],
    allowAllMembers: resolveAllowAllMembers(data, visibility),
    capacity: data.capacity == null ? null : Number(data.capacity),
    registrationCount: Number(data.registrationCount) || 0,
    autoAccept: data.autoAccept === true,
    joinLink: typeof data.joinLink === "string" ? data.joinLink : null,
    linkedVideoId:
      typeof data.linkedVideoId === "string" ? data.linkedVideoId : null,
    certificationEnabled: data.certificationEnabled === true,
    archivedAt: toIsoString(data.archivedAt),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    publishedAt: toIsoString(data.publishedAt),
  };
}

function parseTimestamp(iso: string | null | undefined): Timestamp | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

export type UpsertWebinarInput = {
  name?: string;
  description?: string;
  tags?: string[];
  speaker?: string;
  host?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string;
  posterUrl?: string | null;
  status?: WebinarStatus;
  appId?: string | null;
  visibility?: VideoVisibility;
  priceCents?: number;
  allowedPlanCodes?: string[];
  allowAllMembers?: boolean;
  capacity?: number | null;
  autoAccept?: boolean;
  joinLink?: string | null;
  linkedVideoId?: string | null;
  certificationEnabled?: boolean;
};

export type WebinarMutationResult = {
  webinar: WebinarRecord;
  justPublished: boolean;
};

export async function listWebinars(): Promise<WebinarRecord[]> {
  const snap = await webinarsCollection().get();
  return snap.docs
    .map((doc) => mapWebinar(doc.id, doc.data()))
    .sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? ""));
}

export async function createWebinar(
  input: UpsertWebinarInput,
  actor: { uid: string; email?: string },
): Promise<WebinarMutationResult> {
  if (!input.name?.trim()) throw new Error("NAME_REQUIRED");

  const status = parseStatus(input.status);
  const access = resolveAccess(input);
  assertAccessRules(access);
  const appId = await resolvePublishAppId(input.appId);

  const ref = webinarsCollection().doc();
  const now = FieldValue.serverTimestamp();
  const archivedAt =
    status === "archived" ? FieldValue.serverTimestamp() : null;

  await ref.set({
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    tags: input.tags ?? [],
    speaker: input.speaker?.trim() ?? "",
    host: input.host?.trim() ?? "",
    startsAt: parseTimestamp(input.startsAt ?? null),
    endsAt: parseTimestamp(input.endsAt ?? null),
    timezone: input.timezone?.trim() || "Asia/Manila",
    posterUrl: input.posterUrl ?? null,
    status,
    appId,
    visibility: access.visibility,
    priceCents: access.priceCents,
    currency: "PHP",
    allowedPlanCodes: access.allowedPlanCodes,
    allowAllMembers: access.allowAllMembers,
    capacity: input.capacity ?? null,
    registrationCount: 0,
    autoAccept: input.autoAccept === true,
    joinLink: input.joinLink?.trim() ?? null,
    linkedVideoId: input.linkedVideoId ?? null,
    certificationEnabled: input.certificationEnabled === true,
    // SmartRefill premium checkout reads unlockPrice (PHP), not priceCents.
    unlockPrice:
      access.visibility === "premium" ?
        Math.round((access.priceCents / 100) * 100) / 100 :
        null,
    archivedAt,
    publishedAt: status === "published" ? now : null,
    createdBy: { uid: actor.uid, email: actor.email ?? "" },
    updatedBy: { uid: actor.uid, email: actor.email ?? "" },
    createdAt: now,
    updatedAt: now,
  });

  const saved = await ref.get();
  return {
    webinar: mapWebinar(saved.id, saved.data() ?? {}),
    justPublished: status === "published",
  };
}

export async function updateWebinar(
  webinarId: string,
  input: UpsertWebinarInput,
  actor: { uid: string; email?: string },
): Promise<WebinarMutationResult> {
  const ref = webinarsCollection().doc(webinarId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");

  const previous = mapWebinar(snap.id, snap.data() ?? {});
  const previousStatus = previous.status;
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

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.speaker !== undefined) patch.speaker = input.speaker.trim();
  if (input.host !== undefined) patch.host = input.host.trim();
  if (input.startsAt !== undefined) patch.startsAt = parseTimestamp(input.startsAt);
  if (input.endsAt !== undefined) patch.endsAt = parseTimestamp(input.endsAt);
  if (input.timezone !== undefined) patch.timezone = input.timezone.trim();
  if (input.posterUrl !== undefined) patch.posterUrl = input.posterUrl;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.autoAccept !== undefined) patch.autoAccept = input.autoAccept === true;
  if (input.joinLink !== undefined) patch.joinLink = input.joinLink?.trim() ?? null;
  if (input.linkedVideoId !== undefined) patch.linkedVideoId = input.linkedVideoId;
  if (input.certificationEnabled !== undefined) {
    patch.certificationEnabled = input.certificationEnabled;
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
      access.visibility === "premium" ?
        Math.round((access.priceCents / 100) * 100) / 100 :
        null;
  }

  if (input.status !== undefined) {
    const status = parseStatus(input.status);
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
  const webinar = mapWebinar(saved.id, saved.data() ?? {});
  const justPublished =
    webinar.status === "published" && previousStatus !== "published";
  return { webinar, justPublished };
}

export async function deleteWebinar(webinarId: string): Promise<void> {
  const ref = webinarsCollection().doc(webinarId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  await ref.delete();
}
