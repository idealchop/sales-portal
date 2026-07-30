import { logger } from "firebase-functions";
import { auth, db, FieldValue } from "../config/firebase-admin";
import {
  copyFirestoreTreeRecursive,
  deleteFirestoreTreeRecursive,
  remapClonePayload,
} from "../utils/firestore-tree";

export const DEMO_CLONE_EMAIL = "demo@smartrefill.com";
/** Stable workspace id for the demo clone — wiped and rewritten on each clone. */
export const DEMO_CLONE_BUSINESS_ID = "demo_smartrefill_clone";
const DEMO_CLONE_META_PATH = "sales_portal_ops/demo_clone";
const SMARTREFILL_APP_ID = "smartrefill";

/** Skip noisy / session collections when cloning into demo. */
const SKIP_BUSINESS_SUBCOLLECTIONS = new Set<string>([
  "login_events",
  "ai_tool_runs",
  "chat_sessions",
  "team_chats",
]);

const SKIP_USER_SUBCOLLECTIONS = new Set<string>(["login_events"]);

function resolveDemoPassword(): string {
  const fromEnv = process.env.SALES_PORTAL_DEMO_ACCOUNT_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  // Known shared demo login for internal Sales Portal cloning.
  return "smartrefilldemo";
}

export type CloneToDemoResult = {
  demoUid: string;
  demoEmail: string;
  demoBusinessId: string;
  sourceBusinessId: string;
  sourceOwnerId: string;
  replacedPreviousClone: boolean;
  copiedDocCount: number;
  deletedDocCount: number;
};

async function ensureDemoAuthUser(): Promise<{
  uid: string;
  created: boolean;
}> {
  const password = resolveDemoPassword();
  try {
    const existing = await auth.getUserByEmail(DEMO_CLONE_EMAIL);
    await auth.updateUser(existing.uid, {
      password,
      emailVerified: true,
      disabled: false,
      displayName: existing.displayName || "SmartRefill Demo",
    });
    return { uid: existing.uid, created: false };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error ?
        String((error as { code?: string }).code) :
        "";
    if (code !== "auth/user-not-found") throw error;

    const created = await auth.createUser({
      email: DEMO_CLONE_EMAIL,
      password,
      emailVerified: true,
      displayName: "SmartRefill Demo",
    });
    return { uid: created.uid, created: true };
  }
}

async function wipePreviousDemoClone(demoUid: string): Promise<{
  deletedDocCount: number;
  replacedPreviousClone: boolean;
}> {
  let deletedDocCount = 0;
  let replacedPreviousClone = false;

  const metaSnap = await db.doc(DEMO_CLONE_META_PATH).get();
  const meta = metaSnap.exists ? metaSnap.data() || {} : {};
  const previousBusinessId =
    typeof meta.demoBusinessId === "string" ? meta.demoBusinessId.trim() : "";

  const businessIds = new Set<string>(
    [DEMO_CLONE_BUSINESS_ID, previousBusinessId].filter(Boolean),
  );

  for (const businessId of businessIds) {
    const ref = db.collection("businesses").doc(businessId);
    const snap = await ref.get();
    if (!snap.exists) continue;
    replacedPreviousClone = true;
    deletedDocCount += await deleteFirestoreTreeRecursive(ref);
  }

  // Clear previous demo user profile tree (keep Auth account).
  const userRef = db.collection("users").doc(demoUid);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    replacedPreviousClone = true;
    const subcollections = await userRef.listCollections();
    for (const subcollection of subcollections) {
      let cursor;
      for (;;) {
        let query = subcollection.orderBy("__name__").limit(200);
        if (cursor) query = query.startAfter(cursor);
        const snap = await query.get();
        if (snap.empty) break;
        for (const doc of snap.docs) {
          deletedDocCount += await deleteFirestoreTreeRecursive(doc.ref);
        }
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.size < 200) break;
      }
    }
    await userRef.delete();
    deletedDocCount += 1;
  }

  return { deletedDocCount, replacedPreviousClone };
}

