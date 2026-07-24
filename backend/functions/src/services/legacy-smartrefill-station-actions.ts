import type {
  DocumentReference,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db, FieldValue, prodSmartrefillDb } from "../config/firebase-admin";
import { mapWithConcurrency } from "../utils/map-with-concurrency";
import { sendOutreachEmail } from "./outreach/send-outreach-email";

const FLAGS_COLLECTION = "legacy_smartrefill_station_flags";
const BATCH_LIMIT = 400;

/** Contacted stations return to Triage after this many days (ignored stays handled). */
export const LEGACY_CONTACT_COOLDOWN_DAYS = 15;

export type LegacyStationTriageStatus = "open" | "contacted" | "ignored";

export type LegacyStationFlag = {
  stationId: string;
  ignored: boolean;
  contacted: boolean;
  ignoredAt: string | null;
  contactedAt: string | null;
  triageStatus: LegacyStationTriageStatus;
};

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    return new Date(
      (value as { _seconds: number })._seconds * 1000,
    ).toISOString();
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  return null;
}

function isWithinCooldown(
  contactedAt: string | null,
  nowMs: number,
  days: number,
): boolean {
  if (!contactedAt) return false;
  const contactedMs = Date.parse(contactedAt);
  if (Number.isNaN(contactedMs)) return false;
  return nowMs - contactedMs < days * 24 * 60 * 60 * 1000;
}

/** Ignored stays handled forever; contacted returns to open after cooldown. */
export function resolveLegacyStationTriageStatus(input: {
  ignored: boolean;
  contacted: boolean;
  contactedAt: string | null;
  nowMs?: number;
  cooldownDays?: number;
}): LegacyStationTriageStatus {
  if (input.ignored) return "ignored";
  if (
    input.contacted &&
    isWithinCooldown(
      input.contactedAt,
      input.nowMs ?? Date.now(),
      input.cooldownDays ?? LEGACY_CONTACT_COOLDOWN_DAYS,
    )
  ) {
    return "contacted";
  }
  return "open";
}

function flagFromDoc(
  stationId: string,
  data: Record<string, unknown>,
  nowMs = Date.now(),
): LegacyStationFlag {
  const ignored = Boolean(data.ignored);
  const contacted = Boolean(data.contacted);
  const contactedAt = toIso(data.contactedAt);
  return {
    stationId,
    ignored,
    contacted,
    ignoredAt: toIso(data.ignoredAt),
    contactedAt,
    triageStatus: resolveLegacyStationTriageStatus({
      ignored,
      contacted,
      contactedAt,
      nowMs,
    }),
  };
}

async function deleteCollectionDocs(ref: DocumentReference): Promise<void> {
  const subcollections = await ref.listCollections();
  for (const subcollection of subcollections) {
    let cursor: QueryDocumentSnapshot | undefined;
    for (;;) {
      let query = subcollection.orderBy("__name__").limit(BATCH_LIMIT);
      if (cursor) query = query.startAfter(cursor);
      const snap = await query.get();
      if (snap.empty) break;

      await mapWithConcurrency(snap.docs, 8, async (doc) => {
        await deleteCollectionDocs(doc.ref);
        await doc.ref.delete();
      });

      cursor = snap.docs[snap.docs.length - 1];
      if (snap.size < BATCH_LIMIT) break;
    }
  }
}

/** Deletes a legacy station user doc and all nested subcollections in prod-smartrefill. */
export async function deleteLegacySmartRefillStation(input: {
  stationId: string;
  actorUid: string;
}): Promise<{ stationId: string; deleted: boolean }> {
  const stationId = input.stationId.trim();
  if (!stationId) {
    throw new Error("Station id is required.");
  }

  const userRef = prodSmartrefillDb.collection("users").doc(stationId);
  const snap = await userRef.get();
  if (!snap.exists) {
    await db.collection(FLAGS_COLLECTION).doc(stationId).delete().catch(() => undefined);
    return { stationId, deleted: false };
  }

  await deleteCollectionDocs(userRef);
  await userRef.delete();
  await db.collection(FLAGS_COLLECTION).doc(stationId).delete().catch(() => undefined);

  return { stationId, deleted: true };
}

const BULK_ACTION_MAX = 50;

