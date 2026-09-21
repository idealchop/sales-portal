import { auth, db } from "../config/firebase-admin";
import { SMARTREFILL_APP_ID } from "../constants/smartrefill";
import { toIsoString } from "./sales-serializer";
import { mapOwnerSubscriptions, type OwnerSubscription } from "./map-owner-subscriptions";
import {
  countGettingStartedDone,
  readWorkspaceOnboardedAt,
  type OnboardedMonitorSubscription,
} from "./onboarded-journey-monitor";

export type OnboardedBusinessSnapshot = {
  onboardingComplete: boolean;
  onboardedAt: string | null;
  gettingStartedCompleted: number;
  activityDayCount: number;
  /** Distinct login_events calendar day (journey activity). */
  lastActiveDay: string | null;
  /** Firebase Auth `metadata.lastSignInTime` for the owner. */
  lastSignInAt: string | null;
  subscriptionStatus: string | null;
  subscriptionExpiresAt: string | null;
  subscriptionChangeType: string | null;
  planName?: string;
  planCode?: string;
  billingCycle?: string;
  price?: number;
  currentSubscription: OnboardedMonitorSubscription | null;
  recentSubscriptionChanges: OnboardedMonitorSubscription[];
  currentSubscriptionId?: string;
};

function toMonitorSub(row: OwnerSubscription): OnboardedMonitorSubscription {
  return {
    status: row.status,
    expiresAt: row.expiresAt ?? null,
    changeType: row.changeType ?? null,
    isCancellation: row.isCancellation,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    createdAt: row.createdAt ?? null,
  };
}

function authLastSignInToIso(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function loadOwnerAuthLastSignIn(
  ownerId: string,
): Promise<string | null> {
  if (!ownerId) return null;
  try {
    const user = await auth.getUser(ownerId);
    return authLastSignInToIso(user.metadata.lastSignInTime);
  } catch {
    return null;
  }
}

async function countOwnerActivityDays(
  ownerId: string,
  sinceIso: string | null,
): Promise<{ activityDayCount: number; lastActiveDay: string | null }> {
  if (!ownerId) return { activityDayCount: 0, lastActiveDay: null };

  let query = db
    .collection("users")
    .doc(ownerId)
    .collection("login_events")
    .select("calendarDayUtc", "appId");

  if (sinceIso) {
    const sinceDay = sinceIso.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(sinceDay)) {
      query = query.where("calendarDayUtc", ">=", sinceDay) as typeof query;
    }
  }

  const snap = await query.get();
  const days = new Set<string>();
  let lastActiveDay: string | null = null;
  for (const doc of snap.docs) {
    const data = doc.data() ?? {};
    if (String(data.appId || "") !== SMARTREFILL_APP_ID) continue;
    const day = String(data.calendarDayUtc || "");
    if (!day) continue;
    days.add(day);
    if (!lastActiveDay || day > lastActiveDay) lastActiveDay = day;
  }
  return { activityDayCount: days.size, lastActiveDay };
}

/**
 * Load onboarded journey snapshot from a SmartRefill business (+ owner Auth / logins).
 */
export async function loadOnboardedBusinessSnapshot(
  businessId: string,
  ownerIdHint?: string | null,
): Promise<OnboardedBusinessSnapshot | null> {
  const businessSnap = await db.collection("businesses").doc(businessId).get();
  if (!businessSnap.exists) return null;

  const data = (businessSnap.data() ?? {}) as Record<string, unknown>;
  const onboardingComplete = Boolean(data.onboardingComplete);
  const gettingStarted =
    data.gettingStarted && typeof data.gettingStarted === "object" ?
      (data.gettingStarted as Record<string, unknown>) :
      {};
  const gettingStartedCompleted = countGettingStartedDone(gettingStarted);
  const onboardedAt =
    readWorkspaceOnboardedAt(data) ||
    toIsoString(data.createdAt) ||
    null;

  const ownerId =
    (typeof ownerIdHint === "string" && ownerIdHint.trim()) ||
    (typeof data.ownerId === "string" ? data.ownerId.trim() : "") ||
    "";

  const [{ activityDayCount, lastActiveDay }, lastSignInAt] = await Promise.all(
    [
      countOwnerActivityDays(ownerId, onboardedAt),
      loadOwnerAuthLastSignIn(ownerId),
    ],
  );

  const subsSnap = await db
    .collection("businesses")
    .doc(businessId)
    .collection("subscriptions")
    .get();
  const mapped = mapOwnerSubscriptions(
    subsSnap.docs.map((doc) => ({
      id: doc.id,
      data: () => (doc.data() ?? {}) as Record<string, unknown>,
    })),
  );
  const current =
    mapped.find((row) => row.timeline === "current") ?? mapped[0] ?? null;
  const recentSubscriptionChanges = mapped.map(toMonitorSub);

  return {
    onboardingComplete,
    onboardedAt,
    gettingStartedCompleted,
    activityDayCount,
    lastActiveDay,
    lastSignInAt,
    subscriptionStatus: current?.status ?? null,
    subscriptionExpiresAt: current?.expiresAt ?? null,
    subscriptionChangeType: current?.changeType ?? null,
    planName: current?.planName,
    planCode: current?.planCode,
    billingCycle: current?.billingCycle,
    price: current?.price,
    currentSubscription: current ? toMonitorSub(current) : null,
    recentSubscriptionChanges,
    currentSubscriptionId: current?.id,
  };
}

/** Fields persisted onto `leads` during gather for list-time monitor evaluation. */
export function onboardedSnapshotLeadFields(
  snapshot: OnboardedBusinessSnapshot,
): Record<string, unknown> {
  return {
    onboardedAt: snapshot.onboardedAt,
    gettingStartedCompleted: snapshot.gettingStartedCompleted,
    activityDayCount: snapshot.activityDayCount,
    lastActiveDay: snapshot.lastActiveDay,
    lastSignInAt: snapshot.lastSignInAt,
    subscriptionStatus: snapshot.subscriptionStatus,
    subscriptionExpiresAt: snapshot.subscriptionExpiresAt,
    subscriptionChangeType: snapshot.subscriptionChangeType,
    planName: snapshot.planName ?? null,
    planCode: snapshot.planCode ?? null,
    billingCycle: snapshot.billingCycle ?? null,
    price: snapshot.price ?? null,
  };
}
