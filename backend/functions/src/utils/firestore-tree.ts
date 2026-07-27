import type {
  DocumentReference,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "../config/firebase-admin";
import { mapWithConcurrency } from "../utils/map-with-concurrency";

const BATCH_LIMIT = 200;
const CONCURRENCY = 8;

/** Recursively delete all nested subcollections under a document, then the doc itself. */
export async function deleteFirestoreTreeRecursive(
  ref: DocumentReference,
): Promise<number> {
  let deleted = 0;
  const subcollections = await ref.listCollections();
  for (const subcollection of subcollections) {
    let cursor: QueryDocumentSnapshot | undefined;
    for (;;) {
      let query = subcollection.orderBy("__name__").limit(BATCH_LIMIT);
      if (cursor) query = query.startAfter(cursor);
      const snap = await query.get();
      if (snap.empty) break;

      await mapWithConcurrency(snap.docs, CONCURRENCY, async (doc) => {
        deleted += await deleteFirestoreTreeRecursive(doc.ref);
      });

      cursor = snap.docs[snap.docs.length - 1];
      if (snap.size < BATCH_LIMIT) break;
    }
  }

  const snap = await ref.get();
  if (snap.exists) {
    await ref.delete();
    deleted += 1;
  }
  return deleted;
}

/** Recursively copy a document and all nested subcollections. */
export async function copyFirestoreTreeRecursive(input: {
  sourceRef: DocumentReference;
  targetRef: DocumentReference;
  transformData?: (
    data: FirebaseFirestore.DocumentData,
    path: string,
  ) => FirebaseFirestore.DocumentData;
  skipSubcollections?: Set<string>;
}): Promise<number> {
  const { sourceRef, targetRef, transformData, skipSubcollections } = input;
  const sourceSnap = await sourceRef.get();
  if (!sourceSnap.exists) {
    throw new Error(`SOURCE_NOT_FOUND:${sourceRef.path}`);
  }

  let copied = 0;
  const raw = sourceSnap.data() || {};
  const data = transformData ? transformData(raw, sourceRef.path) : raw;
  await targetRef.set(data);
  copied += 1;

  const subcollections = await sourceRef.listCollections();
  for (const subcollection of subcollections) {
    if (skipSubcollections?.has(subcollection.id)) continue;

    let cursor: QueryDocumentSnapshot | undefined;
    for (;;) {
      let query = subcollection.orderBy("__name__").limit(BATCH_LIMIT);
      if (cursor) query = query.startAfter(cursor);
      const snap = await query.get();
      if (snap.empty) break;

      await mapWithConcurrency(snap.docs, CONCURRENCY, async (doc) => {
        // Preserve document ids under the target tree (except caller remaps members separately).
        const childTarget = targetRef.collection(subcollection.id).doc(doc.id);
        copied += await copyFirestoreTreeRecursive({
          sourceRef: doc.ref,
          targetRef: childTarget,
          transformData,
          skipSubcollections,
        });
      });

      cursor = snap.docs[snap.docs.length - 1];
      if (snap.size < BATCH_LIMIT) break;
    }
  }

  return copied;
}

/** Deep-replace string values that exactly match id remaps. */
export function remapClonePayload(
  value: unknown,
  idMap: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    return idMap[value] ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => remapClonePayload(entry, idMap));
  }
  if (value && typeof value === "object") {
    // Preserve Firestore Timestamp / GeoPoint / DocumentReference as-is.
    const ctor = (value as { constructor?: { name?: string } }).constructor
      ?.name;
    if (
      ctor === "Timestamp" ||
      ctor === "GeoPoint" ||
      ctor === "DocumentReference" ||
      ctor === "FieldValue"
    ) {
      return value;
    }
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      out[key] = remapClonePayload(entry, idMap);
    }
    return out;
  }
  return value;
}

export async function ensureDocDeleted(path: string): Promise<void> {
  const ref = db.doc(path);
  const snap = await ref.get();
  if (snap.exists) {
    await deleteFirestoreTreeRecursive(ref);
  }
}
