import { db, FieldValue, Timestamp } from "../config/firebase-admin";

const REQUESTS = "community_dispatch_requests";
const OFFERS = "dispatch_offers";
const OFFER_TTL_MS = 3 * 60 * 1000;

export type CommunityDispatchRequestRow = {
  id: string;
  referenceId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  metaPsid: string;
  parsed?: {
    name?: string;
    qty?: number;
    delivery?: boolean;
    number?: string;
    location?: string;
    email?: string;
  };
  geocode?: { formattedAddress?: string };
  searchRadiusKm?: number;
  stationsFoundEver?: boolean;
  assignedBusinessId?: string;
  smartrefillSubmissionId?: string;
  submissionReferenceId?: string;
  routingNotes?: string;
  candidateBusinessIds?: string[];
};

export type CommunityDispatchOfferRow = {
  id: string;
  businessId: string;
  status: string;
  rank: number;
  expiresAt: string | null;
  declineReason?: string;
};

export type CommunityDispatchMetrics = {
  intakeToday: number;
  intakeLast7Days: number;
  openCount: number;
  acceptedCount: number;
  acceptRatePercent: number | null;
  avgAcceptMinutes: number | null;
  escalatedCount: number;
  topStations: Array<{ businessId: string; businessName: string; accepts: number }>;
};

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toDate(value: unknown): Date | null {
  const iso = toIso(value);
  return iso ? new Date(iso) : null;
}

