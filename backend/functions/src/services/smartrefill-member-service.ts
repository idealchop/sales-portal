import { db, FieldValue } from "../config/firebase-admin";
import {
  isValidSmartRefillStaffSubRole,
  normalizeSmartRefillStaffSubRole,
  type SmartRefillStaffSubRole,
} from "../constants/smartrefill";

export type MemberStaffSubRoleLookup = Map<string, SmartRefillStaffSubRole | undefined>;

function memberLookupKey(businessId: string, userId: string): string {
  return `${businessId}:${userId}`;
}

export async function readMemberStaffSubRole(
  businessId: string,
  userId: string,
): Promise<SmartRefillStaffSubRole | undefined> {
  const snap = await db
    .collection("businesses")
    .doc(businessId)
    .collection("members")
    .doc(userId)
    .get();

  if (!snap.exists) return undefined;
  return normalizeSmartRefillStaffSubRole(snap.data()?.role);
}

export async function batchReadMemberStaffSubRoles(
  pairs: Array<{ businessId: string; userId: string }>,
): Promise<MemberStaffSubRoleLookup> {
  const uniquePairs = new Map<string, { businessId: string; userId: string }>();
  pairs.forEach(({ businessId, userId }) => {
    if (!businessId || !userId) return;
    uniquePairs.set(memberLookupKey(businessId, userId), { businessId, userId });
  });

  const lookup: MemberStaffSubRoleLookup = new Map();
  await Promise.all(
    [...uniquePairs.values()].map(async ({ businessId, userId }) => {
      const subRole = await readMemberStaffSubRole(businessId, userId);
      lookup.set(memberLookupKey(businessId, userId), subRole);
    }),
  );

  return lookup;
}

export async function syncSmartRefillMemberForStaff(input: {
  userId: string;
  businessId: string;
  staffSubRole: SmartRefillStaffSubRole;
  email?: string;
  displayName?: string;
  accessRevoked?: boolean;
}): Promise<void> {
  const memberRef = db
    .collection("businesses")
    .doc(input.businessId)
    .collection("members")
    .doc(input.userId);

  const existing = await memberRef.get();

  if (input.accessRevoked === true) {
    if (!existing.exists) return;
    await memberRef.set(
      {
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  const name =
    input.displayName?.trim() ||
    input.email?.split("@")[0]?.trim() ||
    "Team member";

  await memberRef.set(
    {
      userId: input.userId,
      ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
      name,
      displayName: name,
      role: input.staffSubRole,
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(!existing.exists ?
        {
          joinedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        } :
        {}),
    },
    { merge: true },
  );
}

export async function deactivateSmartRefillMember(
  businessId: string,
  userId: string,
): Promise<void> {
  const memberRef = db
    .collection("businesses")
    .doc(businessId)
    .collection("members")
    .doc(userId);
  const existing = await memberRef.get();
  if (!existing.exists) return;

  await memberRef.set(
    {
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export function resolveStaffSubRoleFromLookup(
  lookup: MemberStaffSubRoleLookup,
  businessId: string | undefined,
  userId: string,
  legacyAppAccessRole?: string,
): SmartRefillStaffSubRole | undefined {
  if (businessId) {
    const fromMember = lookup.get(memberLookupKey(businessId, userId));
    if (fromMember) return fromMember;
  }

  return normalizeSmartRefillStaffSubRole(legacyAppAccessRole);
}

export function assertValidStaffSubRole(
  staffSubRole: string | undefined,
): SmartRefillStaffSubRole | null {
  if (!staffSubRole) return null;
  if (!isValidSmartRefillStaffSubRole(staffSubRole)) return null;
  const normalized = normalizeSmartRefillStaffSubRole(staffSubRole);
  return normalized ?? null;
}
