import { auth, db, FieldValue } from "../config/firebase-admin";

export const SALES_PORTAL_APP_ID = "sales-portal";

export type SalesPortalRole = "sales" | "admin" | "manager";
export type SelfSelectableRole = "sales" | "manager";

export type AppAccessEntry = {
  appId?: string;
  role?: string;
  accessRevoked?: boolean;
  onboardingComplete?: boolean;
};

export type RiverUserProfile = {
  displayName?: string;
  phone?: string;
  birthday?: string;
  photoURL?: string | null;
  email?: string;
};

const VALID_ROLES: SalesPortalRole[] = ["sales", "admin", "manager"];
const SELF_SELECTABLE_ROLES: SelfSelectableRole[] = ["sales", "manager"];

export function isValidSalesPortalRole(
  role: unknown,
): role is SalesPortalRole {
  return typeof role === "string" && VALID_ROLES.includes(role as SalesPortalRole);
}

export function isSelfSelectableRole(
  role: unknown,
): role is SelfSelectableRole {
  return (
    typeof role === "string" &&
    SELF_SELECTABLE_ROLES.includes(role as SelfSelectableRole)
  );
}

export function hasOtherAppAccess(appAccess: unknown): boolean {
  if (!Array.isArray(appAccess)) return false;

  return appAccess.some((row) => {
    if (!row || typeof row !== "object") return false;
    const entry = row as AppAccessEntry;
    const appId = String(entry.appId || "").trim();
    if (!appId || appId === SALES_PORTAL_APP_ID) return false;
    if (entry.accessRevoked === true) return false;
    return true;
  });
}

export function requiresPasswordChange(appAccess: unknown): boolean {
  return !hasOtherAppAccess(appAccess);
}

export function getSalesPortalAccess(
  appAccess: unknown,
): AppAccessEntry | null {
  if (!Array.isArray(appAccess)) return null;

  const entry = appAccess.find(
    (row) =>
      row && String((row as AppAccessEntry).appId) === SALES_PORTAL_APP_ID,
  ) as AppAccessEntry | undefined;

  if (!entry || entry.accessRevoked === true) return null;
  return entry;
}

export function extractRiverUserProfile(
  userData: Record<string, unknown> | undefined,
): RiverUserProfile {
  if (!userData) return {};

  const displayName =
    (typeof userData.displayName === "string" && userData.displayName) ||
    (typeof userData.fullName === "string" && userData.fullName) ||
    undefined;

  return {
    displayName,
    phone: typeof userData.phone === "string" ? userData.phone : undefined,
    birthday:
      typeof userData.birthday === "string" ? userData.birthday : undefined,
    photoURL:
      typeof userData.photoURL === "string" ?
        userData.photoURL :
        userData.photoURL === null ?
          null :
          typeof userData.avatarUrl === "string" ?
            userData.avatarUrl :
            undefined,
    email: typeof userData.email === "string" ? userData.email : undefined,
  };
}

export function mergeSalesPortalOnboardingComplete(
  existing: unknown,
  role?: SalesPortalRole,
): Record<string, unknown>[] {
  const appAccess = Array.isArray(existing) ?
    [...(existing as Record<string, unknown>[])] :
    [];
  const idx = appAccess.findIndex(
    (row) => String(row?.appId || "") === SALES_PORTAL_APP_ID,
  );
  if (idx < 0) return appAccess;

  const entry = { ...appAccess[idx] };
  if (role && !entry.role) {
    entry.role = role;
  }
  entry.onboardingComplete = true;
  appAccess[idx] = entry;
  return appAccess;
}

export type SalesPortalAccessResult =
  | {
      allowed: true;
      role: SalesPortalRole | null;
      roleAssigned: boolean;
      email?: string;
      displayName?: string;
      onboardingComplete: boolean;
      requiresPasswordChange: boolean;
      userProfile: RiverUserProfile;
    }
  | { allowed: false; reason: string; code: string };

export async function validateSalesPortalAccess(
  uid: string,
): Promise<SalesPortalAccessResult> {
  const authUser = await auth.getUser(uid).catch(() => null);
  if (!authUser) {
    return {
      allowed: false,
      reason: "Authentication account not found.",
      code: "AUTH_USER_NOT_FOUND",
    };
  }

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return {
      allowed: false,
      reason: "No user profile found. Contact your administrator for Sales Portal access.",
      code: "USER_DOC_NOT_FOUND",
    };
  }

  const userData = userSnap.data() ?? {};
  const userProfile = extractRiverUserProfile(userData);
  const access = getSalesPortalAccess(userData.appAccess);
  if (!access) {
    return {
      allowed: false,
      reason: "You do not have access to the Sales Portal.",
      code: "NO_SALES_PORTAL_ACCESS",
    };
  }

  const displayName =
    userProfile.displayName || authUser.displayName || undefined;
  const email = authUser.email || userProfile.email;
  const onboardingComplete = access.onboardingComplete === true;
  const passwordChangeRequired = requiresPasswordChange(userData.appAccess);

  if (!access.role) {
    return {
      allowed: true,
      role: null,
      roleAssigned: false,
      email,
      displayName,
      onboardingComplete,
      requiresPasswordChange: passwordChangeRequired,
      userProfile: { ...userProfile, email },
    };
  }

  if (!isValidSalesPortalRole(access.role)) {
    return {
      allowed: false,
      reason: "Your Sales Portal account does not have a valid role assigned.",
      code: "INVALID_SALES_PORTAL_ROLE",
    };
  }

  return {
    allowed: true,
    role: access.role,
    roleAssigned: true,
    email,
    displayName,
    onboardingComplete,
    requiresPasswordChange: passwordChangeRequired,
    userProfile: { ...userProfile, email },
  };
}

export async function markSalesPortalOnboardingComplete(
  uid: string,
  options?: { role?: SalesPortalRole },
): Promise<void> {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new Error("USER_DOC_NOT_FOUND");
  }

  const access = getSalesPortalAccess(userSnap.data()?.appAccess);
  const roleToSet =
    options?.role && !access?.role ? options.role : undefined;

  const appAccess = mergeSalesPortalOnboardingComplete(
    userSnap.data()?.appAccess,
    roleToSet,
  );

  await userRef.update({
    appAccess,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function resolveOnboardingRole(
  uid: string,
  requestedRole?: unknown,
): Promise<
  | { ok: true; role: SalesPortalRole }
  | { ok: false; status: number; error: string }
> {
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return { ok: false, status: 404, error: "User profile not found." };
  }

  const access = getSalesPortalAccess(userSnap.data()?.appAccess);
  if (!access) {
    return { ok: false, status: 403, error: "No Sales Portal access." };
  }

  if (access.role && isValidSalesPortalRole(access.role)) {
    if (
      requestedRole &&
      String(requestedRole) !== access.role
    ) {
      return {
        ok: false,
        status: 400,
        error: "Your role is already assigned and cannot be changed.",
      };
    }
    return { ok: true, role: access.role };
  }

  if (!isSelfSelectableRole(requestedRole)) {
    return {
      ok: false,
      status: 400,
      error: "Select a sales executive or sales manager role to continue.",
    };
  }

  return { ok: true, role: requestedRole };
}
