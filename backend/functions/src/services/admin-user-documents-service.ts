import { db, FieldValue, Timestamp } from "../config/firebase-admin";

export type UserFirestoreDocumentRow = {
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

function assertUserDocumentPath(uid: string, path: string): void {
  const normalized = path.trim();
  if (!normalized.startsWith(`users/${uid}`)) {
    throw new Error("INVALID_DOCUMENT_PATH");
  }
  if (normalized.includes("..")) {
    throw new Error("INVALID_DOCUMENT_PATH");
  }
}

export async function listUserFirestoreDocuments(
  uid: string,
): Promise<UserFirestoreDocumentRow[]> {
  const userRef = db.collection("users").doc(uid);
  const rows: UserFirestoreDocumentRow[] = [];

  const rootSnap = await userRef.get();
  if (rootSnap.exists) {
    rows.push({
      path: rootSnap.ref.path,
      collectionId: "users",
      documentId: uid,
      label: "ROOT",
      isRoot: true,
      data: serializeDocumentData(rootSnap.data()),
    });
  }

  const subcollections = await userRef.listCollections();
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

export async function updateUserFirestoreDocument(
  uid: string,
  path: string,
  data: Record<string, unknown>,
): Promise<UserFirestoreDocumentRow> {
  assertUserDocumentPath(uid, path);

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
  const updatedData = updated.data() ?? {};

  const segments = path.split("/");
  const documentId = segments[segments.length - 1] ?? path;
  const collectionId =
    segments.length >= 2 ? segments[segments.length - 2] : "users";

  return {
    path,
    collectionId,
    documentId,
    label: path === `users/${uid}` ? "ROOT" : documentId.toUpperCase(),
    isRoot: path === `users/${uid}`,
    data: serializeDocumentData(updatedData),
  };
}

export async function deleteUserFirestoreDocument(
  uid: string,
  path: string,
): Promise<void> {
  assertUserDocumentPath(uid, path);

  if (path === `users/${uid}`) {
    throw new Error("CANNOT_DELETE_ROOT_USER_DOC");
  }

  const docRef = db.doc(path);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }

  await docRef.delete();
}

export async function deleteUserFirestoreProfile(
  uid: string,
): Promise<{ deletedPaths: string[] }> {
  const userRef = db.collection("users").doc(uid);
  const deletedPaths: string[] = [];

  const subcollections = await userRef.listCollections();
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

  const rootSnap = await userRef.get();
  if (rootSnap.exists) {
    await userRef.delete();
    deletedPaths.push(userRef.path);
  }

  if (deletedPaths.length === 0) {
    throw new Error("USER_PROFILE_NOT_FOUND");
  }

  return { deletedPaths };
}
