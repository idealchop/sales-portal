import { db, FieldValue, Timestamp } from "../config/firebase-admin";

export type BusinessFirestoreDocumentRow = {
  path: string;
  collectionId: string;
  documentId: string;
  label: string;
  isRoot: boolean;
  data: Record<string, unknown>;
};

const MAX_DOCS_PER_SUBCOLLECTION = 100;

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

export async function listBusinessFirestoreDocuments(
  businessId: string,
): Promise<BusinessFirestoreDocumentRow[]> {
  const businessRef = db.collection("businesses").doc(businessId);
  const rows: BusinessFirestoreDocumentRow[] = [];

  const rootSnap = await businessRef.get();
  if (rootSnap.exists) {
    rows.push({
      path: rootSnap.ref.path,
      collectionId: "businesses",
      documentId: businessId,
      label: "ROOT",
      isRoot: true,
      data: serializeDocumentData(rootSnap.data()),
    });
  }

  const subcollections = await businessRef.listCollections();
  for (const subcollection of subcollections) {
    const snap = await subcollection.limit(MAX_DOCS_PER_SUBCOLLECTION).get();
    for (const doc of snap.docs) {
      rows.push({
        path: doc.ref.path,
        collectionId: subcollection.id,
        documentId: doc.id,
        label: doc.id.toUpperCase(),
        isRoot: false,
        data: serializeDocumentData(doc.data()),
      });
    }
  }

  rows.sort((a, b) => {
    if (a.isRoot !== b.isRoot) return a.isRoot ? -1 : 1;
    const collectionCmp = a.collectionId.localeCompare(b.collectionId);
    if (collectionCmp !== 0) return collectionCmp;
    return a.documentId.localeCompare(b.documentId);
  });

  return rows;
}

function timestampMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const seconds = Number((value as { _seconds?: number })._seconds);
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  }
  return 0;
}

export async function listCustomerTransactions(
  businessId: string,
  customerId: string,
): Promise<BusinessFirestoreDocumentRow[]> {
  const customerRef = db
    .collection("businesses")
    .doc(businessId)
    .collection("customers")
    .doc(customerId);
  const customerSnap = await customerRef.get();
  if (!customerSnap.exists) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const snap = await db
    .collection("businesses")
    .doc(businessId)
    .collection("transactions")
    .where("customerId", "==", customerId)
    .get();

  const rows = snap.docs.map((doc) => ({
    path: doc.ref.path,
    collectionId: "transactions",
    documentId: doc.id,
    label: doc.id.toUpperCase(),
    isRoot: false,
    data: serializeDocumentData(doc.data()),
  }));

  rows.sort(
    (a, b) =>
      timestampMs(b.data.createdAt) - timestampMs(a.data.createdAt),
  );

  return rows;
}

export async function listBusinessTransactions(
  businessId: string,
  types: string[],
): Promise<BusinessFirestoreDocumentRow[]> {
  if (types.length === 0) return [];

  const snap = await db
    .collection("businesses")
    .doc(businessId)
    .collection("transactions")
    .where("type", "in", types.slice(0, 10))
    .get();

  const rows = snap.docs.map((doc) => ({
    path: doc.ref.path,
    collectionId: "transactions",
    documentId: doc.id,
    label: doc.id.toUpperCase(),
    isRoot: false,
    data: serializeDocumentData(doc.data()),
  }));

  rows.sort(
    (a, b) =>
      timestampMs(b.data.createdAt) - timestampMs(a.data.createdAt),
  );

  return rows;
}

