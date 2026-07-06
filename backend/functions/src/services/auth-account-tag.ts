import type { UserRecord } from "firebase-admin/auth";
import { auth } from "../config/firebase-admin";

export const AUTH_ACCOUNT_TAG_TEST = "test" as const;
export type AuthAccountTag = typeof AUTH_ACCOUNT_TAG_TEST;

export function isTestAuthAccountTag(
  tag: unknown,
): tag is AuthAccountTag {
  return tag === AUTH_ACCOUNT_TAG_TEST;
}

export function readAuthAccountTag(
  authUser?: UserRecord | null,
  firestoreData?: FirebaseFirestore.DocumentData,
): AuthAccountTag | null {
  if (authUser?.customClaims?.authAccountTag === AUTH_ACCOUNT_TAG_TEST) {
    return AUTH_ACCOUNT_TAG_TEST;
  }
  if (firestoreData?.authAccountTag === AUTH_ACCOUNT_TAG_TEST) {
    return AUTH_ACCOUNT_TAG_TEST;
  }
  return null;
}

export function readFirestoreAuthAccountTag(
  firestoreData?: Record<string, unknown> | FirebaseFirestore.DocumentData,
): AuthAccountTag | null {
  return readAuthAccountTag(null, firestoreData);
}

export function collectTestAccountOwnerIds(
  userDocs: Array<{ id: string; data: Record<string, unknown> }>,
): Set<string> {
  const ids = new Set<string>();
  for (const doc of userDocs) {
    if (readFirestoreAuthAccountTag(doc.data) === AUTH_ACCOUNT_TAG_TEST) {
      ids.add(doc.id);
    }
  }
  return ids;
}

export function isTestAccountOwnerId(
  ownerId: string | undefined,
  testAccountOwnerIds: ReadonlySet<string>,
): boolean {
  return Boolean(ownerId && testAccountOwnerIds.has(ownerId));
}

export function normalizeAuthAccountTagInput(
  value: unknown,
): AuthAccountTag | null | undefined {
  if (value === AUTH_ACCOUNT_TAG_TEST) return AUTH_ACCOUNT_TAG_TEST;
  if (value === null) return null;
  return undefined;
}

export async function syncAuthAccountTag(
  uid: string,
  tag: AuthAccountTag | null,
): Promise<void> {
  const authUser = await auth.getUser(uid);
  const claims = { ...(authUser.customClaims ?? {}) };

  if (tag === AUTH_ACCOUNT_TAG_TEST) {
    claims.authAccountTag = AUTH_ACCOUNT_TAG_TEST;
  } else {
    delete claims.authAccountTag;
  }

  await auth.setCustomUserClaims(uid, claims);
}
