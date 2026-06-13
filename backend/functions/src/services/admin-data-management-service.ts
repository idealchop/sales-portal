import { auth, db } from "../config/firebase-admin";
import {
  normalizeSmartRefillRole,
  SMARTREFILL_APP_ID,
} from "../constants/smartrefill";
import {
  buildMemberCountsByBusiness,
  listStaffMemberCandidates,
  loadActiveSubscriptionsByBusiness,
  loadAddonCatalogForDataManagement,
  type DataManagementActiveSubscription,
  type DataManagementMemberBreakdown,
} from "./data-management-enrichment";

export type DataManagementLinkStatus = "linked" | "no_business" | "no_user";

export type DataManagementStaffRole = "admin" | "rider";

export type DataManagementLinkRow = {
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  userPhotoURL?: string;
  businessId?: string;
  businessName?: string;
  ownerId?: string;
  ownerDisplayName?: string;
  memberBreakdown?: DataManagementMemberBreakdown;
  activeSubscription?: DataManagementActiveSubscription;
  status: DataManagementLinkStatus;
  staffRole?: DataManagementStaffRole;
};

export type DataManagementOverview = {
  owners: DataManagementLinkRow[];
  staff: DataManagementLinkRow[];
};

type BusinessRecord = {
  id: string;
  name: string;
  ownerId?: string;
};

type UserRecord = {
  id: string;
  data: FirebaseFirestore.DocumentData;
};

function hasSmartRefillAccess(appAccess: unknown): boolean {
  if (!Array.isArray(appAccess)) return false;
  return appAccess.some((row) => {
    if (!row || typeof row !== "object") return false;
    const entry = row as { appId?: string; accessRevoked?: boolean };
    return (
      String(entry.appId || "") === SMARTREFILL_APP_ID &&
      entry.accessRevoked !== true
    );
  });
}

function getSmartRefillBusinessId(userData: Record<string, unknown>): string | undefined {
  if (!Array.isArray(userData.appAccess)) return undefined;

  const entry = userData.appAccess.find((row) => {
    if (!row || typeof row !== "object") return false;
    const item = row as { appId?: string; accessRevoked?: boolean };
    return (
      String(item.appId || "") === SMARTREFILL_APP_ID &&
      item.accessRevoked !== true
    );
  });

  if (!entry || typeof entry !== "object") return undefined;
  const businessId = (entry as { businessId?: string }).businessId;
  return typeof businessId === "string" && businessId.trim() ?
    businessId.trim() :
    undefined;
}

function resolveSmartRefillAccessRole(
  uid: string,
  userData: Record<string, unknown>,
  businessOwnerIds: Set<string>,
): "owner" | "staff" | null {
  if (!Array.isArray(userData.appAccess)) {
    return businessOwnerIds.has(uid) ? "owner" : null;
  }

  const entry = userData.appAccess.find((row) => {
    if (!row || typeof row !== "object") return false;
    const item = row as { appId?: string; accessRevoked?: boolean };
    return (
      String(item.appId || "") === SMARTREFILL_APP_ID &&
      item.accessRevoked !== true
    );
  });

  const accessRole =
    entry && typeof entry === "object" && typeof (entry as { role?: string }).role === "string" ?
      normalizeSmartRefillRole((entry as { role: string }).role) :
      null;

  if (accessRole === "owner") return "owner";
  if (accessRole === "staff") return "staff";
  if (businessOwnerIds.has(uid)) return "owner";
  return null;
}

function userDisplayName(data: Record<string, unknown>): string | undefined {
  if (typeof data.displayName === "string" && data.displayName.trim()) {
    return data.displayName.trim();
  }
  if (typeof data.fullName === "string" && data.fullName.trim()) {
    return data.fullName.trim();
  }
  return undefined;
}