export async function listCustomerInventoryAssignments(
  businessId: string,
  customerId: string,
): Promise<BusinessFirestoreDocumentRow[]> {
  const customerRef = db
    .collection("businesses")
    .doc(businessId)
    .collection("customers")
    .doc(customerId);
  const customerSnap = await customerRef.get();
  if (!customerSnap.exists) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const snap = await db
    .collection("businesses")
    .doc(businessId)
    .collection("inventory_assignments")
    .where("customerId", "==", customerId)
    .get();

  const rows = snap.docs.map((doc) => ({
    path: doc.ref.path,
    collectionId: "inventory_assignments",
    documentId: doc.id,
    label: doc.id.toUpperCase(),
    isRoot: false,
    data: serializeDocumentData(doc.data()),
  }));

  rows.sort(
    (a, b) =>
      timestampMs(b.data.createdAt ?? b.data.date) -
      timestampMs(a.data.createdAt ?? a.data.date),
  );

  return rows;
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

function assertBusinessDocumentPath(businessId: string, path: string): void {
  const normalized = path.trim();
  if (!normalized.startsWith(`businesses/${businessId}`)) {
    throw new Error("INVALID_DOCUMENT_PATH");
  }
  if (normalized.includes("..")) {
    throw new Error("INVALID_DOCUMENT_PATH");
  }
}

function toDocumentRow(
  path: string,
  businessId: string,
  data: FirebaseFirestore.DocumentData | undefined,
): BusinessFirestoreDocumentRow {
  const segments = path.split("/");
  const documentId = segments[segments.length - 1] ?? path;
  const collectionId =
    segments.length >= 2 ? segments[segments.length - 2] : "businesses";

  return {
    path,
    collectionId,
    documentId,
    label: path === `businesses/${businessId}` ? "ROOT" : documentId.toUpperCase(),
    isRoot: path === `businesses/${businessId}`,
    data: serializeDocumentData(data),
  };
}

const BULK_CUSTOMER_STATUS_BATCH_SIZE = 400;

export async function bulkUpdateCustomerStatus(
  businessId: string,
  customerIds: string[],
  status: "active" | "inactive",
): Promise<BusinessFirestoreDocumentRow[]> {
  const uniqueIds = [
    ...new Set(customerIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (uniqueIds.length === 0) {
    throw new Error("NO_CUSTOMER_IDS");
  }
  if (status !== "active" && status !== "inactive") {
    throw new Error("INVALID_STATUS");
  }

  const refs = uniqueIds.map((customerId) =>
    db
      .collection("businesses")
      .doc(businessId)
      .collection("customers")
      .doc(customerId),
  );
  const snaps = await db.getAll(...refs);
  const existing = snaps.filter((snap) => snap.exists);
  if (existing.length === 0) {
    throw new Error("NO_CUSTOMERS_FOUND");
  }

  for (let index = 0; index < existing.length; index += BULK_CUSTOMER_STATUS_BATCH_SIZE) {
    const chunk = existing.slice(index, index + BULK_CUSTOMER_STATUS_BATCH_SIZE);
    const batch = db.batch();
    for (const snap of chunk) {
      batch.update(snap.ref, {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  const updatedSnaps = await db.getAll(...existing.map((snap) => snap.ref));
  return updatedSnaps
    .filter((snap) => snap.exists)
    .map((snap) => toDocumentRow(snap.ref.path, businessId, snap.data()));
}

export async function updateBusinessFirestoreDocument(
  businessId: string,
  path: string,
  data: Record<string, unknown>,
): Promise<BusinessFirestoreDocumentRow> {
  assertBusinessDocumentPath(businessId, path);

  const docRef = db.doc(path);
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
  return toDocumentRow(path, businessId, updated.data());
}

export async function deleteBusinessFirestoreDocument(
  businessId: string,
  path: string,
): Promise<void> {
  assertBusinessDocumentPath(businessId, path);

  if (path === `businesses/${businessId}`) {
    throw new Error("CANNOT_DELETE_ROOT_BUSINESS_DOC");
  }

  const docRef = db.doc(path);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }

  await docRef.delete();
}

export async function deleteBusinessFirestoreTree(
  businessId: string,
): Promise<{ deletedPaths: string[] }> {
  const businessRef = db.collection("businesses").doc(businessId);
  const deletedPaths: string[] = [];

  const subcollections = await businessRef.listCollections();
  for (const subcollection of subcollections) {
    const snap = await subcollection.get();
    if (snap.empty) continue;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      deletedPaths.push(doc.ref.path);
    }
    await batch.commit();
  }

  const rootSnap = await businessRef.get();
  if (rootSnap.exists) {
    await businessRef.delete();
    deletedPaths.push(businessRef.path);
  }

  if (deletedPaths.length === 0) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  return { deletedPaths };
}