function normalizeBulkStationIds(stationIds: string[]): string[] {
  return [
    ...new Set(
      stationIds
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].slice(0, BULK_ACTION_MAX);
}

export async function bulkDeleteLegacySmartRefillStations(input: {
  stationIds: string[];
  actorUid: string;
}): Promise<{
  deletedIds: string[];
  missingIds: string[];
  failed: Array<{ stationId: string; error: string }>;
}> {
  const uniqueIds = normalizeBulkStationIds(input.stationIds);

  const deletedIds: string[] = [];
  const missingIds: string[] = [];
  const failed: Array<{ stationId: string; error: string }> = [];

  for (const stationId of uniqueIds) {
    try {
      const result = await deleteLegacySmartRefillStation({
        stationId,
        actorUid: input.actorUid,
      });
      if (result.deleted) deletedIds.push(stationId);
      else missingIds.push(stationId);
    } catch (error) {
      failed.push({
        stationId,
        error: error instanceof Error ? error.message : "Delete failed",
      });
    }
  }

  return { deletedIds, missingIds, failed };
}

export async function ignoreLegacySmartRefillStation(input: {
  stationId: string;
  actorUid: string;
}): Promise<{ stationId: string; triageStatus: "ignored" }> {
  const stationId = input.stationId.trim();
  if (!stationId) {
    throw new Error("Station id is required.");
  }

  await db.collection(FLAGS_COLLECTION).doc(stationId).set(
    {
      ignored: true,
      ignoredAt: FieldValue.serverTimestamp(),
      ignoredBy: input.actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { stationId, triageStatus: "ignored" };
}

export async function bulkIgnoreLegacySmartRefillStations(input: {
  stationIds: string[];
  actorUid: string;
}): Promise<{
  updatedIds: string[];
  failed: Array<{ stationId: string; error: string }>;
}> {
  const uniqueIds = normalizeBulkStationIds(input.stationIds);
  const updatedIds: string[] = [];
  const failed: Array<{ stationId: string; error: string }> = [];

  for (const stationId of uniqueIds) {
    try {
      await ignoreLegacySmartRefillStation({
        stationId,
        actorUid: input.actorUid,
      });
      updatedIds.push(stationId);
    } catch (error) {
      failed.push({
        stationId,
        error: error instanceof Error ? error.message : "Ignore failed",
      });
    }
  }

  return { updatedIds, failed };
}

/** Marks a station as contacted after sending the legacy Brevo outreach email. */
export async function contactLegacySmartRefillStation(input: {
  stationId: string;
  actorUid: string;
  toEmail?: string | null;
  recipientName?: string | null;
  businessName?: string | null;
}): Promise<{
  stationId: string;
  triageStatus: "contacted";
  outreach: Awaited<ReturnType<typeof sendOutreachEmail>>;
}> {
  const stationId = input.stationId.trim();
  if (!stationId) {
    throw new Error("Station id is required.");
  }

  const profile = await loadLegacyStationContactProfile(stationId);
  const toEmail = (input.toEmail || profile.email || "").trim();
  if (!toEmail || !toEmail.includes("@")) {
    throw new Error("Station email is required to send outreach via Brevo.");
  }

  const outreach = await sendOutreachEmail({
    toEmail,
    kind: "legacy_station",
    personalization: {
      recipientName: input.recipientName || profile.ownerName,
      businessName: input.businessName || profile.businessName,
    },
    actorUid: input.actorUid,
  });

  await db.collection(FLAGS_COLLECTION).doc(stationId).set(
    {
      contacted: true,
      contactedAt: FieldValue.serverTimestamp(),
      contactedBy: input.actorUid,
      // Contacting removes "ignored" so status is contacted.
      ignored: false,
      lastOutreachMessageId: outreach.messageId ?? null,
      lastOutreachSubject: outreach.subject,
      lastOutreachSkipped: outreach.skipped,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { stationId, triageStatus: "contacted", outreach };
}

export async function bulkContactLegacySmartRefillStations(input: {
  stationIds: string[];
  actorUid: string;
}): Promise<{
  updatedIds: string[];
  failed: Array<{ stationId: string; error: string }>;
}> {
  const uniqueIds = normalizeBulkStationIds(input.stationIds);
  const updatedIds: string[] = [];
  const failed: Array<{ stationId: string; error: string }> = [];

  for (const stationId of uniqueIds) {
    try {
      await contactLegacySmartRefillStation({
        stationId,
        actorUid: input.actorUid,
      });
      updatedIds.push(stationId);
    } catch (error) {
      failed.push({
        stationId,
        error: error instanceof Error ? error.message : "Contact failed",
      });
    }
  }

  return { updatedIds, failed };
}

async function loadLegacyStationContactProfile(stationId: string): Promise<{
  email: string;
  ownerName: string;
  businessName: string;
}> {
  const userRef = prodSmartrefillDb.collection("users").doc(stationId);
  const [userSnap, profileSnap] = await Promise.all([
    userRef.get(),
    userRef.collection("profile").doc("main").get(),
  ]);
  const user = userSnap.data() || {};
  const profile = profileSnap.data() || {};
  return {
    email: String(user.email || "").trim(),
    ownerName:
      String(profile.ownerName || "").trim() ||
      String(user.displayName || "").trim(),
    businessName:
      String(profile.businessName || "").trim() ||
      String(user.displayName || "").trim(),
  };
}

/** Clears contacted/ignored so the station returns to Triage. */
export async function restoreLegacySmartRefillStation(input: {
  stationId: string;
  actorUid: string;
}): Promise<{ stationId: string; triageStatus: "open" }> {
  const stationId = input.stationId.trim();
  if (!stationId) {
    throw new Error("Station id is required.");
  }

  await db.collection(FLAGS_COLLECTION).doc(stationId).set(
    {
      ignored: false,
      contacted: false,
      restoredAt: FieldValue.serverTimestamp(),
      restoredBy: input.actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { stationId, triageStatus: "open" };
}

export async function getLegacyStationFlag(
  stationId: string,
): Promise<LegacyStationFlag | null> {
  const snap = await db.collection(FLAGS_COLLECTION).doc(stationId).get();
  if (!snap.exists) return null;
  return flagFromDoc(stationId, snap.data() || {});
}

export async function getLegacyStationFlagsMap(): Promise<
  Map<string, LegacyStationFlag>
  > {
  const snap = await db.collection(FLAGS_COLLECTION).get();
  const flags = new Map<string, LegacyStationFlag>();
  const nowMs = Date.now();

  for (const doc of snap.docs) {
    flags.set(doc.id, flagFromDoc(doc.id, doc.data() || {}, nowMs));
  }

  return flags;
}
