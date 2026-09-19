import { db, FieldValue, Timestamp } from "../config/firebase-admin";
import type { AdminCatalogCollectionId } from "../constants/catalog-collections";
import {
  assertCatalogCollectionId,
  assertDocumentId,
  deserializeValue,
  getCatalogCollectionDocument,
  readCatalogDocumentRow,
  type CatalogDocumentRow,
  upsertCatalogCollectionDocument,
} from "./admin-catalog-collection-service";
import {
  commercialCatalogFields,
  isVersionedCatalogCollection,
  nextManilaMidnight,
  parseCatalogDate,
} from "../utils/catalog-publication";

export type CatalogActor = {
  uid: string;
  email?: string | null;
  role?: string | null;
};

export type CatalogAuditRow = {
  id: string;
  collectionId: string;
  documentId: string;
  action: string;
  actorUid: string;
  actorEmail: string | null;
  actorRole: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string | null;
};

const CATALOG_AUDIT_COLLECTION = "catalog_change_logs";
const DEFAULT_APP_DOC_ID = process.env.SMARTREFILL_APP_DOC_ID || "smartrefill";

function isoNow(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

async function writeCatalogAudit(input: {
  collectionId: string;
  documentId: string;
  action: string;
  actor: CatalogActor;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}): Promise<void> {
  await db.collection(CATALOG_AUDIT_COLLECTION).add({
    collectionId: input.collectionId,
    documentId: input.documentId,
    action: input.action,
    actorUid: input.actor.uid,
    actorEmail: input.actor.email || null,
    actorRole: input.actor.role || null,
    before: input.before,
    after: input.after,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function assertNotLastActiveFreePlan(
  collectionId: string,
  documentId: string,
  nextCode: string,
  nextActive: boolean,
): Promise<void> {
  if (collectionId !== "subscription_plans") return;
  if (nextActive !== false) return;
  const code = nextCode.toLowerCase();
  if (code !== "free") return;

  const snap = await db.collection("subscription_plans").get();
  const otherLiveFree = snap.docs.some((doc) => {
    if (doc.id === documentId) return false;
    const data = doc.data() as Record<string, unknown>;
    const rowCode = String(data.code || doc.id || "").toLowerCase();
    return rowCode === "free" && data.isActive !== false;
  });
  if (!otherLiveFree) {
    throw new Error("LAST_FREE_PLAN");
  }
}

async function syncAppRegistryIfNeeded(collectionId: string): Promise<void> {
  if (collectionId !== "subscription_plans") return;
  const snap = await db.collection("subscription_plans").get();
  const subscriptionPlans: Record<string, string> = {};
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (data.isActive === false) continue;
    if (String(data.catalogStatus || "published") === "draft") continue;
    const code = String(data.code || doc.id || "").toLowerCase();
    if (!code || code === "enterprise" || code === "custom") continue;
    const key = code === "pro" ? "grow" : code;
    subscriptionPlans[key] = doc.id;
  }
  if (Object.keys(subscriptionPlans).length === 0) return;
  await db.collection("apps").doc(DEFAULT_APP_DOC_ID).set(
    { subscriptionPlans, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function saveCatalogDocument(input: {
  collectionId: string;
  documentId: string;
  data: Record<string, unknown>;
  actor: CatalogActor;
  mode?: "draft" | "direct";
}): Promise<CatalogDocumentRow> {
  const collectionId = assertCatalogCollectionId(input.collectionId);
  const documentId = assertDocumentId(input.documentId);
  const mode =
    input.mode ||
    (isVersionedCatalogCollection(collectionId) ? "draft" : "direct");

  if (mode === "direct" || !isVersionedCatalogCollection(collectionId)) {
    const beforeSnap = await db.collection(collectionId).doc(documentId).get();
    const before = beforeSnap.exists ?
      (beforeSnap.data() as Record<string, unknown>) :
      null;
    const row = await upsertCatalogCollectionDocument(
      collectionId,
      documentId,
      input.data,
    );
    await writeCatalogAudit({
      collectionId,
      documentId,
      action: before ? "updated" : "created",
      actor: input.actor,
      before,
      after: row.data,
    });
    return row;
  }

  const docRef = db.collection(collectionId).doc(documentId);
  const existingSnap = await docRef.get();
  const existing = existingSnap.exists ?
    (existingSnap.data() as Record<string, unknown>) :
    {};
  const payload = deserializeValue(input.data) as Record<string, unknown>;
  const commercial = commercialCatalogFields(payload);
  const nextStatus =
    existing.catalogStatus === "published" || existing.limitations ?
      existing.catalogStatus || "published" :
      "draft";

  await docRef.set(
    {
      code: commercial.code ?? existing.code,
      name: commercial.name ?? existing.name,
      isActive: existing.isActive !== false,
      catalogStatus: nextStatus === "published" ? "published" : "draft",
      draft: commercial,
      draftSavedAt: FieldValue.serverTimestamp(),
      draftSavedByUid: input.actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existingSnap.exists ?
        {} :
        { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );

  const updated = await docRef.get();
  const row = readCatalogDocumentRow(collectionId, documentId, updated.data());
  await writeCatalogAudit({
    collectionId,
    documentId,
    action: "draft_saved",
    actor: input.actor,
    before: existingSnap.exists ? existing : null,
    after: row.data,
  });
  return row;
}

export async function publishCatalogDocument(input: {
  collectionId: string;
  documentId: string;
  actor: CatalogActor;
  effectiveAt?: string | null;
}): Promise<CatalogDocumentRow> {
  const collectionId = assertCatalogCollectionId(input.collectionId);
  const documentId = assertDocumentId(input.documentId);
  if (!isVersionedCatalogCollection(collectionId)) {
    throw new Error("NOT_VERSIONED");
  }

  const docRef = db.collection(collectionId).doc(documentId);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error("DOCUMENT_NOT_FOUND");
  const existing = snap.data() as Record<string, unknown>;
  const draft =
    existing.draft && typeof existing.draft === "object" ?
      (existing.draft as Record<string, unknown>) :
      commercialCatalogFields(existing);

  const requested =
    parseCatalogDate(input.effectiveAt) ||
    parseCatalogDate(draft.effectiveAt) ||
    nextManilaMidnight();

  const nextActive = draft.isActive !== false;
  await assertNotLastActiveFreePlan(
    collectionId,
    documentId,
    String(draft.code || existing.code || documentId),
    nextActive,
  );

  const publishedPayload = {
    ...draft,
    isActive: nextActive,
    catalogStatus: "published",
    effectiveAt: Timestamp.fromDate(requested),
    publishedAt: FieldValue.serverTimestamp(),
    publishedByUid: input.actor.uid,
    publishedByEmail: input.actor.email || null,
    draft: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(publishedPayload, { merge: true });
  await syncAppRegistryIfNeeded(collectionId);

  const updated = await docRef.get();
  const row = readCatalogDocumentRow(collectionId, documentId, updated.data());
  await writeCatalogAudit({
    collectionId,
    documentId,
    action: "published",
    actor: input.actor,
    before: existing,
    after: row.data,
  });
  return row;
}

export async function deactivateCatalogDocument(input: {
  collectionId: string;
  documentId: string;
  actor: CatalogActor;
}): Promise<CatalogDocumentRow> {
  const collectionId = assertCatalogCollectionId(input.collectionId);
  const documentId = assertDocumentId(input.documentId);
  const docRef = db.collection(collectionId).doc(documentId);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error("DOCUMENT_NOT_FOUND");
  const existing = snap.data() as Record<string, unknown>;

  await assertNotLastActiveFreePlan(
    collectionId,
    documentId,
    String(existing.code || documentId),
    false,
  );

  await docRef.set(
    {
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
      deactivatedAt: FieldValue.serverTimestamp(),
      deactivatedByUid: input.actor.uid,
    },
    { merge: true },
  );
  await syncAppRegistryIfNeeded(collectionId);

  const updated = await docRef.get();
  const row = readCatalogDocumentRow(collectionId, documentId, updated.data());
  await writeCatalogAudit({
    collectionId,
    documentId,
    action: "deactivated",
    actor: input.actor,
    before: existing,
    after: row.data,
  });
  return row;
}

export async function listCatalogDocumentAudit(
  collectionId: string,
  documentId: string,
): Promise<CatalogAuditRow[]> {
  const safeCollectionId = assertCatalogCollectionId(collectionId);
  const safeDocumentId = assertDocumentId(documentId);
  const snap = await db
    .collection(CATALOG_AUDIT_COLLECTION)
    .where("collectionId", "==", safeCollectionId)
    .where("documentId", "==", safeDocumentId)
    .limit(80)
    .get();

  const rows = snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      collectionId: String(data.collectionId || ""),
      documentId: String(data.documentId || ""),
      action: String(data.action || ""),
      actorUid: String(data.actorUid || ""),
      actorEmail:
        typeof data.actorEmail === "string" ? data.actorEmail : null,
      actorRole: typeof data.actorRole === "string" ? data.actorRole : null,
      before:
        data.before && typeof data.before === "object" ?
          (data.before as Record<string, unknown>) :
          null,
      after:
        data.after && typeof data.after === "object" ?
          (data.after as Record<string, unknown>) :
          null,
      createdAt: isoNow(
        data.createdAt instanceof Timestamp ?
          data.createdAt.toDate() :
          data.createdAt,
      ),
    };
  });

  return rows.sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  ).slice(0, 50);
}

export async function requireCatalogDocument(
  collectionId: string,
  documentId: string,
): Promise<CatalogDocumentRow> {
  return getCatalogCollectionDocument(collectionId, documentId);
}

export type { AdminCatalogCollectionId };
