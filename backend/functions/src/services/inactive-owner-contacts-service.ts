import { FieldPath } from "firebase-admin/firestore";
import { db, FieldValue } from "../config/firebase-admin";

const COLLECTION = "inactive_owner_contacts";
const FIRESTORE_IN_LIMIT = 30;

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
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

/** Map of businessId → last contacted ISO timestamp. */
export async function getInactiveOwnerContactedAt(
  businessIds: string[],
): Promise<Map<string, string>> {
  const contactedAt = new Map<string, string>();
  if (businessIds.length === 0) return contactedAt;

  for (let index = 0; index < businessIds.length; index += FIRESTORE_IN_LIMIT) {
    const chunk = businessIds.slice(index, index + FIRESTORE_IN_LIMIT);
    const snap = await db
      .collection(COLLECTION)
      .where(FieldPath.documentId(), "in", chunk)
      .get();

    for (const doc of snap.docs) {
      const iso = toIso(doc.data().contactedAt);
      if (iso) contactedAt.set(doc.id, iso);
    }
  }

  return contactedAt;
}

export function attachInactiveOwnerContactedAt<
  T extends { id: string; lastContactedAt?: string | null },
>(owners: T[], contactedAt: Map<string, string>): T[] {
  return owners.map((owner) => ({
    ...owner,
    lastContactedAt: contactedAt.get(owner.id) ?? owner.lastContactedAt ?? null,
  }));
}

export async function setInactiveOwnerContactedAt(input: {
  businessId: string;
  actorUid: string;
}): Promise<{ businessId: string; contactedAt: string }> {
  const contactedAt = new Date().toISOString();
  await db.collection(COLLECTION).doc(input.businessId).set(
    {
      contactedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: input.actorUid,
    },
    { merge: true },
  );
  return { businessId: input.businessId, contactedAt };
}
