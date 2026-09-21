import type { CatalogOfferOption } from "@/lib/admin/catalog-offer-options";
import type { Lead } from "@/lib/definitions";
import { normalizeDemoStatus } from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { isPaidSubscribedPlan } from "@/lib/dashboard/subscription-plan-codes";

export type ReferralPartnerRecommendation =
  | "already_affiliate"
  | "make_affiliate"
  | "thank_you_voucher"
  | "watch";

export type ReferralPartnerRow = {
  key: string;
  label: string;
  affiliateId?: string;
  affiliateCode?: string;
  clientId?: string;
  userId?: string;
  referred: number;
  onboarded: number;
  subscribed: number;
  successRate: number | null;
  accountReady: number;
  demoAttended: number;
  stillOpen: number;
  recommendation: ReferralPartnerRecommendation;
  reason: string;
};

export type ProspectVoucherRow = {
  leadId: string;
  businessName: string;
  referredBy: string;
  stage: string;
  reason: string;
};

function isReferralLead(lead: Lead): boolean {
  if (lead.leadSource?.trim() === "Referrals") return true;
  return Boolean(lead.referredBy?.trim() || lead.referredByAffiliateId?.trim());
}

function demoAttended(lead: Lead): boolean {
  return normalizeDemoStatus(lead.attendedDemo) === "attended";
}

function isOpenProspect(lead: Lead): boolean {
  return (
    lead.stage === "inquire" ||
    lead.stage === "warm" ||
    lead.stage === "registered"
  );
}

export function isSuccessfulReferral(lead: Lead): boolean {
  if (lead.stage !== "onboarded") return false;
  return isPaidSubscribedPlan({
    planCode: lead.workspace?.planCode,
    planName: lead.workspace?.planName,
    billingCycle: lead.workspace?.billingCycle,
    price: lead.workspace?.price,
  });
}

export function referralSuccessRate(
  subscribed: number,
  referred: number,
): number | null {
  if (referred <= 0) return null;
  return Math.round((subscribed / referred) * 100);
}

export function formatReferralSuccessRate(
  subscribed: number,
  referred: number,
): string {
  const rate = referralSuccessRate(subscribed, referred);
  if (rate === null) return "—";
  return `${rate}%`;
}

export function matchLeadAffiliate(
  lead: Lead,
  affiliates: CatalogOfferOption[],
): CatalogOfferOption | undefined {
  const affiliateId = lead.referredByAffiliateId?.trim();
  if (affiliateId) {
    const byId = affiliates.find((row) => row.documentId === affiliateId);
    if (byId) return byId;
  }
  const code = lead.referredByAffiliateCode?.trim().toUpperCase();
  if (code) {
    const byCode = affiliates.find((row) => row.code.toUpperCase() === code);
    if (byCode) return byCode;
  }
  const userId = lead.referredByUserId?.trim();
  if (userId) {
    const byUser = affiliates.find((row) => row.ownerUserId === userId);
    if (byUser) return byUser;
  }
  return undefined;
}

function partnerKey(lead: Lead, affiliate?: CatalogOfferOption): string {
  if (affiliate) return `affiliate:${affiliate.documentId}`;
  const clientId = lead.referredByClientId?.trim();
  if (clientId) return `client:${clientId}`;
  const userId = lead.referredByUserId?.trim();
  if (userId) return `user:${userId}`;
  const label = lead.referredBy?.trim().toLowerCase();
  if (label) return `label:${label}`;
  return "unknown";
}

function recommendPartner(row: {
  affiliateId?: string;
  subscribed: number;
  onboarded: number;
  demoAttended: number;
}): { recommendation: ReferralPartnerRecommendation; reason: string } {
  if (row.affiliateId) {
    return {
      recommendation: "already_affiliate",
      reason: "Already has a partner code in Vouchers & affiliates.",
    };
  }
  if (row.subscribed >= 2) {
    return {
      recommendation: "make_affiliate",
      reason:
        "Brought 2+ referees who onboarded on a paid Starter–Scale plan. Ready for a partner code.",
    };
  }
  if (row.subscribed >= 1) {
    return {
      recommendation: "thank_you_voucher",
      reason:
        "One paid subscribed referee so far. A thank-you voucher is enough until they repeat.",
    };
  }
  if (row.onboarded >= 1 || row.demoAttended >= 1) {
    return {
      recommendation: "thank_you_voucher",
      reason:
        "Referral reached demo or onboard, but not a paid Starter–Scale plan yet (Free/trial do not count).",
    };
  }
  return {
    recommendation: "watch",
    reason: "Referral is logged. Wait for onboard + a paid Starter–Scale plan before rewarding.",
  };
}

