import { db } from "../config/firebase-admin";
import {
  normalizeSmartRefillStaffSubRole,
  type SmartRefillStaffSubRole,
} from "../constants/smartrefill";
import { mapOwnerSubscriptions } from "./map-owner-subscriptions";

export type DataManagementMemberBreakdown = {
  admins: number;
  riders: number;
};

export type DataManagementActiveSubscription = {
  planName: string;
  planCode?: string;
  billingCycle?: string;
  status: string;
  addonNames: string[];
  createdAt?: string;
  activatedAt?: string;
  activatesAt?: string;
  expiresAt?: string;
};

type AddonCatalog = {
  byId: Map<string, string>;
  byCode: Map<string, string>;
};

type AddonLineItem = {
  addonId?: string;
  code?: string;
};

function extractAddonLineItems(sub: Record<string, unknown>): AddonLineItem[] {
  const top = sub.addonLineItems;
  if (Array.isArray(top)) return top as AddonLineItem[];

  const meta = sub.metadata;
  const metaAddonItems =
    meta && typeof meta === "object" ?
      (meta as { addonLineItems?: unknown }).addonLineItems :
      undefined;
  if (Array.isArray(metaAddonItems)) return metaAddonItems as AddonLineItem[];

  return [];
}

async function loadAddonCatalog(): Promise<AddonCatalog> {
  const snap = await db.collection("subscription_addons").get();
  const byId = new Map<string, string>();
  const byCode = new Map<string, string>();

  snap.docs.forEach((doc) => {
    const data = doc.data();
    const name = String(data.name || data.code || doc.id);
    byId.set(doc.id, name);
    if (typeof data.code === "string" && data.code.trim()) {
      byCode.set(data.code.trim().toUpperCase(), name);
    }
  });

  return { byId, byCode };
}

function resolveAddonNames(
  lines: AddonLineItem[],
  catalog: AddonCatalog,
): string[] {
  const names: string[] = [];

  for (const line of lines) {
    let name: string | undefined;
    if (line.addonId) name = catalog.byId.get(line.addonId);
    if (!name && line.code) {
      name = catalog.byCode.get(String(line.code).trim().toUpperCase());
    }
    if (name) names.push(name);
  }

  return [...new Set(names)];
}

export function buildMemberCountsByBusiness(
  membersSnap: FirebaseFirestore.QuerySnapshot,
  businessById: Map<string, { ownerId?: string }>,
): Map<string, DataManagementMemberBreakdown> {
  const counts = new Map<string, DataManagementMemberBreakdown>();

  for (const memberDoc of membersSnap.docs) {
    const memberId = memberDoc.id;
    const memberData = memberDoc.data();
    const businessRef = memberDoc.ref.parent.parent;
    if (!businessRef) continue;

    const businessId = businessRef.id;
    const business = businessById.get(businessId);
    if (!business) continue;

    if (memberId === business.ownerId) continue;
    if (String(memberData.role || "").trim().toLowerCase() === "owner") continue;
    if (memberData.isActive === false) continue;

    const staffRole = normalizeSmartRefillStaffSubRole(memberData.role);
    if (!staffRole) continue;

    const bucket = counts.get(businessId) ?? { admins: 0, riders: 0 };
    if (staffRole === "admin") bucket.admins += 1;
    if (staffRole === "rider") bucket.riders += 1;
    counts.set(businessId, bucket);
  }

  return counts;
}

export async function loadActiveSubscriptionsByBusiness(
  businessIds: string[],
  catalog: AddonCatalog,
): Promise<Map<string, DataManagementActiveSubscription>> {
  const uniqueIds = [...new Set(businessIds.filter(Boolean))];
  const result = new Map<string, DataManagementActiveSubscription>();

  await Promise.all(
    uniqueIds.map(async (businessId) => {
      const subscriptionsSnap = await db
        .collection("businesses")
        .doc(businessId)
        .collection("subscriptions")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      if (subscriptionsSnap.empty) return;

      const rawById = new Map(
        subscriptionsSnap.docs.map((doc) => [doc.id, doc.data() as Record<string, unknown>]),
      );
      const mapped = mapOwnerSubscriptions(
        subscriptionsSnap.docs.map((doc) => ({
          id: doc.id,
          data: () => doc.data() as Record<string, unknown>,
        })),
      );

      const active =
        mapped.find(
          (sub) => sub.timeline === "current" && sub.status === "active",
        ) ??
        mapped.find((sub) => sub.status === "active") ??
        mapped.find((sub) => sub.timeline === "current");

      if (!active) return;

      const raw = rawById.get(active.id) ?? {};
      const addonNames = resolveAddonNames(extractAddonLineItems(raw), catalog);

      result.set(businessId, {
        planName: active.planName,
        planCode: active.planCode,
        billingCycle: active.billingCycle,
        status: active.status,
        addonNames,
        createdAt: active.createdAt,
        activatedAt: active.activatedAt,
        activatesAt: active.activatesAt,
        expiresAt: active.expiresAt,
      });
    }),
  );

  return result;
}

export async function loadAddonCatalogForDataManagement(): Promise<AddonCatalog> {
  return loadAddonCatalog();
}

export function formatMemberBreakdownLabel(
  breakdown?: DataManagementMemberBreakdown,
): string | undefined {
  if (!breakdown) return undefined;
  const adminLabel = `${breakdown.admins} admin${breakdown.admins === 1 ? "" : "s"}`;
  const riderLabel = `${breakdown.riders} rider${breakdown.riders === 1 ? "" : "s"}`;
  return `${adminLabel} · ${riderLabel}`;
}

export type StaffMemberCandidate = {
  memberId: string;
  memberData: FirebaseFirestore.DocumentData;
  businessId: string;
  staffRole: SmartRefillStaffSubRole;
};

export function listStaffMemberCandidates(
  membersSnap: FirebaseFirestore.QuerySnapshot,
  businessById: Map<string, { id: string; name: string; ownerId?: string }>,
): StaffMemberCandidate[] {
  const rows: StaffMemberCandidate[] = [];

  for (const memberDoc of membersSnap.docs) {
    const memberId = memberDoc.id;
    const memberData = memberDoc.data();
    const businessRef = memberDoc.ref.parent.parent;
    if (!businessRef) continue;

    const businessId = businessRef.id;
    const business = businessById.get(businessId);
    if (!business) continue;

    if (memberId === business.ownerId) continue;
    if (String(memberData.role || "").trim().toLowerCase() === "owner") continue;

    const staffRole = normalizeSmartRefillStaffSubRole(memberData.role);
    if (!staffRole) continue;

    rows.push({ memberId, memberData, businessId, staffRole });
  }

  return rows;
}
