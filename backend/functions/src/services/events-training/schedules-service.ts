import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  ScheduleAudience,
  ScheduleChannel,
  ScheduleKind,
  SchedulePurpose,
  ScheduleTargetType,
} from "../../constants/events-training";
import {
  SCHEDULE_AUDIENCES,
  SCHEDULE_CHANNELS,
  SCHEDULE_KINDS,
  SCHEDULE_PURPOSES,
  SCHEDULE_TARGET_TYPES,
} from "../../constants/events-training";
import { toIsoString } from "../sales-serializer";
import {
  composeWebinarScheduleMessage,
  defaultAudienceForPurpose,
  defaultChannelsForPurpose,
  type ComposedWebinarScheduleMessage,
  type SchedulePurpose as ComposerPurpose,
} from "./schedule-message-composer";
import {
  schedulesCollection,
  webinarsCollection,
} from "./events-training-db";

export type ScheduleRecord = {
  id: string;
  targetType: ScheduleTargetType;
  targetId: string;
  purpose: SchedulePurpose;
  scheduleKind: ScheduleKind;
  fixedAt: string | null;
  weekday: number | null;
  daysBefore: number | null;
  channels: ScheduleChannel[];
  audience: ScheduleAudience;
  messageTemplate: string;
  emailTemplateKey: string | null;
  metaChannel: boolean;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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

function parseTimestamp(iso: string | null | undefined): Timestamp | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

function mapSchedule(id: string, data: Record<string, unknown>): ScheduleRecord {
  const channels = Array.isArray(data.channels) ?
    data.channels
      .map(String)
      .filter((c): c is ScheduleChannel =>
        (SCHEDULE_CHANNELS as readonly string[]).includes(c),
      ) :
    [];
  return {
    id,
    targetType: parseEnum(data.targetType, SCHEDULE_TARGET_TYPES, "webinar_event"),
    targetId: String(data.targetId ?? ""),
    purpose: parseEnum(data.purpose, SCHEDULE_PURPOSES, "reminder"),
    scheduleKind: parseEnum(data.scheduleKind, SCHEDULE_KINDS, "fixed_datetime"),
    fixedAt: toIsoString(data.fixedAt),
    weekday: data.weekday == null ? null : Number(data.weekday),
    daysBefore: data.daysBefore == null ? null : Number(data.daysBefore),
    channels: channels.length > 0 ? channels : (["email"] as ScheduleChannel[]),
    audience: parseEnum(data.audience, SCHEDULE_AUDIENCES, "registrants"),
    messageTemplate: String(data.messageTemplate ?? ""),
    emailTemplateKey:
      typeof data.emailTemplateKey === "string" ? data.emailTemplateKey : null,
    metaChannel: false,
    enabled: data.enabled !== false,
    nextRunAt: toIsoString(data.nextRunAt),
    lastRunAt: toIsoString(data.lastRunAt),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function normalizeChannels(input?: string[], metaChannel?: boolean): ScheduleChannel[] {
  // metaChannel is ignored — Meta Page posting was removed from Sales Portal.
  void metaChannel;
  const allowed = new Set(
    (SCHEDULE_CHANNELS as readonly string[]).filter((c) => c !== "meta"),
  );
  const channels = Array.isArray(input) ?
    input
      .map(String)
      .filter((c): c is ScheduleChannel => allowed.has(c)) :
    (["email"] as ScheduleChannel[]);
  return channels.length > 0 ? channels : (["email"] as ScheduleChannel[]);
}

export type UpsertScheduleInput = {
  targetType?: ScheduleTargetType;
  targetId?: string;
  purpose?: SchedulePurpose;
  scheduleKind?: ScheduleKind;
  fixedAt?: string | null;
  weekday?: number | null;
  daysBefore?: number | null;
  channels?: string[];
  audience?: ScheduleAudience;
  messageTemplate?: string;
  emailTemplateKey?: string | null;
  metaChannel?: boolean;
  enabled?: boolean;
};

export async function listSchedules(options?: {
  targetType?: string;
  targetId?: string;
}): Promise<ScheduleRecord[]> {
  let query:
    | FirebaseFirestore.Query
    | FirebaseFirestore.CollectionReference = schedulesCollection();

  if (options?.targetType?.trim()) {
    query = query.where("targetType", "==", options.targetType.trim());
  }
  if (options?.targetId?.trim()) {
    query = query.where("targetId", "==", options.targetId.trim());
  }

  const snap = await query.limit(200).get();
  return snap.docs
    .map((doc) => mapSchedule(doc.id, doc.data()))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function createSchedule(
  input: UpsertScheduleInput,
  actor: { uid: string; email?: string },
): Promise<ScheduleRecord> {
  if (!input.targetId?.trim()) throw new Error("TARGET_REQUIRED");
  const purpose = parseEnum(input.purpose, SCHEDULE_PURPOSES, "reminder");
  const scheduleKind = parseEnum(
    input.scheduleKind,
    SCHEDULE_KINDS,
    purpose === "reminder" ? "relative_before_event" : "fixed_datetime",
  );
  if (
    input.scheduleKind &&
    !(SCHEDULE_KINDS as readonly string[]).includes(input.scheduleKind)
  ) {
    throw new Error("INVALID_SCHEDULE_KIND");
  }

  const channels = normalizeChannels(
    input.channels ?? defaultChannelsForPurpose(purpose as ComposerPurpose),
    input.metaChannel,
  );
  const audience = parseEnum(
    input.audience,
    SCHEDULE_AUDIENCES,
    defaultAudienceForPurpose(purpose as ComposerPurpose),
  );

  const ref = schedulesCollection().doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({
    targetType: parseEnum(input.targetType, SCHEDULE_TARGET_TYPES, "webinar_event"),
    targetId: input.targetId.trim(),
    purpose,
    scheduleKind,
    fixedAt: parseTimestamp(input.fixedAt ?? null),
    weekday: input.weekday == null ? null : Number(input.weekday),
    daysBefore: input.daysBefore == null ? null : Number(input.daysBefore),
    channels,
    audience,
    messageTemplate: input.messageTemplate?.trim() ?? "",
    emailTemplateKey: input.emailTemplateKey?.trim() || null,
    metaChannel: false,
    enabled: input.enabled !== false,
    nextRunAt: null,
    lastRunAt: null,
    createdBy: { uid: actor.uid, email: actor.email ?? "" },
    updatedBy: { uid: actor.uid, email: actor.email ?? "" },
    createdAt: now,
    updatedAt: now,
  });

  const saved = await ref.get();
  return mapSchedule(saved.id, saved.data() ?? {});
}

export async function updateSchedule(
  scheduleId: string,
  input: UpsertScheduleInput,
  actor: { uid: string; email?: string },
): Promise<ScheduleRecord> {
  const ref = schedulesCollection().doc(scheduleId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("SCHEDULE_NOT_FOUND");

  const patch: Record<string, unknown> = {
    updatedBy: { uid: actor.uid, email: actor.email ?? "" },
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.targetType !== undefined) {
    patch.targetType = parseEnum(input.targetType, SCHEDULE_TARGET_TYPES, "webinar_event");
  }
  if (input.targetId !== undefined) {
    if (!input.targetId.trim()) throw new Error("TARGET_REQUIRED");
    patch.targetId = input.targetId.trim();
  }
  if (input.purpose !== undefined) {
    patch.purpose = parseEnum(input.purpose, SCHEDULE_PURPOSES, "reminder");
  }
  if (input.scheduleKind !== undefined) {
    if (!(SCHEDULE_KINDS as readonly string[]).includes(input.scheduleKind)) {
      throw new Error("INVALID_SCHEDULE_KIND");
    }
    patch.scheduleKind = input.scheduleKind;
  }
  if (input.fixedAt !== undefined) patch.fixedAt = parseTimestamp(input.fixedAt);
  if (input.weekday !== undefined) {
    patch.weekday = input.weekday == null ? null : Number(input.weekday);
  }
  if (input.daysBefore !== undefined) {
    patch.daysBefore = input.daysBefore == null ? null : Number(input.daysBefore);
  }
  if (input.channels !== undefined || input.metaChannel !== undefined) {
    const current = mapSchedule(snap.id, snap.data() ?? {});
    const channels = normalizeChannels(
      input.channels ?? current.channels,
      input.metaChannel ?? current.metaChannel,
    );
    patch.channels = channels;
    patch.metaChannel = false;
  }
  if (input.audience !== undefined) {
    patch.audience = parseEnum(input.audience, SCHEDULE_AUDIENCES, "registrants");
  }
  if (input.messageTemplate !== undefined) {
    patch.messageTemplate = input.messageTemplate.trim();
  }
  if (input.emailTemplateKey !== undefined) {
    patch.emailTemplateKey = input.emailTemplateKey?.trim() || null;
  }
  if (input.enabled !== undefined) patch.enabled = input.enabled === true;

  await ref.set(patch, { merge: true });
  const saved = await ref.get();
  return mapSchedule(saved.id, saved.data() ?? {});
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const ref = schedulesCollection().doc(scheduleId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("SCHEDULE_NOT_FOUND");
  await ref.delete();
}

export async function previewWebinarScheduleMessage(input: {
  webinarId: string;
  purpose?: string;
  messageTemplate?: string | null;
}): Promise<ComposedWebinarScheduleMessage> {
  const webinarId = input.webinarId.trim();
  if (!webinarId) throw new Error("TARGET_REQUIRED");
  const snap = await webinarsCollection().doc(webinarId).get();
  if (!snap.exists) throw new Error("WEBINAR_NOT_FOUND");
  const data = snap.data() ?? {};
  const purpose = parseEnum(
    input.purpose,
    SCHEDULE_PURPOSES,
    "new_webinar",
  ) as ComposerPurpose;
  const composed = composeWebinarScheduleMessage({
    purpose,
    webinar: {
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
    },
  });

  const custom = input.messageTemplate?.trim();
  if (custom) {
    return {
      ...composed,
      emailBody: custom,
      metaCaption: custom,
    };
  }
  return composed;
}