function userPhotoURL(
  ...sources: Array<Record<string, unknown> | undefined>
): string | undefined {
  for (const source of sources) {
    if (!source) continue;
    for (const key of ["photoURL", "avatarUrl", "avatarURL"] as const) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  return undefined;
}

function resolveBusinessForOwner(
  userId: string,
  userData: Record<string, unknown>,
  businesses: BusinessRecord[],
  businessById: Map<string, BusinessRecord>,
): BusinessRecord | undefined {
  const fromAccess = getSmartRefillBusinessId(userData);
  if (fromAccess) {
    return businessById.get(fromAccess);
  }

  return businesses.find((business) => business.ownerId === userId);
}

function sortRows(rows: DataManagementLinkRow[]): DataManagementLinkRow[] {
  return [...rows].sort((a, b) => {
    const statusOrder: Record<DataManagementLinkStatus, number> = {
      linked: 0,
      no_business: 1,
      no_user: 2,
    };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    const nameA =
      a.userDisplayName || a.userEmail || a.businessName || a.userId || "";
    const nameB =
      b.userDisplayName || b.userEmail || b.businessName || b.userId || "";
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
}

async function enrichRowsFromAuth(rows: DataManagementLinkRow[]): Promise<void> {
  const needsAuth = rows.filter(
    (row) =>
      row.userId &&
      (!row.userEmail || !row.userDisplayName || !row.userPhotoURL),
  );
  if (needsAuth.length === 0) return;

  await Promise.all(
    needsAuth.map(async (row) => {
      const userId = row.userId;
      if (!userId) return;
      const authUser = await auth.getUser(userId).catch(() => null);
      if (!authUser) return;
      row.userEmail = row.userEmail || authUser.email || undefined;
      row.userDisplayName =
        row.userDisplayName || authUser.displayName || undefined;
      row.userPhotoURL = row.userPhotoURL || authUser.photoURL || undefined;
    }),
  );
}

async function loadOwnerDisplayNames(
  ownerIds: string[],
  usersById: Map<string, UserRecord>,
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  const names = new Map<string, string>();

  await Promise.all(
    uniqueIds.map(async (ownerId) => {
      const userRecord = usersById.get(ownerId);
      const fromProfile =
        userRecord ? userDisplayName(userRecord.data) : undefined;
      const fromEmail =
        userRecord && typeof userRecord.data.email === "string" ?
          userRecord.data.email :
          undefined;

      if (fromProfile) {
        names.set(ownerId, fromProfile);
        return;
      }

      const authUser = await auth.getUser(ownerId).catch(() => null);
      names.set(
        ownerId,
        authUser?.displayName || fromEmail || authUser?.email || ownerId,
      );
    }),
  );

  return names;
}

function attachBusinessContext(
  rows: DataManagementLinkRow[],
  businessById: Map<string, BusinessRecord>,
  ownerNamesById: Map<string, string>,
  memberCountsByBusiness: Map<string, DataManagementMemberBreakdown>,
  subscriptionsByBusiness: Map<string, DataManagementActiveSubscription>,
): void {
  for (const row of rows) {
    if (!row.businessId) continue;

    const business = businessById.get(row.businessId);
    if (!business) continue;

    if (business.ownerId) {
      row.ownerId = business.ownerId;
      row.ownerDisplayName = ownerNamesById.get(business.ownerId);
    }

    row.memberBreakdown = memberCountsByBusiness.get(row.businessId);
    row.activeSubscription = subscriptionsByBusiness.get(row.businessId);
  }
}

function buildStaffMemberRows(
  candidates: ReturnType<typeof listStaffMemberCandidates>,
  businessById: Map<string, BusinessRecord>,
  usersById: Map<string, UserRecord>,
): DataManagementLinkRow[] {
  const rows: DataManagementLinkRow[] = [];

  for (const candidate of candidates) {
    const business = businessById.get(candidate.businessId);
    if (!business) continue;

    const userRecord = usersById.get(candidate.memberId);
    const userData = userRecord?.data;
    const appBusinessId = userData ? getSmartRefillBusinessId(userData) : undefined;

    let status: DataManagementLinkStatus = "linked";
    if (!userRecord) {
      status = "no_user";
    } else if (appBusinessId && appBusinessId !== candidate.businessId) {
      status = "no_business";
    }

    rows.push({
      userId: candidate.memberId,
      userEmail:
        typeof candidate.memberData.email === "string" ? candidate.memberData.email :
          userData && typeof userData.email === "string" ? userData.email :
            undefined,
      userDisplayName:
        typeof candidate.memberData.displayName === "string" ?
          candidate.memberData.displayName :
          typeof candidate.memberData.name === "string" ?
            candidate.memberData.name :
            userData ? userDisplayName(userData) :
              undefined,
      userPhotoURL: userPhotoURL(userData, candidate.memberData),
      businessId: candidate.businessId,
      businessName: business.name,
      staffRole: candidate.staffRole,
      status,
    });
  }

  return rows;
}

export async function listDataManagementOverview(): Promise<DataManagementOverview> {
  const [usersSnap, businessesSnap, membersSnap, addonCatalog] = await Promise.all([
    db.collection("users").get(),
    db.collection("businesses").get(),
    db.collectionGroup("members").get(),
    loadAddonCatalogForDataManagement(),
  ]);

  const businesses: BusinessRecord[] = businessesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name || "Unnamed business"),
      ownerId: typeof data.ownerId === "string" ? data.ownerId : undefined,
    };
  });

  const businessById = new Map(businesses.map((business) => [business.id, business]));
  const businessOwnerIds = new Set(
    businesses
      .map((business) => business.ownerId)
      .filter((ownerId): ownerId is string => typeof ownerId === "string"),
  );

  const usersById = new Map(
    usersSnap.docs.map((doc) => [doc.id, { id: doc.id, data: doc.data() }]),
  );

  const users: UserRecord[] = [...usersById.values()].filter(({ data }) =>
    hasSmartRefillAccess(data.appAccess),
  );

  const memberCountsByBusiness = buildMemberCountsByBusiness(
    membersSnap,
    businessById,
  );

  const ownerRows: DataManagementLinkRow[] = [];
  const linkedOwnerBusinessIds = new Set<string>();

  for (const user of users) {
    const role = resolveSmartRefillAccessRole(
      user.id,
      user.data,
      businessOwnerIds,
    );
    if (role !== "owner") continue;

    const business = resolveBusinessForOwner(
      user.id,
      user.data,
      businesses,
      businessById,
    );

    const row: DataManagementLinkRow = {
      userId: user.id,
      userEmail: typeof user.data.email === "string" ? user.data.email : undefined,
      userDisplayName: userDisplayName(user.data),
      userPhotoURL: userPhotoURL(user.data),
      businessId: business?.id,
      businessName: business?.name,
      status: business ? "linked" : "no_business",
    };

    ownerRows.push(row);
    if (business) linkedOwnerBusinessIds.add(business.id);
  }

  for (const business of businesses) {
    if (!linkedOwnerBusinessIds.has(business.id)) {
      ownerRows.push({
        businessId: business.id,
        businessName: business.name,
        userId: business.ownerId,
        status: "no_user",
      });
    }
  }

  const staffCandidates = listStaffMemberCandidates(membersSnap, businessById);
  const staffRows = buildStaffMemberRows(staffCandidates, businessById, usersById);

  const businessIds = [
    ...new Set(
      [...ownerRows, ...staffRows]
        .map((row) => row.businessId)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const [ownerNamesById, subscriptionsByBusiness] = await Promise.all([
    loadOwnerDisplayNames(
      businesses.map((business) => business.ownerId).filter(Boolean) as string[],
      usersById,
    ),
    loadActiveSubscriptionsByBusiness(businessIds, addonCatalog),
  ]);

  attachBusinessContext(
    ownerRows,
    businessById,
    ownerNamesById,
    memberCountsByBusiness,
    subscriptionsByBusiness,
  );
  attachBusinessContext(
    staffRows,
    businessById,
    ownerNamesById,
    memberCountsByBusiness,
    subscriptionsByBusiness,
  );

  await Promise.all([
    enrichRowsFromAuth(ownerRows),
    enrichRowsFromAuth(staffRows),
  ]);

  return {
    owners: sortRows(ownerRows),
    staff: sortRows(staffRows),
  };
}
