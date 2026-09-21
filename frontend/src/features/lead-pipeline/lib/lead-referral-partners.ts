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
  email?: string;
  referred: number;
  onboarded: number;
  subscribed: number;
  payoutEligible: number;
  successRate: number | null;
  accountReady: number;
  demoAttended: number;
  stillOpen: number;
  contentAttributed: boolean;
  recommendation: ReferralPartnerRecommendation;
  reason: string;
};

export type ProspectVoucherRow = {
  leadId: string;
  businessName: string;
  referredBy: string;
  stage: string;
  email?: string;
  reason: string;
  kind: "checkout_referral" | "close_deal";
};

function isReferralLead(lead: Lead): boolean {
  if (lead.leadSource?.trim() === "Referrals") return true;
  return Boolean(
    lead.referredBy?.trim() ||
      lead.referredByAffiliateId?.trim() ||
      lead.contentReferrer?.trim(),
  );
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

/** Onboarded + account-ready, or already paying — counts toward affiliate payout. */
export function isPayoutEligibleReferral(lead: Lead): boolean {
  if (lead.stage !== "onboarded") return false;
  if (lead.accountReady === true || lead.workspace?.accountReady === true) {
    return true;
  }
  return isSuccessfulReferral(lead);
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

export function suggestPartnerCode(label: string): string {
  const slug = label.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase().slice(0, 12);
  return slug || "PARTNER";
}

export function isStalledWarmDemoLead(
  lead: Lead,
  nowMs: number = Date.now(),
): boolean {
  if (lead.stage !== "warm") return false;
  if (!demoAttended(lead) || lead.accountReady) return false;
  if (lead.stallReason?.trim()) return true;
  const warmStatus = lead.warmStatus?.trim().toLowerCase() || "";
  if (
    warmStatus.includes("decision pending") ||
    warmStatus.includes("no response") ||
    warmStatus.includes("stalled")
  ) {
    return true;
  }
  if ((lead.warmAttemptCount ?? 0) >= 2) return true;
  if (lead.nextFollowUpAt) {
    const due = Date.parse(lead.nextFollowUpAt);
    if (Number.isFinite(due) && due < nowMs) return true;
  }
  return false;
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
  const referrerEmail = lead.referredByEmail?.trim().toLowerCase();
  if (referrerEmail) {
    const byEmail = affiliates.find((row) => row.contactEmail === referrerEmail);
    if (byEmail) return byEmail;
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
  const content = lead.contentReferrer?.trim().toLowerCase();
  if (content) return `content:${content}`;
  return "unknown";
}

function partnerLabel(lead: Lead, affiliate?: CatalogOfferOption): string {
  return (
    affiliate?.name ||
    lead.referredBy?.trim() ||
    lead.contentReferrer?.trim() ||
    affiliate?.code ||
    "Unknown referrer"
  );
}

function lookupReferrerEmail(lead: Lead, allLeads: Lead[]): string | undefined {
  const direct = lead.referredByEmail?.trim().toLowerCase();
  if (direct) return direct;
  const userId = lead.referredByUserId?.trim();
  if (!userId) return undefined;
  const owner = allLeads.find(
    (row) => row.userId === userId && row.email?.trim(),
  );
  return owner?.email?.trim().toLowerCase() || undefined;
}

function recommendPartner(row: {
  affiliateId?: string;
  subscribed: number;
  payoutEligible: number;
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
  if (row.payoutEligible >= 2 && row.subscribed >= 1) {
    return {
      recommendation: "make_affiliate",
      reason:
        "Two or more onboarded/account-ready referees, including a paid plan. Ready for a partner code.",
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
        "Referral reached demo or onboard, but not a paid Starter–Scale plan yet (Free/trial do not count as subscribed).",
    };
  }
  return {
    recommendation: "watch",
    reason:
      "Referral is logged. Wait for onboard + a paid Starter–Scale plan before rewarding.",
  };
}

export function buildReferralPartnerBoard(
  leads: Lead[],
  affiliates: CatalogOfferOption[] = [],
  nowMs: number = Date.now(),
): {
  partners: ReferralPartnerRow[];
  prospectVouchers: ProspectVoucherRow[];
  closeDealProspects: ProspectVoucherRow[];
} {
  const grouped = new Map<
    string,
    {
      label: string;
      affiliate?: CatalogOfferOption;
      clientId?: string;
      userId?: string;
      email?: string;
      contentAttributed: boolean;
      leads: Lead[];
    }
  >();

  for (const lead of leads) {
    if (!isReferralLead(lead)) continue;
    const affiliate = matchLeadAffiliate(lead, affiliates);
    const key = partnerKey(lead, affiliate);
    if (key === "unknown") continue;
    const email = lookupReferrerEmail(lead, leads) || affiliate?.contactEmail;
    const existing = grouped.get(key);
    if (existing) {
      existing.leads.push(lead);
      if (!existing.affiliate && affiliate) existing.affiliate = affiliate;
      if (!existing.email && email) existing.email = email;
      if (lead.contentReferrer?.trim()) existing.contentAttributed = true;
      continue;
    }
    grouped.set(key, {
      label: partnerLabel(lead, affiliate),
      affiliate,
      clientId: lead.referredByClientId?.trim() || undefined,
      userId: lead.referredByUserId?.trim() || affiliate?.ownerUserId,
      email,
      contentAttributed: Boolean(lead.contentReferrer?.trim()),
      leads: [lead],
    });
  }

  const partners: ReferralPartnerRow[] = [...grouped.entries()].map(
    ([key, group]) => {
      const onboarded = group.leads.filter((lead) => lead.stage === "onboarded")
        .length;
      const subscribed = group.leads.filter(isSuccessfulReferral).length;
      const payoutEligible = group.leads.filter(isPayoutEligibleReferral).length;
      const accountReady = group.leads.filter((lead) => lead.accountReady === true)
        .length;
      const demoCount = group.leads.filter(demoAttended).length;
      const stillOpen = group.leads.filter(
        (lead) => isOpenProspect(lead) && !lead.accountReady,
      ).length;
      const scored = recommendPartner({
        affiliateId: group.affiliate?.documentId,
        subscribed,
        payoutEligible,
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
        email: group.email,
        referred: group.leads.length,
        onboarded,
        subscribed,
        payoutEligible,
        successRate: referralSuccessRate(subscribed, group.leads.length),
        accountReady,
        demoAttended: demoCount,
        stillOpen,
        contentAttributed: group.contentAttributed,
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
      b.payoutEligible - a.payoutEligible ||
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
      referredBy:
        lead.referredBy?.trim() || lead.contentReferrer?.trim() || "Referral",
      stage: lead.stage,
      email: lead.email,
      kind: "checkout_referral" as const,
      reason:
        demoAttended(lead) ?
          "Referred in and attended demo — a checkout voucher can close them."
        : "Referred in and already registered — a checkout voucher can convert them to paid.",
    }));

  const closeDealIds = new Set(prospectVouchers.map((row) => row.leadId));
  const closeDealProspects: ProspectVoucherRow[] = leads
    .filter((lead) => isStalledWarmDemoLead(lead, nowMs))
    .filter((lead) => !closeDealIds.has(lead.id))
    .map((lead) => ({
      leadId: lead.id,
      businessName: lead.businessName,
      referredBy:
        lead.referredBy?.trim() || lead.contentReferrer?.trim() || "No referrer",
      stage: lead.stage,
      email: lead.email,
      kind: "close_deal" as const,
      reason:
        "Warm, attended demo, and stalled — a close-the-deal voucher can convert them even without a referrer.",
    }));

  return { partners, prospectVouchers, closeDealProspects };
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
): {
  referred: number;
  subscribed: number;
  payoutEligible: number;
  successRate: number | null;
} {
  const matched = matchingPartnersForOffer(partners, offer);
  const referred = matched.reduce((sum, row) => sum + row.referred, 0);
  const subscribed = matched.reduce((sum, row) => sum + row.subscribed, 0);
  const payoutEligible = matched.reduce(
    (sum, row) => sum + row.payoutEligible,
    0,
  );
  return {
    referred,
    subscribed,
    payoutEligible,
    successRate: referralSuccessRate(subscribed, referred),
  };
}

export function pipelineReferralsForOffer(
  partners: ReferralPartnerRow[],
  offer: { documentId: string; code?: string; kind?: string },
): number {
  return pipelineReferralStatsForOffer(partners, offer).referred;
}
