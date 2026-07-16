import { FieldValue } from "firebase-admin/firestore";
import type { RegistrationStatus } from "../../constants/events-training";
import { REGISTRATION_STATUSES } from "../../constants/events-training";
import { toIsoString } from "../sales-serializer";
import {
  registrationsCollection,
  webinarsCollection,
} from "./events-training-db";

export type RegistrationRecord = {
  id: string;
  eventId: string;
  userId: string;
  businessId: string;
  email: string;
  status: RegistrationStatus;
  emailReminderOptIn: boolean;
  joinLink: string | null;
  attendanceStatus: "attended" | "no_show" | null;
  attendedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  lastReminderSentAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function parseStatus(value: unknown): RegistrationStatus {
  return REGISTRATION_STATUSES.includes(value as RegistrationStatus) ?
    (value as RegistrationStatus) :
    "pending";
}

export function canAcceptGivenCapacity(
  acceptedCount: number,
  capacity: number | null | undefined,
): boolean {
  if (capacity == null || !Number.isFinite(capacity) || capacity < 0) {
    return true;
  }
  return acceptedCount < capacity;
}

export function canTransitionRegistration(
  from: RegistrationStatus,
  to: RegistrationStatus,
): boolean {
  if (from === to) return true;
  if (from === "cancelled" || from === "declined") return false;
  if (from === "pending") {
    return to === "accepted" || to === "declined" || to === "cancelled";
  }
  if (from === "accepted") {
    return to === "cancelled" || to === "declined";
  }
  return false;
}

function mapRegistration(
  id: string,
  data: Record<string, unknown>,
): RegistrationRecord {
  const attendanceRaw = String(data.attendanceStatus ?? "");
  const attendanceStatus =
    attendanceRaw === "attended" || attendanceRaw === "no_show" ?
      attendanceRaw :
      null;
  return {
    id,
    eventId: String(data.eventId ?? ""),
    userId: String(data.userId ?? ""),
    businessId: String(data.businessId ?? ""),
    email: String(data.email ?? ""),
    status: parseStatus(data.status),
    emailReminderOptIn: data.emailReminderOptIn !== false,
    joinLink: typeof data.joinLink === "string" ? data.joinLink : null,
    attendanceStatus,
    attendedAt: toIsoString(data.attendedAt),
    decidedBy: typeof data.decidedBy === "string" ? data.decidedBy : null,
    decidedAt: toIsoString(data.decidedAt),
    lastReminderSentAt: toIsoString(data.lastReminderSentAt),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function withJoinLink(
  reg: RegistrationRecord,
  eventJoinLink: string | null,
): RegistrationRecord {
  return {
    ...reg,
    joinLink: reg.status === "accepted" ? eventJoinLink || reg.joinLink : null,
  };
}

async function getEventJoinLink(eventId: string): Promise<string | null> {
  const snap = await webinarsCollection().doc(eventId).get();
  const joinLink = snap.data()?.joinLink;
  return typeof joinLink === "string" ? joinLink : null;
}

async function countAccepted(eventId: string): Promise<number> {
  const snap = await registrationsCollection()
    .where("eventId", "==", eventId)
    .where("status", "==", "accepted")
    .get();
  return snap.size;
}

export async function listRegistrations(options?: {
  eventId?: string;
  status?: string;
}): Promise<RegistrationRecord[]> {
  let query:
    | FirebaseFirestore.Query
    | FirebaseFirestore.CollectionReference = registrationsCollection();

  if (options?.eventId?.trim()) {
    query = query.where("eventId", "==", options.eventId.trim());
  }
  if (
    options?.status &&
    REGISTRATION_STATUSES.includes(options.status as RegistrationStatus)
  ) {
    query = query.where("status", "==", options.status);
  }

  const snap = await query.limit(200).get();
  const joinLinkCache = new Map<string, string | null>();
  const items: RegistrationRecord[] = [];

  for (const doc of snap.docs) {
    const reg = mapRegistration(doc.id, doc.data());
    if (!joinLinkCache.has(reg.eventId)) {
      joinLinkCache.set(reg.eventId, await getEventJoinLink(reg.eventId));
    }
    items.push(withJoinLink(reg, joinLinkCache.get(reg.eventId) ?? null));
  }

  return items.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}

export async function acceptRegistration(
  registrationId: string,
  decidedBy: string,
): Promise<RegistrationRecord> {
  const ref = registrationsCollection().doc(registrationId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("REGISTRATION_NOT_FOUND");

  const current = mapRegistration(snap.id, snap.data() ?? {});
  if (!canTransitionRegistration(current.status, "accepted")) {
    throw new Error("INVALID_REGISTRATION_TRANSITION");
  }

  const eventRef = webinarsCollection().doc(current.eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new Error("EVENT_NOT_FOUND");

  const eventData = eventSnap.data() ?? {};
  const eventJoinLink =
    typeof eventData.joinLink === "string" ? eventData.joinLink : null;

  if (current.status === "accepted") {
    return withJoinLink(current, eventJoinLink);
  }

  const capacity =
    eventData.capacity == null ? null : Number(eventData.capacity);
  const acceptedCount = await countAccepted(current.eventId);
  if (!canAcceptGivenCapacity(acceptedCount, capacity)) {
    throw new Error("EVENT_AT_CAPACITY");
  }

  await ref.update({
    status: "accepted",
    decidedBy,
    decidedAt: FieldValue.serverTimestamp(),
    joinLink: eventJoinLink,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return withJoinLink(
    mapRegistration(updated.id, updated.data() ?? {}),
    eventJoinLink,
  );
}

export async function declineRegistration(
  registrationId: string,
  decidedBy: string,
): Promise<RegistrationRecord> {
  const ref = registrationsCollection().doc(registrationId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("REGISTRATION_NOT_FOUND");

  const current = mapRegistration(snap.id, snap.data() ?? {});
  if (!canTransitionRegistration(current.status, "declined")) {
    throw new Error("INVALID_REGISTRATION_TRANSITION");
  }
  if (current.status === "declined") {
    return { ...current, joinLink: null };
  }

  await ref.update({
    status: "declined",
    decidedBy,
    decidedAt: FieldValue.serverTimestamp(),
    joinLink: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (current.status === "pending" || current.status === "accepted") {
    await webinarsCollection()
      .doc(current.eventId)
      .set({ registrationCount: FieldValue.increment(-1) }, { merge: true });
  }

  const updated = await ref.get();
  return { ...mapRegistration(updated.id, updated.data() ?? {}), joinLink: null };
}

export async function setRegistrationAttendance(
  registrationId: string,
  attendanceStatus: "attended" | "no_show" | "cleared",
  opsUid: string,
): Promise<RegistrationRecord> {
  const ref = registrationsCollection().doc(registrationId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("REGISTRATION_NOT_FOUND");

  const current = mapRegistration(snap.id, snap.data() ?? {});
  const now = FieldValue.serverTimestamp();

  if (attendanceStatus === "cleared") {
    await ref.set(
      {
        attendanceStatus: null,
        attendedAt: null,
        attendanceMarkedByUid: opsUid,
        updatedAt: now,
      },
      { merge: true },
    );
  } else {
    await ref.set(
      {
        attendanceStatus,
        attendedAt: attendanceStatus === "attended" ? now : null,
        attendanceMarkedByUid: opsUid,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  const eventJoinLink = await getEventJoinLink(current.eventId);
  const updated = await ref.get();
  return withJoinLink(
    mapRegistration(updated.id, updated.data() ?? {}),
    eventJoinLink,
  );
}

export async function deleteRegistration(
  registrationId: string,
): Promise<void> {
  const ref = registrationsCollection().doc(registrationId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("REGISTRATION_NOT_FOUND");

  const current = mapRegistration(snap.id, snap.data() ?? {});
  await ref.delete();

  // registrationCount tracks pending + accepted sign-ups on the webinar.
  if (current.status === "pending" || current.status === "accepted") {
    await webinarsCollection()
      .doc(current.eventId)
      .set({ registrationCount: FieldValue.increment(-1) }, { merge: true });
  }
}
