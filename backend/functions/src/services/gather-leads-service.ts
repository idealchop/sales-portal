import { db, FieldValue } from "../config/firebase-admin";
import {
  buildSmartRefillPipelineBundle,
  excludeSalesConnectedLeads,
} from "./build-smartrefill-pipeline-leads";
import type { LeadRecord, LeadStage } from "./leads-service";
import {
  loadOnboardedBusinessSnapshot,
  onboardedSnapshotLeadFields,
} from "./load-onboarded-snapshot";
import { stampPipelineAffiliateOnPayingSubscription } from "./stamp-pipeline-affiliate";
import { mapWithConcurrency } from "../utils/map-with-concurrency";

export type GatherMode = "incremental" | "full";

/** Nightly Cloud Scheduler (Asia/Manila). Same work as manual full refresh. */
export const SCHEDULED_LEAD_GATHER_CRON = "0 0 * * *";
export const SCHEDULED_LEAD_GATHER_TIME_ZONE = "Asia/Manila";
export const SCHEDULED_LEAD_GATHER_MODE: GatherMode = "full";

export type GatherLeadsSummary = {
  mode: GatherMode;
  scanned: number;
  inserted: number;
  updated: number;
  skipped: number;
};

const EMPTY_CHANNELS = {
  viber: false,
  email: false,
  messenger: false,
  smsCall: false,
};

/** Fields refreshed from SmartRefill / legacy on gather (CRM fields stay untouched). */
export const GATHER_SOURCE_FIELD_KEYS = [
  "businessName",
  "ownerName",
  "email",
  "phone",
  "address",
  "userId",
  "leadSource",
  "sourceKind",
  "platformSource",
  "platformRole",
  "linkedBusinessId",
  "customerCount",
  "inquiredAt",
  "registeredAt",
  "firstContactAt",
  "onboardedAt",
  "gettingStartedCompleted",
  "activityDayCount",
  "lastActiveDay",
  "lastSignInAt",
  "subscriptionStatus",
  "subscriptionExpiresAt",
  "subscriptionChangeType",
  "contentSources",
  "contentSummary",
  "contentReferrer",
] as const;

function omitUndefined<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

