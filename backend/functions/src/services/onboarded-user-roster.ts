import { db } from "../config/firebase-admin";
import { normalizeSmartRefillRole } from "../constants/smartrefill";
import type { LeadRecord, LeadWorkspaceOverlay } from "./leads-service";
import {
  mapOwnerSubscriptions,
  pickLatestCurrentPlanSubscription,
} from "./map-owner-subscriptions";
import { mapWithConcurrency } from "../utils/map-with-concurrency";

export type OnboardedRosterMember = {
  businessId: string;
  userId: string;
  role: "owner" | "staff";
  name?: string;
  email?: string;
  phone?: string;
};

export type OnboardedRosterSubscription = {
  planName?: string;
  planCode?: string;
  billingCycle?: string;
  price?: number;
};

export type OnboardedRosterBusiness = {
  businessId: string;
  ownerId?: string;
  customerCount: number;
  /** Current subscription the station is on. */
  subscription?: OnboardedRosterSubscription;
};

const EMPTY_CHANNELS = {
  viber: false,
  email: false,
  messenger: false,
  smsCall: false,
};

function readTrimmed(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Owner when the member is the workspace owner; admin/rider/staff count as Staff. */
export function classifySmartRefillMember(input: {
  userId: string;
  ownerId?: string;
  role?: unknown;
}): "owner" | "staff" | null {
  if (input.ownerId && input.userId === input.ownerId) return "owner";
  const role = normalizeSmartRefillRole(
    typeof input.role === "string" ? input.role : undefined,
  );
  if (role === "owner") return "owner";
  if (role === "staff") return "staff";
  return null;
}

function personKey(businessId: string, userId: string): string {
  return `${businessId}:${userId}`;
}

function subscriptionOverlay(
  business: OnboardedRosterBusiness | undefined,
): LeadWorkspaceOverlay | undefined {
  const subscription = business?.subscription;
  const planName = subscription?.planName?.trim();
  const planCode = subscription?.planCode?.trim();
  if (!planName && !planCode) return undefined;
  return {
    planName: planName || undefined,
    planCode: planCode || undefined,
    billingCycle: subscription?.billingCycle,
    price: subscription?.price,
  };
}

function withSubscriptionPlan(
  lead: LeadRecord,
  business: OnboardedRosterBusiness | undefined,
): LeadRecord {
  const overlay = subscriptionOverlay(business);
  if (!overlay) return lead;
  return {
    ...lead,
    planName: overlay.planName,
    planCode: overlay.planCode,
    billingCycle: overlay.billingCycle,
    price: overlay.price,
    workspace: {
      ...lead.workspace,
      ...overlay,
    },
  };
}

function isOnboardedSmartRefill(lead: LeadRecord): boolean {
  return (
    lead.stage === "onboarded" &&
    lead.platformSource === "smartrefill" &&
    Boolean(lead.linkedBusinessId)
  );
}

/**
 * Stamp each onboarded Smart Refill station with its customer total, label the
 * station row Owner, and add one row per staff member of that station.
 */
export function applyOnboardedSmartRefillRoster(
  leads: LeadRecord[],
  businesses: OnboardedRosterBusiness[],
  members: OnboardedRosterMember[],
): LeadRecord[] {
  const businessById = new Map(businesses.map((row) => [row.businessId, row]));
  const covered = new Set<string>();
  const stationByBusiness = new Map<string, LeadRecord>();

  const stamped = leads.map((lead) => {
    if (!isOnboardedSmartRefill(lead)) return lead;
    const businessId = lead.linkedBusinessId!;
    const business = businessById.get(businessId);
    const member = members.find(
      (row) => row.businessId === businessId && row.userId === lead.userId,
    );
    const isStaff =
      lead.id.startsWith("sr-staff:") || member?.role === "staff";
    if (lead.userId && lead.userId !== "smartrefill") {
      covered.add(personKey(businessId, lead.userId));
    }
    const next = withSubscriptionPlan(
      {
        ...lead,
        ...(business ? { customerCount: business.customerCount } : {}),
        platformRole: isStaff ? "Staff" : "Owner",
        platformSource: "smartrefill" as const,
      },
      business,
    );
    if (!isStaff && !stationByBusiness.has(businessId)) {
      stationByBusiness.set(businessId, next);
    }
    return next;
  });

  const staffRows: LeadRecord[] = [];
  for (const member of members) {
    if (member.role !== "staff") continue;
    const station = stationByBusiness.get(member.businessId);
    const business = businessById.get(member.businessId);
    if (!station || !business) continue;
    const key = personKey(member.businessId, member.userId);
    if (covered.has(key)) continue;
    covered.add(key);
    staffRows.push({
      ...station,
      id: `sr-staff:${member.businessId}:${member.userId}`,
      userId: member.userId,
      ownerName: member.name || member.email || "Staff",
      email: member.email,
      phone: member.phone,
      platformSource: "smartrefill",
      platformRole: "Staff",
      customerCount: business.customerCount,
      stage: "onboarded",
      leadSource: station.leadSource || "SmartRefill workspace",
      sourceKind: "manual",
      linkedBusinessId: member.businessId,
      attemptCount: 0,
      warmAttemptCount: 0,
      coldAttemptCount: 0,
      channels: { ...EMPTY_CHANNELS },
      notes: undefined,
      stallReason: undefined,
      warmStatus: undefined,
      attendedDemo: undefined,
      pipelineGathered: true,
      createdByUid: "smartrefill",
    });
  }

  return [...stamped, ...staffRows];
}

async function loadBusinessRoster(
  businessId: string,
): Promise<{
  business: OnboardedRosterBusiness;
  members: OnboardedRosterMember[];
}> {
  const ref = db.collection("businesses").doc(businessId);
  const [countSnap, membersSnap, businessSnap, subsSnap] = await Promise.all([
    ref.collection("customers").count().get(),
    ref.collection("members").get(),
    ref.get(),
    ref.collection("subscriptions").get(),
  ]);
  const currentPlan = pickLatestCurrentPlanSubscription(
    mapOwnerSubscriptions(
      subsSnap.docs.map((doc) => ({
        id: doc.id,
        data: () => (doc.data() ?? {}) as Record<string, unknown>,
      })),
    ),
  );
  const data = (businessSnap.data() ?? {}) as Record<string, unknown>;
  const ownerId =
    typeof data.ownerId === "string" && data.ownerId.trim() ?
      data.ownerId.trim() :
      undefined;
  const members: OnboardedRosterMember[] = [];
  for (const doc of membersSnap.docs) {
    const member = (doc.data() ?? {}) as Record<string, unknown>;
    if (member.isActive === false) continue;
    const role = classifySmartRefillMember({
      userId: doc.id,
      ownerId,
      role: member.role,
    });
    if (!role) continue;
    members.push({
      businessId,
      userId: doc.id,
      role,
      name: readTrimmed(member, ["displayName", "fullName", "name"]),
      email: readTrimmed(member, ["email"]),
      phone: readTrimmed(member, ["phone"]),
    });
  }
  if (ownerId && !members.some((row) => row.userId === ownerId)) {
    members.push({ businessId, userId: ownerId, role: "owner" });
  }
  return {
    business: {
      businessId,
      ownerId,
      customerCount: countSnap.data().count,
      subscription: currentPlan ?
        {
          planName: currentPlan.planName,
          planCode: currentPlan.planCode,
          billingCycle: currentPlan.billingCycle,
          price: currentPlan.price,
        } :
        undefined,
    },
    members,
  };
}

/** Live customer totals and owner/staff rows for onboarded Smart Refill stations. */
export async function attachOnboardedSmartRefillRoster(
  leads: LeadRecord[],
): Promise<LeadRecord[]> {
  const businessIds = [
    ...new Set(
      leads
        .filter(isOnboardedSmartRefill)
        .map((lead) => lead.linkedBusinessId!)
        .filter(Boolean),
    ),
  ];
  if (businessIds.length === 0) return leads;

  const loaded = await mapWithConcurrency(businessIds, 8, (businessId) =>
    loadBusinessRoster(businessId),
  );
  return applyOnboardedSmartRefillRoster(
    leads,
    loaded.map((row) => row.business),
    loaded.flatMap((row) => row.members),
  );
}
