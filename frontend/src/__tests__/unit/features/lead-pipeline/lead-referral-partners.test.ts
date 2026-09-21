import { describe, expect, it } from "vitest";
import type { CatalogOfferOption } from "@/lib/admin/catalog-offer-options";
import {
  buildReferralPartnerBoard,
  formatReferralSuccessRate,
  pipelineReferralStatsForOffer,
  pipelineReferralsForOffer,
} from "@/features/lead-pipeline/lib/lead-referral-partners";
import type { Lead } from "@/lib/definitions";

function lead(overrides: Partial<Lead>): Lead {
  return {
    id: "lead-1",
    userId: "u1",
    businessName: "Aqua",
    ownerName: "Jane",
    stage: "warm",
    attemptCount: 0,
    warmAttemptCount: 0,
    coldAttemptCount: 0,
    channels: {
      viber: false,
      email: false,
      messenger: false,
      smsCall: false,
    },
    leadSource: "Referrals",
    ...overrides,
  };
}

const partner: CatalogOfferOption = {
  documentId: "affiliate_partner10",
  kind: "affiliate",
  code: "PARTNER10",
  name: "River partner",
  isActive: true,
  ownerUserId: "owner-1",
};

describe("buildReferralPartnerBoard", () => {
  it("counts success only for onboarded paid Starter–Scale referees", () => {
    const board = buildReferralPartnerBoard(
      [
        lead({
          id: "a",
          referredBy: "Beta WRS",
          referredByClientId: "client-b",
          stage: "onboarded",
          workspace: {
            planName: "Grow",
            planCode: "grow",
            billingCycle: "monthly",
            price: 950,
          },
        }),
        lead({
          id: "b",
          referredBy: "Beta WRS",
          referredByClientId: "client-b",
          stage: "onboarded",
          workspace: {
            planName: "Scale",
            planCode: "scale",
            billingCycle: "monthly",
            price: 1650,
          },
        }),
        lead({
          id: "free",
          referredBy: "Beta WRS",
          referredByClientId: "client-b",
          stage: "onboarded",
          workspace: {
            planName: "Free",
            planCode: "free",
            billingCycle: "monthly",
            price: 0,
          },
        }),
        lead({
          id: "trial",
          referredBy: "Beta WRS",
          referredByClientId: "client-b",
          stage: "onboarded",
          workspace: {
            planName: "Scale",
            planCode: "scale",
            billingCycle: "trial",
            price: 0,
          },
        }),
        lead({
          id: "c",
          referredBy: "One-off",
          referredByUserId: "user-c",
          stage: "registered",
          attendedDemo: "attended",
        }),
        lead({
          id: "d",
          referredBy: "River partner",
          referredByAffiliateId: "affiliate_partner10",
          referredByAffiliateCode: "PARTNER10",
          stage: "warm",
        }),
      ],
      [partner],
    );

    const beta = board.partners.find((row) => row.label === "Beta WRS");
    expect(beta).toMatchObject({
      referred: 4,
      onboarded: 4,
      subscribed: 2,
      successRate: 50,
      recommendation: "make_affiliate",
    });
    expect(
      board.partners.find((row) => row.label === "One-off")?.recommendation,
    ).toBe("thank_you_voucher");
    expect(
      board.partners.find((row) => row.affiliateCode === "PARTNER10"),
    ).toMatchObject({
      recommendation: "already_affiliate",
      referred: 1,
      subscribed: 0,
      successRate: 0,
    });
    expect(board.prospectVouchers.map((row) => row.businessName)).toContain("Aqua");
  });

  it("does not treat unpaid Starter or Free onboarded as subscribed", () => {
    const board = buildReferralPartnerBoard(
      [
        lead({
          id: "starter-free",
          referredBy: "Alpha",
          referredByClientId: "client-a",
          stage: "onboarded",
          workspace: {
            planName: "Starter",
            planCode: "starter",
            billingCycle: "monthly",
            price: 0,
          },
        }),
        lead({
          id: "starter-paid",
          referredBy: "Alpha",
          referredByClientId: "client-a",
          stage: "onboarded",
          workspace: {
            planName: "Starter",
            planCode: "starter",
            billingCycle: "monthly",
            price: 399,
          },
        }),
      ],
      [],
    );

    expect(board.partners[0]).toMatchObject({
      referred: 2,
      onboarded: 2,
      subscribed: 1,
      successRate: 50,
      recommendation: "thank_you_voucher",
    });
    expect(formatReferralSuccessRate(1, 2)).toBe("50%");
    expect(formatReferralSuccessRate(0, 0)).toBe("—");
  });

  it("counts pipeline referrals onto the matching affiliate catalog row", () => {
    const board = buildReferralPartnerBoard(
      [
        lead({
          id: "a",
          referredBy: "River partner",
          referredByAffiliateCode: "PARTNER10",
        }),
      ],
      [partner],
    );
    expect(
      pipelineReferralsForOffer(board.partners, {
        documentId: "affiliate_partner10",
        code: "PARTNER10",
        kind: "affiliate",
      }),
    ).toBe(1);
    expect(
      pipelineReferralStatsForOffer(board.partners, {
        documentId: "affiliate_partner10",
        code: "PARTNER10",
        kind: "affiliate",
      }),
    ).toEqual({
      referred: 1,
      subscribed: 0,
      successRate: 0,
    });
  });
});
