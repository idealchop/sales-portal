import type { UserRecord } from "firebase-admin/auth";
import type { Timestamp } from "firebase-admin/firestore";
import { auth, db, FieldValue } from "../config/firebase-admin";
import {
  isValidSmartRefillRole,
  normalizeSmartRefillRole,
  SMARTREFILL_APP_ID,
  SMARTREFILL_ASSIGNABLE_ROLES,
} from "../constants/smartrefill";
import {
  assertValidStaffSubRole,
  batchReadMemberStaffSubRoles,
  deactivateSmartRefillMember,
  resolveStaffSubRoleFromLookup,
  syncSmartRefillMemberForStaff,
} from "./smartrefill-member-service";
import {
  isValidSalesPortalRole,
  SALES_PORTAL_APP_ID,
} from "./sales-portal-access";

export type AdminAppAccessEntry = {
  appId: string;
  role?: string;
  businessId?: string;
  /** Staff seat role from `businesses/{businessId}/members/{uid}` (API response / save input). */
  staffSubRole?: string;
  accessRevoked?: boolean;
  onboardingComplete?: boolean;
};

export type AdminUserSummary = {
  uid: string;
  email?: string;
  displayName?: string;
  appAccess: AdminAppAccessEntry[];
  /** RiverDB `users` doc created timestamp. */
  createdAt?: string | null;
  /** Firebase Auth account creation time (`metadata.creationTime`). */
  registeredAt?: string | null;
  /** Firebase Auth last sign-in time (`metadata.lastSignInTime`). */
  lastSignInAt?: string | null;
  hasRiverDbProfile: boolean;
};

function normalizeSmartRefillAccessEntry(
  entry: AdminAppAccessEntry,
): AdminAppAccessEntry {
  if (entry.appId !== SMARTREFILL_APP_ID || !entry.role) return entry;
  const normalizedRole = normalizeSmartRefillRole(entry.role);
  return normalizedRole ? { ...entry, role: normalizedRole } : entry;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as Timestamp).toDate().toISOString();
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    return new Date((value as { _seconds: number })._seconds * 1000).toISOString();
  }
  return null;
}

/** Firebase Auth metadata timestamps arrive as HTTP-date strings. */
function authMetadataToIso(value?: string | null): string | null {
  if (!value || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function authTimestampsFromUser(authUser: UserRecord): {
  registeredAt: string | null;
  lastSignInAt: string | null;
} {
  return {
    registeredAt: authMetadataToIso(authUser.metadata.creationTime),
    lastSignInAt: authMetadataToIso(authUser.metadata.lastSignInTime),
  };
}

function normalizeAppAccess(raw: unknown): AdminAppAccessEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const entry = row as Record<string, unknown>;
      return {
        appId: String(entry.appId || "").trim(),
        role: typeof entry.role === "string" ? entry.role.trim() : undefined,
        businessId:
          typeof entry.businessId === "string" ? entry.businessId.trim() : undefined,
        accessRevoked: entry.accessRevoked === true,
        onboardingComplete: entry.onboardingComplete === true,
      };
    })
    .filter((entry) => entry.appId.length > 0);
}

async function enrichUsersWithSmartRefillStaffSubRoles(
  users: AdminUserSummary[],
): Promise<AdminUserSummary[]> {
  const pairs: Array<{ businessId: string; userId: string }> = [];

  users.forEach((user) => {
    user.appAccess.forEach((entry) => {
      if (
        entry.appId !== SMARTREFILL_APP_ID ||
        normalizeSmartRefillRole(entry.role) !== "staff" ||
        !entry.businessId
      ) {
        return;
      }
      pairs.push({ businessId: entry.businessId, userId: user.uid });
    });
  });

  if (pairs.length === 0) return users;

  const lookup = await batchReadMemberStaffSubRoles(pairs);

  return users.map((user) => ({
    ...user,
    appAccess: user.appAccess.map((entry) => {
      if (
        entry.appId !== SMARTREFILL_APP_ID ||
        normalizeSmartRefillRole(entry.role) !== "staff" ||
        !entry.businessId
      ) {
        return entry;
      }

      const staffSubRole = resolveStaffSubRoleFromLookup(
        lookup,
        entry.businessId,
        user.uid,
        entry.role,
      );

      return {
        ...entry,
        role: "staff",
        ...(staffSubRole ? { staffSubRole } : {}),
      };
    }),
  }));
}