export async function cloneBusinessToDemoAccount(input: {
  sourceBusinessId: string;
  actorUid: string;
}): Promise<CloneToDemoResult> {
  const sourceBusinessId = input.sourceBusinessId.trim();
  if (!sourceBusinessId) {
    throw new Error("SOURCE_BUSINESS_ID_REQUIRED");
  }
  if (sourceBusinessId === DEMO_CLONE_BUSINESS_ID) {
    throw new Error("CANNOT_CLONE_DEMO_INTO_ITSELF");
  }

  const sourceBusinessRef = db.collection("businesses").doc(sourceBusinessId);
  const sourceBusinessSnap = await sourceBusinessRef.get();
  if (!sourceBusinessSnap.exists) {
    throw new Error("SOURCE_BUSINESS_NOT_FOUND");
  }
  const sourceBusiness = sourceBusinessSnap.data() || {};
  const sourceOwnerId = String(sourceBusiness.ownerId || "").trim();
  if (!sourceOwnerId) {
    throw new Error("SOURCE_OWNER_MISSING");
  }

  const sourceUserRef = db.collection("users").doc(sourceOwnerId);
  const sourceUserSnap = await sourceUserRef.get();
  if (!sourceUserSnap.exists) {
    throw new Error("SOURCE_OWNER_USER_NOT_FOUND");
  }

  const { uid: demoUid } = await ensureDemoAuthUser();
  if (demoUid === sourceOwnerId) {
    throw new Error("CANNOT_CLONE_DEMO_USER_SOURCE");
  }

  const { deletedDocCount, replacedPreviousClone } =
    await wipePreviousDemoClone(demoUid);

  const idMap: Record<string, string> = {
    [sourceBusinessId]: DEMO_CLONE_BUSINESS_ID,
    [sourceOwnerId]: demoUid,
  };

  const transformData = (
    data: Record<string, unknown>,
    _path: string,
  ): Record<string, unknown> => {
    return remapClonePayload(data, idMap) as Record<string, unknown>;
  };

  let copiedDocCount = 0;

  // Copy business tree into the stable demo workspace id.
  copiedDocCount += await copyFirestoreTreeRecursive({
    sourceRef: sourceBusinessRef,
    targetRef: db.collection("businesses").doc(DEMO_CLONE_BUSINESS_ID),
    transformData,
    skipSubcollections: SKIP_BUSINESS_SUBCOLLECTIONS,
  });

  // Ensure ownerId points at demo uid even if source field was missing variants.
  await db
    .collection("businesses")
    .doc(DEMO_CLONE_BUSINESS_ID)
    .set(
      {
        ownerId: demoUid,
        clonedFromBusinessId: sourceBusinessId,
        clonedFromOwnerId: sourceOwnerId,
        clonedAt: FieldValue.serverTimestamp(),
        authAccountTag: "test",
      },
      { merge: true },
    );

  // Members: if source owner member doc exists under sourceOwnerId, ensure demoUid member exists.
  const sourceOwnerMember = await sourceBusinessRef
    .collection("members")
    .doc(sourceOwnerId)
    .get();
  if (sourceOwnerMember.exists) {
    const memberData = remapClonePayload(
      sourceOwnerMember.data() || {},
      idMap,
    ) as Record<string, unknown>;
    await db
      .collection("businesses")
      .doc(DEMO_CLONE_BUSINESS_ID)
      .collection("members")
      .doc(demoUid)
      .set({
        ...memberData,
        userId: demoUid,
        role: memberData.role || "owner",
        email: DEMO_CLONE_EMAIL,
      });
    // Remove leftover member doc that still has source owner id after blind copy.
    await db
      .collection("businesses")
      .doc(DEMO_CLONE_BUSINESS_ID)
      .collection("members")
      .doc(sourceOwnerId)
      .delete()
      .catch(() => undefined);
  }

  // Copy owner user profile onto demo uid (email/displayName forced to demo).
  const sourceUserData = sourceUserSnap.data() || {};
  const remappedUser = remapClonePayload(sourceUserData, idMap) as Record<
    string,
    unknown
  >;
  const sourceBusinessName =
    String(sourceBusiness.businessName || sourceBusiness.name || "").trim() ||
    "Demo workspace";

  const appAccessRaw = Array.isArray(remappedUser.appAccess) ?
    remappedUser.appAccess :
    [];
  const appAccess = appAccessRaw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      if (String(row.appId || "") !== SMARTREFILL_APP_ID) return row;
      return {
        ...row,
        role: "owner",
        businessId: DEMO_CLONE_BUSINESS_ID,
        onboardingComplete: true,
        accessRevoked: false,
      };
    });

  if (
    !appAccess.some(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        String((entry as { appId?: string }).appId || "") === SMARTREFILL_APP_ID,
    )
  ) {
    appAccess.push({
      appId: SMARTREFILL_APP_ID,
      role: "owner",
      businessId: DEMO_CLONE_BUSINESS_ID,
      onboardingComplete: true,
    });
  }

  await db
    .collection("users")
    .doc(demoUid)
    .set({
      ...remappedUser,
      email: DEMO_CLONE_EMAIL,
      displayName: `Demo · ${sourceBusinessName}`,
      appAccess,
      authAccountTag: "test",
      clonedFromBusinessId: sourceBusinessId,
      clonedFromOwnerId: sourceOwnerId,
      clonedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  copiedDocCount += 1;

  // Copy user subcollections (except skipped).
  const userSubs = await sourceUserRef.listCollections();
  for (const subcollection of userSubs) {
    if (SKIP_USER_SUBCOLLECTIONS.has(subcollection.id)) continue;
    let cursor;
    for (;;) {
      let query = subcollection.orderBy("__name__").limit(200);
      if (cursor) query = query.startAfter(cursor);
      const snap = await query.get();
      if (snap.empty) break;
      for (const doc of snap.docs) {
        copiedDocCount += await copyFirestoreTreeRecursive({
          sourceRef: doc.ref,
          targetRef: db
            .collection("users")
            .doc(demoUid)
            .collection(subcollection.id)
            .doc(doc.id),
          transformData,
        });
      }
      cursor = snap.docs[snap.docs.length - 1];
      if (snap.size < 200) break;
    }
  }

  await db.doc(DEMO_CLONE_META_PATH).set({
    demoEmail: DEMO_CLONE_EMAIL,
    demoUid,
    demoBusinessId: DEMO_CLONE_BUSINESS_ID,
    sourceBusinessId,
    sourceOwnerId,
    clonedAt: FieldValue.serverTimestamp(),
    clonedBy: input.actorUid,
    copiedDocCount,
    deletedDocCount,
  });

  logger.info("Cloned business to demo account", {
    sourceBusinessId,
    sourceOwnerId,
    demoUid,
    demoBusinessId: DEMO_CLONE_BUSINESS_ID,
    copiedDocCount,
    deletedDocCount,
    replacedPreviousClone,
    actorUid: input.actorUid,
  });

  return {
    demoUid,
    demoEmail: DEMO_CLONE_EMAIL,
    demoBusinessId: DEMO_CLONE_BUSINESS_ID,
    sourceBusinessId,
    sourceOwnerId,
    replacedPreviousClone,
    copiedDocCount,
    deletedDocCount,
  };
}
