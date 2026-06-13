import { db, FieldValue, Timestamp } from "../config/firebase-admin";
import {
  isAdminCatalogCollectionId,
  type AdminCatalogCollectionId,
} from "../constants/catalog-collections";

export type CatalogDocumentRow = {
  path: string;
  collectionId: AdminCatalogCollectionId;
  documentId: string;
  label: string;
  isRoot: false;
  data: Record<string, unknown>;
};

function serializeValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record._seconds === "number") {
      const ms = record._seconds * 1000;
      const nanos = typeof record._nanoseconds === "number" ? record._nanoseconds : 0;
      return new Date(ms + nanos / 1_000_000).toISOString();
    }
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(record)) {
      out[key] = serializeValue(nested);
    }
    return out;
  }
  return value;
}

function serializeDocumentData(
  data: FirebaseFirestore.DocumentData | undefined,
): Record<string, unknown> {
  if (!data) return {};
  return serializeValue(data) as Record<string, unknown>;
}

function deserializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(deserializeValue);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record._seconds === "number") {
      const nanos =
        typeof record._nanoseconds === "number" ? record._nanoseconds : 0;
      return new Timestamp(record._seconds, nanos);
    }
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(record)) {
      out[key] = deserializeValue(nested);
    }
    return out;
  }
  return value;
}

function assertCatalogCollectionId(collectionId: string): AdminCatalogCollectionId {
  if (!isAdminCatalogCollectionId(collectionId)) {
    throw new Error("INVALID_COLLECTION");
  }
  return collectionId;
}

function assertDocumentId(documentId: string): string {
  const normalized = documentId.trim();
  if (!normalized) {
    throw new Error("DOCUMENT_ID_REQUIRED");
  }
  if (normalized.includes("/") || normalized.includes("..")) {
    throw new Error("INVALID_DOCUMENT_ID");
  }
  return normalized;
}

function toDocumentRow(
  collectionId: AdminCatalogCollectionId,
  documentId: string,
  data: FirebaseFirestore.DocumentData | undefined,
): CatalogDocumentRow {
  return {
    path: `${collectionId}/${documentId}`,
    collectionId,
    documentId,
    label: documentId.toUpperCase(),
    isRoot: false,
    data: serializeDocumentData(data),
  };
}

export async function listCatalogCollectionDocuments(
  collectionId: string,
): Promise<CatalogDocumentRow[]> {
  const safeCollectionId = assertCatalogCollectionId(collectionId);
  const snap = await db.collection(safeCollectionId).get();

  const rows = snap.docs.map((doc) =>
    toDocumentRow(safeCollectionId, doc.id, doc.data()),
  );

  rows.sort((a, b) => {
    const nameA = String(a.data.name || a.data.code || a.documentId);
    const nameB = String(b.data.name || b.data.code || b.documentId);
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });

  return rows;
}

export async function upsertCatalogCollectionDocument(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>,
): Promise<CatalogDocumentRow> {
  const safeCollectionId = assertCatalogCollectionId(collectionId);
  const safeDocumentId = assertDocumentId(documentId);
  const docRef = db.collection(safeCollectionId).doc(safeDocumentId);
  const payload = deserializeValue(data) as Record<string, unknown>;
  payload.updatedAt = FieldValue.serverTimestamp();

  const existing = await docRef.get();
  if (existing.exists) {
    await docRef.set(payload, { merge: false });
  } else {
    await docRef.set({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const updated = await docRef.get();
  return toDocumentRow(safeCollectionId, safeDocumentId, updated.data());
}

export async function deleteCatalogCollectionDocument(
  collectionId: string,
  documentId: string,
): Promise<void> {
  const safeCollectionId = assertCatalogCollectionId(collectionId);
  const safeDocumentId = assertDocumentId(documentId);
  const docRef = db.collection(safeCollectionId).doc(safeDocumentId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }
  await docRef.delete();
}
