import { db, FieldValue } from "../config/firebase-admin";
import { isPaidSubscribedPlan } from "../utils/subscription-plan-codes";
import { loadOnboardedBusinessSnapshot } from "./load-onboarded-snapshot";

export type PipelineAffiliateStampInput = {
  linkedBusinessId?: string | null;
  stage?: string;
  referredByAffiliateId?: string | null;
  referredByAffiliateCode?: string | null;
  planCode?: string | null;
  planName?: string | null;
  billingCycle?: string | null;
  price?: number | null;
  accountReady?: boolean;
};

export function shouldStampPayingAffiliate(
  input: PipelineAffiliateStampInput,
): boolean {
  if (input.stage !== "onboarded") return false;
  const code = input.referredByAffiliateCode?.trim();
  const id = input.referredByAffiliateId?.trim();
  if (!code && !id) return false;
  if (!input.linkedBusinessId?.trim()) return false;
  return isPaidSubscribedPlan({
    planCode: input.planCode,
    planName: input.planName,
    billingCycle: input.billingCycle,
    price: input.price,
  });
}

export function affiliateStampFields(input: PipelineAffiliateStampInput): {
  affiliateCode: string;
  affiliateDocId?: string;
} {
  const affiliateCode = (input.referredByAffiliateCode || "").trim().toUpperCase();
  const affiliateDocId = input.referredByAffiliateId?.trim() || undefined;
  return { affiliateCode, affiliateDocId };
}

export function pipelineCommissionBumpAmount(input: {
  commissionType?: string | null;
  commissionValue?: number | null;
  price?: number | null;
}): number {
  const value = Number(input.commissionValue ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (String(input.commissionType || "") === "fixed_per_conversion") {
    return value;
  }
  const price = Number(input.price ?? 0);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.round((price * value) / 100);
}

/**
 * Copy pipeline affiliate onto the current paying subscription so catalog
 * Stations match Insights. Does not overwrite a checkout-stamped code.
 */
export async function stampPipelineAffiliateOnPayingSubscription(
  input: PipelineAffiliateStampInput,
): Promise<{ stamped: boolean }> {
  if (!shouldStampPayingAffiliate(input)) return { stamped: false };
  const businessId = input.linkedBusinessId!.trim();
  const snapshot = await loadOnboardedBusinessSnapshot(businessId);
  const subscriptionId = snapshot?.currentSubscriptionId;
  if (!subscriptionId) return { stamped: false };

  const subRef = db
    .collection("businesses")
    .doc(businessId)
    .collection("subscriptions")
    .doc(subscriptionId);
  const subSnap = await subRef.get();
  if (!subSnap.exists) return { stamped: false };
  const data = (subSnap.data() ?? {}) as Record<string, unknown>;
  const meta =
    data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata) ?
      (data.metadata as Record<string, unknown>) :
      {};
  const existingCode = String(data.affiliateCode || meta.affiliateCode || "").trim();
  if (existingCode) return { stamped: false };

  const fields = affiliateStampFields(input);
  if (!fields.affiliateCode && !fields.affiliateDocId) return { stamped: false };

  await subRef.set(
    {
      affiliateCode: fields.affiliateCode || null,
      affiliateDocId: fields.affiliateDocId || null,
      metadata: {
        ...meta,
        affiliateCode: fields.affiliateCode || null,
        affiliateDocId: fields.affiliateDocId || null,
        affiliateSource: "lead_pipeline",
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const affiliateId =
    fields.affiliateDocId ||
    (fields.affiliateCode ? `affiliate_${fields.affiliateCode.toLowerCase()}` : "");
  if (affiliateId) {
    const offerRef = db.collection("vouchers_affiliates").doc(affiliateId);
    const offerSnap = await offerRef.get();
    if (offerSnap.exists) {
      const offer = (offerSnap.data() ?? {}) as Record<string, unknown>;
      const bump = pipelineCommissionBumpAmount({
        commissionType: String(offer.commissionType || ""),
        commissionValue: Number(offer.commissionValue ?? 0),
        price: input.price,
      });
      await offerRef.set(
        {
          conversionCount: FieldValue.increment(1),
          pendingCommissionAmount: FieldValue.increment(bump),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  return { stamped: true };
}