export function buildReferralPartnerBoard(
  leads: Lead[],
  affiliates: CatalogOfferOption[] = [],
): {
  partners: ReferralPartnerRow[];
  prospectVouchers: ProspectVoucherRow[];
} {
  const grouped = new Map<
    string,
    {
      label: string;
      affiliate?: CatalogOfferOption;
      clientId?: string;
      userId?: string;
      leads: Lead[];
    }
  >();

  for (const lead of leads) {
    if (!isReferralLead(lead)) continue;
    const affiliate = matchLeadAffiliate(lead, affiliates);
    const key = partnerKey(lead, affiliate);
    if (key === "unknown") continue;
    const existing = grouped.get(key);
    if (existing) {
      existing.leads.push(lead);
      if (!existing.affiliate && affiliate) existing.affiliate = affiliate;
      continue;
    }
    grouped.set(key, {
      label:
        affiliate?.name ||
        lead.referredBy?.trim() ||
        affiliate?.code ||
        "Unknown referrer",
      affiliate,
      clientId: lead.referredByClientId?.trim() || undefined,
      userId: lead.referredByUserId?.trim() || affiliate?.ownerUserId,
      leads: [lead],
    });
  }

  const partners: ReferralPartnerRow[] = [...grouped.entries()].map(
    ([key, group]) => {
      const onboarded = group.leads.filter((lead) => lead.stage === "onboarded")
        .length;
      const subscribed = group.leads.filter(isSuccessfulReferral).length;
      const accountReady = group.leads.filter((lead) => lead.accountReady === true)
        .length;
      const demoCount = group.leads.filter(demoAttended).length;
      const stillOpen = group.leads.filter(
        (lead) => isOpenProspect(lead) && !lead.accountReady,
      ).length;
      const scored = recommendPartner({
        affiliateId: group.affiliate?.documentId,
        subscribed,
        onboarded,
        demoAttended: demoCount,
      });
      return {
        key,
        label: group.label,
        affiliateId: group.affiliate?.documentId,
        affiliateCode: group.affiliate?.code,
        clientId: group.clientId,
        userId: group.userId,
        referred: group.leads.length,
        onboarded,
        subscribed,
        successRate: referralSuccessRate(subscribed, group.leads.length),
        accountReady,
        demoAttended: demoCount,
        stillOpen,
        recommendation: scored.recommendation,
        reason: scored.reason,
      };
    },
  );

  const rank: Record<ReferralPartnerRecommendation, number> = {
    make_affiliate: 0,
    thank_you_voucher: 1,
    already_affiliate: 2,
    watch: 3,
  };
  partners.sort(
    (a, b) =>
      rank[a.recommendation] - rank[b.recommendation] ||
      (b.successRate ?? -1) - (a.successRate ?? -1) ||
      b.subscribed - a.subscribed ||
      b.referred - a.referred ||
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );

  const prospectVouchers: ProspectVoucherRow[] = leads
    .filter((lead) => {
      if (!isReferralLead(lead)) return false;
      if (!isOpenProspect(lead) || lead.accountReady) return false;
      return demoAttended(lead) || lead.stage === "registered";
    })
    .map((lead) => ({
      leadId: lead.id,
      businessName: lead.businessName,
      referredBy: lead.referredBy?.trim() || "Referral",
      stage: lead.stage,
      reason:
        demoAttended(lead) ?
          "Referred in and attended demo — a checkout voucher can close them."
        : "Referred in and already registered — a checkout voucher can convert them to paid.",
    }));

  return { partners, prospectVouchers };
}

function matchingPartnersForOffer(
  partners: ReferralPartnerRow[],
  offer: { documentId: string; code?: string },
): ReferralPartnerRow[] {
  const code = offer.code?.trim().toUpperCase();
  return partners.filter(
    (row) =>
      row.affiliateId === offer.documentId ||
      (code && row.affiliateCode?.toUpperCase() === code),
  );
}

export function pipelineReferralStatsForOffer(
  partners: ReferralPartnerRow[],
  offer: { documentId: string; code?: string; kind?: string },
): { referred: number; subscribed: number; successRate: number | null } {
  const matched = matchingPartnersForOffer(partners, offer);
  const referred = matched.reduce((sum, row) => sum + row.referred, 0);
  const subscribed = matched.reduce((sum, row) => sum + row.subscribed, 0);
  return {
    referred,
    subscribed,
    successRate: referralSuccessRate(subscribed, referred),
  };
}

export function pipelineReferralsForOffer(
  partners: ReferralPartnerRow[],
  offer: { documentId: string; code?: string; kind?: string },
): number {
  return pipelineReferralStatsForOffer(partners, offer).referred;
}
