import { db, FieldValue, Timestamp } from "../config/firebase-admin";
import { isCatalogLiveForNewSales } from "../utils/catalog-publication";

/** This roster is SmartRefill workspace trials in riverdb. */
export const SMARTREFILL_TRIAL_APP_LABEL = "Smart Refill";

const OVERWRITE_PLAN_CODES = new Set([
  "free",
  "starter",
  "grow",
  "scale",
  "enterprise",
]);

export function assertOverwritePlanCode(planCode: string): string {
  const code = planCode.trim().toLowerCase();
  if (!OVERWRITE_PLAN_CODES.has(code)) {
    throw new Error("PLAN_NOT_ALLOWED");
  }
  return code;
}

export function assertOverwriteNote(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length < 8) {
    throw new Error("NOTE_REQUIRED");
  }
  return trimmed;
}

export function monthlyPriceFromPlan(data: Record<string, unknown>): number {
  const pricing =
    data.pricing && typeof data.pricing === "object" && !Array.isArray(data.pricing) ?
      (data.pricing as { monthly?: unknown })
    : null;
  const monthly = Number(pricing?.monthly);
  return Number.isFinite(monthly) && monthly > 0 ? monthly : 0;
}

export function parseTrialEnd(expiresAt: string, now = new Date()): Date {
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_EXPIRY");
  }
  if (parsed.getTime() < now.getTime() - 60_000) {
    throw new Error("EXPIRY_IN_PAST");
  }
  return parsed;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function subscriptionOverwritePatch(input: {
  planCode: string;
  planId: string;
  planName: string;
  price: number;
  limitations: unknown;
  capabilities: unknown;
  expiresAt: Date;
  note: string;
  previousPlanCode?: string;
  previousBillingCycle?: string;
  catalogPublishedAt?: string | null;
  catalogEffectiveAt?: string | null;
  actorUid: string;
  now?: Date;
}): Record<string, unknown> {
  const now = input.now ?? new Date();
  const expiresAt = Timestamp.fromDate(input.expiresAt);
  const patch: Record<string, unknown> = {
    planId: input.planId,
    planCode: input.planCode,
    planName: input.planName,
    status: "active",
    billingCycle: "monthly",
    price: input.price,
    paymentStatus: "manual",
    planLimitationsSnapshot: asRecord(input.limitations),
    catalogPublishedAt: input.catalogPublishedAt || now.toISOString(),
    catalogEffectiveAt: input.catalogEffectiveAt || now.toISOString(),
    "dates.expiresAt": expiresAt,
    "dates.renewalAt": expiresAt,
    "dates.gracePeriodExpiresAt": expiresAt,
    "metadata.changeType": "override",
    "metadata.overrideNote": input.note,
    "metadata.overrideBy": input.actorUid,
    "metadata.overrideAt": now.toISOString(),
    "metadata.previousPlanCode": input.previousPlanCode || "",
    "metadata.previousBillingCycle": input.previousBillingCycle || "trial",
    "metadata.trialState": "converted",
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.capabilities && typeof input.capabilities === "object") {
    patch.planCapabilitiesSnapshot = input.capabilities;
  }
  return patch;
}

function planCodeOf(data: Record<string, unknown>, documentId: string): string {
  return String(data.code || documentId).trim().toLowerCase();
}

async function loadTrialablePlan(planCode: string): Promise<{
  id: string;
  data: Record<string, unknown>;
}> {
  const snap = await db.collection("subscription_plans").get();
  const matches = snap.docs.filter(
    (doc) => planCodeOf(doc.data() ?? {}, doc.id) === planCode,
  );
  const live = matches.find((doc) => isCatalogLiveForNewSales(doc.data() ?? {}));
  const chosen = live ?? matches[0];
  if (!chosen) {
    throw new Error("PLAN_NOT_FOUND");
  }
  return { id: chosen.id, data: chosen.data() ?? {} };
}

export async function updateLiveTrialSubscription(input: {
  businessId: string;
  subscriptionId: string;
  planCode: string;
  expiresAt: string;
  note: string;
  actorUid: string;
}): Promise<{
  planCode: string;
  planName: string;
  expiresAt: string;
  billingCycle: "monthly";
  price: number;
}> {
  const planCode = assertOverwritePlanCode(input.planCode);
  const note = assertOverwriteNote(input.note);
  const expiresAt = parseTrialEnd(input.expiresAt);
  const ref = db
    .collection("businesses")
    .doc(input.businessId)
    .collection("subscriptions")
    .doc(input.subscriptionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("SUBSCRIPTION_NOT_FOUND");
  }
  const current = snap.data() ?? {};
  const status = String(current.status || "");
  if (["superseded", "expired", "cancelled", "canceled"].includes(status)) {
    throw new Error("SUBSCRIPTION_NOT_EDITABLE");
  }

  const plan = await loadTrialablePlan(planCode);
  const planName = String(plan.data.name || planCode);
  const price = planCode === "free" ? 0 : monthlyPriceFromPlan(plan.data);
  const publishedAt =
    typeof plan.data.publishedAt === "string" ? plan.data.publishedAt : null;
  const effectiveAt =
    typeof plan.data.effectiveAt === "string" ? plan.data.effectiveAt : null;

  await ref.update(
    subscriptionOverwritePatch({
      planCode,
      planId: plan.id,
      planName,
      price,
      limitations: plan.data.limitations,
      capabilities: plan.data.capabilities,
      expiresAt,
      note,
      previousPlanCode: String(current.planCode || ""),
      previousBillingCycle: String(current.billingCycle || "trial"),
      catalogPublishedAt: publishedAt,
      catalogEffectiveAt: effectiveAt,
      actorUid: input.actorUid,
    }),
  );

  return {
    planCode,
    planName,
    expiresAt: expiresAt.toISOString(),
    billingCycle: "monthly",
    price,
  };
}

export async function extendLiveSubscription(input: {
  businessId: string;
  subscriptionId: string;
  expiresAt: string;
  actorUid: string;
}): Promise<{ expiresAt: string }> {
  const expiresAt = parseTrialEnd(input.expiresAt);
  const ref = db
    .collection("businesses")
    .doc(input.businessId)
    .collection("subscriptions")
    .doc(input.subscriptionId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("SUBSCRIPTION_NOT_FOUND");
  }
  const current = snap.data() ?? {};
  const status = String(current.status || "");
  if (["superseded", "expired", "cancelled", "canceled"].includes(status)) {
    throw new Error("SUBSCRIPTION_NOT_EDITABLE");
  }

  const expiresStamp = Timestamp.fromDate(expiresAt);
  const patch: Record<string, unknown> = {
    "dates.expiresAt": expiresStamp,
    "dates.renewalAt": expiresStamp,
    "dates.gracePeriodExpiresAt": expiresStamp,
    "metadata.extendedBy": input.actorUid,
    "metadata.extendedAt": new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (String(current.billingCycle || "").toLowerCase() === "trial") {
    patch["metadata.trialBudgetExpiresAt"] = expiresAt.toISOString();
    patch["metadata.trialState"] = "running";
  }
  await ref.update(patch);
  return { expiresAt: expiresAt.toISOString() };
}