export function validateAppAccessEntry(entry: AdminAppAccessEntry): string | null {
  if (!entry.appId) return "App is required.";

  if (entry.appId === SALES_PORTAL_APP_ID) {
    if (entry.role && !isValidSalesPortalRole(entry.role)) {
      return `Invalid Sales Portal role: ${entry.role}`;
    }
    return null;
  }

  if (entry.appId === SMARTREFILL_APP_ID) {
    if (entry.role && !isValidSmartRefillRole(entry.role)) {
      return `Invalid SmartRefill role: ${entry.role}`;
    }
    return null;
  }

  if (entry.role && entry.role.trim().length === 0) {
    return "Role cannot be empty when provided.";
  }

  return null;
}

async function listAllAuthUsers(maxUsers: number): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;

  while (users.length < maxUsers) {
    const batchSize = Math.min(1000, maxUsers - users.length);
    const result = await auth.listUsers(batchSize, pageToken);
    users.push(...result.users);
    if (!result.pageToken) break;
    pageToken = result.pageToken;
  }

  return users;
}

function firestoreDisplayName(data: FirebaseFirestore.DocumentData): string | undefined {
  if (typeof data.displayName === "string" && data.displayName.trim()) {
    return data.displayName.trim();
  }
  if (typeof data.fullName === "string" && data.fullName.trim()) {
    return data.fullName.trim();
  }
  return undefined;
}

function buildUserSummaryFromAuth(
  authUser: UserRecord,
  firestoreData?: FirebaseFirestore.DocumentData,
): AdminUserSummary {
  const hasRiverDbProfile = !!firestoreData;

  return {
    uid: authUser.uid,
    email:
      (typeof firestoreData?.email === "string" ? firestoreData.email : undefined) ||
      authUser.email ||
      undefined,
    displayName:
      (firestoreData ? firestoreDisplayName(firestoreData) : undefined) ||
      authUser.displayName ||
      undefined,
    appAccess: hasRiverDbProfile ? normalizeAppAccess(firestoreData?.appAccess) : [],
    createdAt: hasRiverDbProfile ? toIso(firestoreData?.createdAt) : null,
    ...authTimestampsFromUser(authUser),
    hasRiverDbProfile,
  };
}

async function buildUserSummaryFromFirestoreOnly(
  uid: string,
  data: FirebaseFirestore.DocumentData,
): Promise<AdminUserSummary> {
  const authUser = await auth.getUser(uid).catch(() => null);

  return {
    uid,
    email:
      (typeof data.email === "string" ? data.email : undefined) ||
      authUser?.email ||
      undefined,
    displayName: firestoreDisplayName(data) || authUser?.displayName || undefined,
    appAccess: normalizeAppAccess(data.appAccess),
    createdAt: toIso(data.createdAt),
    ...(authUser ?
      authTimestampsFromUser(authUser) :
      { registeredAt: null, lastSignInAt: null }),
    hasRiverDbProfile: true,
  };
}

export async function listAdminUsers(maxUsers = 2000): Promise<AdminUserSummary[]> {
  const [authUsers, firestoreSnap] = await Promise.all([
    listAllAuthUsers(maxUsers),
    db.collection("users").get(),
  ]);

  const firestoreByUid = new Map(
    firestoreSnap.docs.map((doc) => [doc.id, doc.data()]),
  );
  const seenUids = new Set<string>();
  const merged: AdminUserSummary[] = [];

  for (const authUser of authUsers) {
    seenUids.add(authUser.uid);
    merged.push(buildUserSummaryFromAuth(authUser, firestoreByUid.get(authUser.uid)));
  }

  for (const doc of firestoreSnap.docs) {
    if (seenUids.has(doc.id)) continue;
    merged.push(await buildUserSummaryFromFirestoreOnly(doc.id, doc.data()));
  }

  return enrichUsersWithSmartRefillStaffSubRoles(
    merged.sort((a, b) => userSortKey(a).localeCompare(userSortKey(b))),
  );
}