/** Source-only patch for full refresh updates. */
export function buildGatherSourceUpdatePayload(
  lead: LeadRecord,
  opts?: { promoteStageToOnboarded?: boolean },
): Record<string, unknown> {
  return omitUndefined({
    businessName: lead.businessName,
    ownerName: lead.ownerName,
    email: lead.email || "",
    phone: lead.phone || "",
    address: lead.address || "",
    userId: lead.userId,
    leadSource: lead.leadSource || "",
    sourceKind: lead.sourceKind || null,
    platformSource: lead.platformSource || null,
    platformRole: lead.platformRole || null,
    linkedBusinessId: lead.linkedBusinessId || null,
    customerCount:
      typeof lead.customerCount === "number" ? lead.customerCount : null,
    inquiredAt: lead.inquiredAt || null,
    registeredAt: lead.registeredAt || null,
    firstContactAt: lead.firstContactAt || null,
    onboardedAt: lead.onboardedAt ?? null,
    gettingStartedCompleted:
      typeof lead.gettingStartedCompleted === "number" ?
        lead.gettingStartedCompleted :
        null,
    activityDayCount:
      typeof lead.activityDayCount === "number" ? lead.activityDayCount : null,
    lastActiveDay: lead.lastActiveDay ?? null,
    lastSignInAt: lead.lastSignInAt ?? null,
    subscriptionStatus: lead.subscriptionStatus ?? null,
    subscriptionExpiresAt: lead.subscriptionExpiresAt ?? null,
    subscriptionChangeType: lead.subscriptionChangeType ?? null,
    contentSources: lead.contentSources ?? [],
    contentSummary: lead.contentSummary || "",
    contentReferrer: lead.contentReferrer || "",
    ...(opts?.promoteStageToOnboarded ? { stage: "onboarded" as LeadStage } : {}),
    ...(lead.notes?.trim() ? { sourceNotes: lead.notes.trim() } : {}),
    externalId: lead.id,
    pipelineGathered: true,
    lastGatheredAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** Full document for first-time insert into `leads`. */
export function buildGatherInsertPayload(
  lead: LeadRecord,
): Record<string, unknown> {
  return omitUndefined({
    ...buildGatherSourceUpdatePayload(lead),
    stage: lead.stage,
    attemptCount: 0,
    warmAttemptCount: 0,
    coldAttemptCount: 0,
    assignedToUid: null,
    channels: { ...EMPTY_CHANNELS },
    warmStatus: "",
    stallReason: "",
    notes: lead.notes || "",
    sourceWebsite: "",
    referredBy: "",
    gatheredAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    createdByUid: "pipeline-gather",
  });
}

async function loadExistingLeadMeta(
  ids: string[],
): Promise<
  Map<
    string,
    {
      stage: LeadStage;
      referredByAffiliateId?: string;
      referredByAffiliateCode?: string;
    }
  >
> {
  const existing = new Map<
    string,
    {
      stage: LeadStage;
      referredByAffiliateId?: string;
      referredByAffiliateCode?: string;
    }
  >();
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const refs = chunk.map((id) => db.collection("leads").doc(id));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() ?? {};
      const stageRaw = String(data.stage || "inquire");
      existing.set(snap.id, {
        stage: stageRaw as LeadStage,
        referredByAffiliateId:
          typeof data.referredByAffiliateId === "string" ?
            data.referredByAffiliateId.trim() :
            undefined,
        referredByAffiliateCode:
          typeof data.referredByAffiliateCode === "string" ?
            data.referredByAffiliateCode.trim() :
            undefined,
      });
    }
  }
  return existing;
}

function canPromoteToOnboarded(existingStage: LeadStage | undefined): boolean {
  if (!existingStage) return true;
  // Preserve CRM cold/archive overlays.
  if (existingStage === "cold" || existingStage === "archive") return false;
  return (
    existingStage === "registered" ||
    existingStage === "warm" ||
    existingStage === "inquire" ||
    existingStage === "onboarded"
  );
}

async function attachOnboardedSnapshots(
  pipeline: LeadRecord[],
): Promise<LeadRecord[]> {
  const onboarded = pipeline.filter(
    (lead) =>
      lead.stage === "onboarded" &&
      lead.linkedBusinessId &&
      lead.platformSource === "smartrefill",
  );
  if (onboarded.length === 0) return pipeline;

  const byBusiness = new Map<
    string,
    Awaited<ReturnType<typeof loadOnboardedBusinessSnapshot>>
  >();
  await mapWithConcurrency(onboarded, 8, async (lead) => {
    const businessId = lead.linkedBusinessId!;
    if (byBusiness.has(businessId)) return;
    const snap = await loadOnboardedBusinessSnapshot(businessId, lead.userId);
    byBusiness.set(businessId, snap);
  });

  return pipeline.map((lead) => {
    if (!lead.linkedBusinessId || lead.stage !== "onboarded") return lead;
    const snap = byBusiness.get(lead.linkedBusinessId);
    if (!snap) return lead;
    return {
      ...lead,
      ...onboardedSnapshotLeadFields(snap),
      onboardedAt: snap.onboardedAt,
      gettingStartedCompleted: snap.gettingStartedCompleted,
      activityDayCount: snap.activityDayCount,
      lastActiveDay: snap.lastActiveDay,
      lastSignInAt: snap.lastSignInAt,
      subscriptionStatus: snap.subscriptionStatus,
      subscriptionExpiresAt: snap.subscriptionExpiresAt,
      subscriptionChangeType: snap.subscriptionChangeType,
    } as LeadRecord;
  });
}

/**
 * Pull SmartRefill + legacy pipeline leads into riverdb `leads`.
 * - incremental: insert missing only
 * - full: insert missing + update source fields on existing (CRM fields preserved);
 *   promotes registered→onboarded when SmartRefill onboardingComplete (not cold/archive)
 */
export async function gatherLeadsFromSources(
  mode: GatherMode,
): Promise<GatherLeadsSummary> {
  const bundle = await buildSmartRefillPipelineBundle();
  const pipeline = excludeSalesConnectedLeads(bundle.leads, bundle.sales);
  const withSnapshots = await attachOnboardedSnapshots(pipeline);
  const ids = withSnapshots.map((lead) => lead.id);
  const existingMeta = await loadExistingLeadMeta(ids);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const writeChunk = 400;
  for (let i = 0; i < withSnapshots.length; i += writeChunk) {
    const slice = withSnapshots.slice(i, i + writeChunk);
    let batch = db.batch();
    let ops = 0;

    const flush = async () => {
      if (ops === 0) return;
      await batch.commit();
      batch = db.batch();
      ops = 0;
    };

    for (const lead of slice) {
      const ref = db.collection("leads").doc(lead.id);
      const existing = existingMeta.get(lead.id);
      const exists = Boolean(existing);

      if (!exists) {
        batch.set(ref, buildGatherInsertPayload(lead));
        inserted += 1;
        ops += 1;
        existingMeta.set(lead.id, { stage: lead.stage });
      } else if (mode === "full") {
        const promote =
          lead.stage === "onboarded" &&
          canPromoteToOnboarded(existing?.stage) &&
          existing?.stage !== "onboarded";
        batch.set(
          ref,
          buildGatherSourceUpdatePayload(lead, {
            promoteStageToOnboarded: promote,
          }),
          { merge: true },
        );
        // Full gather always refreshes onboarded snapshot when stage is onboarded.
        if (lead.stage === "onboarded" && existing?.stage === "onboarded") {
          // snapshot fields already in payload
        }
        updated += 1;
        ops += 1;
      } else {
        skipped += 1;
      }

      if (ops >= writeChunk) {
        await flush();
      }
    }

    await flush();
  }

  await mapWithConcurrency(withSnapshots, 8, async (lead) => {
    if (lead.stage !== "onboarded") return;
    const existing = existingMeta.get(lead.id);
    await stampPipelineAffiliateOnPayingSubscription({
      linkedBusinessId: lead.linkedBusinessId,
      stage: "onboarded",
      referredByAffiliateId:
        existing?.referredByAffiliateId || lead.referredByAffiliateId,
      referredByAffiliateCode:
        existing?.referredByAffiliateCode || lead.referredByAffiliateCode,
      planCode: lead.planCode || undefined,
      planName: lead.planName || undefined,
      billingCycle: lead.billingCycle || undefined,
      price: typeof lead.price === "number" ? lead.price : undefined,
      accountReady: lead.accountReady,
    });
  });

  return {
    mode,
    scanned: withSnapshots.length,
    inserted,
    updated,
    skipped,
  };
}

/** Midnight batch: full gather so content overlays and onboarded snapshots stay current. */
export async function runScheduledLeadGather(): Promise<GatherLeadsSummary> {
  return gatherLeadsFromSources(SCHEDULED_LEAD_GATHER_MODE);
}