function dayKeyManila(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function mapRequest(id: string, data: FirebaseFirestore.DocumentData): CommunityDispatchRequestRow {
  return {
    id,
    referenceId: String(data.referenceId ?? id),
    status: String(data.status ?? "parsed"),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    metaPsid: String(data.metaPsid ?? ""),
    parsed: data.parsed as CommunityDispatchRequestRow["parsed"],
    geocode: data.geocode as CommunityDispatchRequestRow["geocode"],
    searchRadiusKm: typeof data.searchRadiusKm === "number" ? data.searchRadiusKm : undefined,
    stationsFoundEver: data.stationsFoundEver === true,
    assignedBusinessId: typeof data.assignedBusinessId === "string" ? data.assignedBusinessId : undefined,
    smartrefillSubmissionId:
      typeof data.smartrefillSubmissionId === "string" ? data.smartrefillSubmissionId : undefined,
    submissionReferenceId:
      typeof data.submissionReferenceId === "string" ? data.submissionReferenceId : undefined,
    routingNotes: typeof data.routingNotes === "string" ? data.routingNotes : undefined,
    candidateBusinessIds: Array.isArray(data.candidateBusinessIds) ?
      data.candidateBusinessIds.map(String) :
      undefined,
  };
}

export async function loadPendingCommunityOfferCounts(): Promise<Map<string, number>> {
  const snap = await db.collection(OFFERS).where("status", "==", "pending").get();
  const counts = new Map<string, number>();
  for (const doc of snap.docs) {
    const businessId = String(doc.data().businessId ?? "");
    if (!businessId) continue;
    counts.set(businessId, (counts.get(businessId) ?? 0) + 1);
  }
  return counts;
}

export async function listCommunityDispatchRequests(params: {
  status?: string;
  limit?: number;
}): Promise<CommunityDispatchRequestRow[]> {
  const limit = Math.min(Math.max(params.limit ?? 40, 1), 100);
  const fetchLimit = params.status?.trim() ? Math.min(limit * 4, 200) : limit;

  const snap = await db
    .collection(REQUESTS)
    .orderBy("createdAt", "desc")
    .limit(fetchLimit)
    .get();

  let rows = snap.docs.map((doc) => mapRequest(doc.id, doc.data()));
  if (params.status?.trim()) {
    const status = params.status.trim();
    rows = rows.filter((row) => row.status === status);
  }
  return rows.slice(0, limit);
}

export async function getCommunityDispatchRequestDetail(
  requestId: string,
): Promise<{ request: CommunityDispatchRequestRow; offers: CommunityDispatchOfferRow[] } | null> {
  const requestSnap = await db.collection(REQUESTS).doc(requestId).get();
  if (!requestSnap.exists) return null;

  const offersSnap = await db
    .collection(OFFERS)
    .where("requestId", "==", requestId)
    .get();

  const offers = offersSnap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        businessId: String(data.businessId ?? ""),
        status: String(data.status ?? "pending"),
        rank: Number(data.rank) || 0,
        expiresAt: toIso(data.expiresAt),
        declineReason: typeof data.declineReason === "string" ? data.declineReason : undefined,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  return {
    request: mapRequest(requestSnap.id, requestSnap.data()!),
    offers,
  };
}

async function expirePendingOffersForRequest(requestId: string): Promise<void> {
  const snap = await db
    .collection(OFFERS)
    .where("requestId", "==", requestId)
    .where("status", "==", "pending")
    .get();

  if (snap.empty) return;
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.set(doc.ref, { status: "expired", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await batch.commit();
}

export async function cancelCommunityDispatchRequest(
  requestId: string,
  actorUid: string,
): Promise<{ ok: true } | { ok: false; code: "NOT_FOUND" | "ALREADY_ACCEPTED" }> {
  const ref = db.collection(REQUESTS).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "NOT_FOUND" };

  const data = snap.data()!;
  if (data.status === "accepted" || data.smartrefillSubmissionId) {
    return { ok: false, code: "ALREADY_ACCEPTED" };
  }

  await expirePendingOffersForRequest(requestId);
  await ref.set(
    {
      status: "cancelled",
      routingNotes: `Cancelled by Sales Portal ops (${actorUid}).`,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true };
}

export async function assignCommunityDispatchRequest(params: {
  requestId: string;
  businessId: string;
  actorUid: string;
}): Promise<{ ok: true; offerId: string } | { ok: false; code: string }> {
  const ref = db.collection(REQUESTS).doc(params.requestId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "NOT_FOUND" };

  const data = snap.data()!;
  if (data.status === "accepted" || data.smartrefillSubmissionId) {
    return { ok: false, code: "ALREADY_ACCEPTED" };
  }

  const businessSnap = await db.collection("businesses").doc(params.businessId).get();
  if (!businessSnap.exists) return { ok: false, code: "BUSINESS_NOT_FOUND" };

  await expirePendingOffersForRequest(params.requestId);

  const offerId = `${params.requestId}__${params.businessId}`;
  const expiresAt = Timestamp.fromMillis(Date.now() + OFFER_TTL_MS);

  await db.collection(OFFERS).doc(offerId).set(
    {
      requestId: params.requestId,
      businessId: params.businessId,
      status: "pending",
      rank: 0,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );

  await ref.set(
    {
      status: "offered",
      routingMode: "broadcast",
      assignedBusinessId: FieldValue.delete(),
      activeOfferId: offerId,
      candidateBusinessIds: [params.businessId],
      routingNotes: `Manual assign by Sales Portal ops (${params.actorUid}).`,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true, offerId };
}

export async function computeCommunityDispatchMetrics(): Promise<CommunityDispatchMetrics> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const snap = await db
    .collection(REQUESTS)
    .where("createdAt", ">=", Timestamp.fromDate(since))
    .get();

  const todayKey = dayKeyManila(new Date());
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let intakeToday = 0;
  let intakeLast7Days = 0;
  let openCount = 0;
  let acceptedCount = 0;
  let offeredOrTerminal = 0;
  let escalatedCount = 0;
  const acceptDurations: number[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const created = toDate(data.createdAt);
    if (!created) continue;

    if (dayKeyManila(created) === todayKey) intakeToday += 1;
    if (created >= sevenDaysAgo) intakeLast7Days += 1;

    const status = String(data.status ?? "");
    if (["offered", "routing", "parsed", "needs_location"].includes(status)) {
      openCount += 1;
    }
    if (status === "accepted") {
      acceptedCount += 1;
      offeredOrTerminal += 1;
      const updated = toDate(data.updatedAt);
      if (updated) {
        acceptDurations.push((updated.getTime() - created.getTime()) / 60_000);
      }
    } else if (["expired", "cancelled", "no_stations"].includes(status)) {
      offeredOrTerminal += 1;
    }

    if (
      (typeof data.searchRadiusKm === "number" && data.searchRadiusKm > 5) ||
      data.stationsFoundEver === true && status === "expired"
    ) {
      escalatedCount += 1;
    }
  }

  const acceptRatePercent =
    offeredOrTerminal > 0 ?
      Math.round((acceptedCount / offeredOrTerminal) * 1000) / 10 :
      null;

  const avgAcceptMinutes =
    acceptDurations.length ?
      Math.round(
        acceptDurations.reduce((sum, value) => sum + value, 0) / acceptDurations.length,
      ) :
      null;

  const acceptedOffersSnap = await db
    .collection(OFFERS)
    .where("status", "==", "accepted")
    .where("updatedAt", ">=", Timestamp.fromDate(since))
    .get();

  const acceptCounts = new Map<string, number>();
  for (const doc of acceptedOffersSnap.docs) {
    const businessId = String(doc.data().businessId ?? "");
    if (!businessId) continue;
    acceptCounts.set(businessId, (acceptCounts.get(businessId) ?? 0) + 1);
  }

  const topIds = [...acceptCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topStations: CommunityDispatchMetrics["topStations"] = [];
  for (const [businessId, accepts] of topIds) {
    const biz = await db.collection("businesses").doc(businessId).get();
    const community = biz.data()?.communityDispatch as { publicName?: string } | undefined;
    const name =
      typeof community?.publicName === "string" && community.publicName.trim() ?
        community.publicName.trim() :
        String(biz.data()?.name ?? businessId);
    topStations.push({ businessId, businessName: name, accepts });
  }

  return {
    intakeToday,
    intakeLast7Days,
    openCount,
    acceptedCount,
    acceptRatePercent,
    avgAcceptMinutes,
    escalatedCount,
    topStations,
  };
}