function userSortKey(user: AdminUserSummary): string {
  return (
    user.displayName?.toLowerCase() ||
    user.email?.toLowerCase() ||
    user.uid
  );
}

async function enrichUserSummary(user: AdminUserSummary): Promise<AdminUserSummary> {
  const authUser = await auth.getUser(user.uid).catch(() => null);

  if (authUser) {
    const authTimes = authTimestampsFromUser(authUser);
    return {
      ...user,
      email: user.email || authUser.email || undefined,
      displayName: user.displayName || authUser.displayName || undefined,
      registeredAt: authTimes.registeredAt,
      lastSignInAt: authTimes.lastSignInAt,
    };
  }

  return {
    ...user,
    registeredAt: authMetadataToIso(user.registeredAt),
    lastSignInAt: authMetadataToIso(user.lastSignInAt),
  };
}

export async function createAdminUser(input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<AdminUserSummary> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!email || !displayName) {
    throw new Error("EMAIL_AND_NAME_REQUIRED");
  }
  if (input.password.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const authUser = await auth.createUser({
    email,
    password: input.password,
    displayName,
    emailVerified: false,
  });

  const userRef = db.collection("users").doc(authUser.uid);
  await userRef.set({
    email,
    displayName,
    appAccess: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    uid: authUser.uid,
    email,
    displayName,
    appAccess: [],
    createdAt: null,
    ...authTimestampsFromUser(authUser),
    hasRiverDbProfile: true,
  };
}

export async function updateAdminUserAppAccess(
  uid: string,
  appAccessInput: AdminAppAccessEntry[],
): Promise<AdminUserSummary> {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const existingData = userSnap.exists ? userSnap.data() ?? {} : {};
  const userEmail =
    typeof existingData.email === "string" ? existingData.email : undefined;
  const userDisplayName =
    firestoreDisplayName(existingData) ||
    (typeof existingData.displayName === "string" ?
      existingData.displayName :
      undefined);

  const previousSmartRefill = normalizeAppAccess(existingData.appAccess).find(
    (entry) => entry.appId === SMARTREFILL_APP_ID,
  );

  for (const entry of appAccessInput) {
    if (entry.appId !== SMARTREFILL_APP_ID) continue;
    const role = normalizeSmartRefillRole(entry.role);
    if (role !== "staff" || entry.accessRevoked === true) continue;
    if (!entry.businessId?.trim()) {
      throw new Error(
        "SmartRefill staff access requires a workspace ID (businessId).",
      );
    }
    if (!assertValidStaffSubRole(entry.staffSubRole)) {
      throw new Error(
        "SmartRefill staff access requires a sub-role (admin or rider).",
      );
    }
  }

  const appAccess = appAccessInput.map((entry) => {
    const base = {
      appId: entry.appId.trim(),
      ...(entry.role ? { role: entry.role.trim() } : {}),
      ...(entry.businessId ? { businessId: entry.businessId.trim() } : {}),
      ...(entry.accessRevoked === true ? { accessRevoked: true } : {}),
      ...(entry.onboardingComplete === true ? { onboardingComplete: true } : {}),
    };
    return normalizeSmartRefillAccessEntry(base);
  });

  for (const entry of appAccess) {
    const error = validateAppAccessEntry(entry);
    if (error) throw new Error(error);
  }

  const deduped = new Map<string, AdminAppAccessEntry>();
  appAccess.forEach((entry) => {
    deduped.set(entry.appId, entry);
  });

  const normalized = [...deduped.values()];
  const smartRefillInput = appAccessInput.find(
    (entry) => entry.appId === SMARTREFILL_APP_ID,
  );
  const smartRefillSaved = normalized.find(
    (entry) => entry.appId === SMARTREFILL_APP_ID,
  );

  if (!userSnap.exists) {
    const authUser = await auth.getUser(uid).catch(() => null);
    if (!authUser) {
      throw new Error("USER_NOT_FOUND");
    }

    await userRef.set({
      email: authUser.email ?? "",
      displayName: authUser.displayName ?? "",
      appAccess: normalized,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await userRef.update({
      appAccess: normalized,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  if (smartRefillSaved) {
    const savedRole = normalizeSmartRefillRole(smartRefillSaved.role);
    const staffSubRole = assertValidStaffSubRole(smartRefillInput?.staffSubRole);

    if (
      savedRole === "staff" &&
      smartRefillSaved.businessId &&
      staffSubRole
    ) {
      await syncSmartRefillMemberForStaff({
        userId: uid,
        businessId: smartRefillSaved.businessId,
        staffSubRole,
        email: userEmail,
        displayName: userDisplayName,
        accessRevoked: smartRefillSaved.accessRevoked,
      });

      if (
        previousSmartRefill?.businessId &&
        previousSmartRefill.businessId !== smartRefillSaved.businessId
      ) {
        await deactivateSmartRefillMember(previousSmartRefill.businessId, uid);
      }
    } else if (
      previousSmartRefill?.businessId &&
      savedRole !== "staff"
    ) {
      await deactivateSmartRefillMember(previousSmartRefill.businessId, uid);
    } else if (
      previousSmartRefill?.businessId &&
      smartRefillSaved.accessRevoked === true
    ) {
      await deactivateSmartRefillMember(previousSmartRefill.businessId, uid);
    }
  } else if (previousSmartRefill?.businessId) {
    await deactivateSmartRefillMember(previousSmartRefill.businessId, uid);
  }

  const data = (await userRef.get()).data() ?? {};
  const summary = await enrichUserSummary({
    uid,
    email: typeof data.email === "string" ? data.email : undefined,
    displayName:
      typeof data.displayName === "string" ? data.displayName :
        typeof data.fullName === "string" ? data.fullName :
          undefined,
    appAccess: normalizeAppAccess(normalized),
    createdAt: toIso(data.createdAt),
    hasRiverDbProfile: true,
  });

  const [enriched] = await enrichUsersWithSmartRefillStaffSubRoles([summary]);
  return enriched;
}

export type DeleteAdminUserResult = {
  uid: string;
  deletedAuth: boolean;
  deletedProfile: boolean;
};

export async function deleteAdminUser(
  uid: string,
  actorUid: string,
): Promise<DeleteAdminUserResult> {
  if (uid === actorUid) {
    throw new Error("CANNOT_DELETE_SELF");
  }

  let deletedAuth = false;
  let deletedProfile = false;

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    await userRef.delete();
    deletedProfile = true;
  }

  try {
    await auth.deleteUser(uid);
    deletedAuth = true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error ?
        String((error as { code?: string }).code || "") :
        "";
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }

  if (!deletedAuth && !deletedProfile) {
    throw new Error("USER_NOT_FOUND");
  }

  return { uid, deletedAuth, deletedProfile };
}

export async function deleteAdminUsers(
  uids: string[],
  actorUid: string,
): Promise<{
  deleted: DeleteAdminUserResult[];
  failed: { uid: string; reason: string }[];
}> {
  const unique = [...new Set(uids.map((uid) => uid.trim()).filter(Boolean))];
  const deleted: DeleteAdminUserResult[] = [];
  const failed: { uid: string; reason: string }[] = [];

  for (const uid of unique) {
    try {
      deleted.push(await deleteAdminUser(uid, actorUid));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push({ uid, reason: message });
    }
  }

  return { deleted, failed };
}

export const ADMIN_KNOWN_APPS = [
  {
    appId: SALES_PORTAL_APP_ID,
    label: "Sales Portal",
    roles: ["admin", "manager", "sales"],
  },
  {
    appId: SMARTREFILL_APP_ID,
    label: "SmartRefill",
    roles: [...SMARTREFILL_ASSIGNABLE_ROLES],
  },
] as const;
