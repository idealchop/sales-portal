import { describe, expect, it } from "vitest";
import {
  affiliateStampFields,
  pipelineCommissionBumpAmount,
  shouldStampPayingAffiliate,
} from "../../../services/stamp-pipeline-affiliate";

describe("stampPipelineAffiliate", () => {
  it("stamps only onboarded paying Starter–Scale referees with an affiliate", () => {
    expect(
      shouldStampPayingAffiliate({
        stage: "onboarded",
        linkedBusinessId: "biz-1",
        referredByAffiliateCode: "PARTNER10",
        planCode: "grow",
        planName: "Grow",
        billingCycle: "monthly",
        price: 950,
      }),
    ).toBe(true);
    expect(
      shouldStampPayingAffiliate({
        stage: "onboarded",
        linkedBusinessId: "biz-1",
        referredByAffiliateCode: "PARTNER10",
        planCode: "scale",
        planName: "Scale",
        billingCycle: "trial",
        price: 0,
      }),
    ).toBe(false);
    expect(
      shouldStampPayingAffiliate({
        stage: "warm",
        linkedBusinessId: "biz-1",
        referredByAffiliateCode: "PARTNER10",
        planCode: "grow",
        price: 950,
      }),
    ).toBe(false);
  });

  it("normalizes affiliate stamp fields and commission bump", () => {
    expect(
      affiliateStampFields({
        referredByAffiliateCode: "partner10",
        referredByAffiliateId: "affiliate_partner10",
      }),
    ).toEqual({
      affiliateCode: "PARTNER10",
      affiliateDocId: "affiliate_partner10",
    });
    expect(
      pipelineCommissionBumpAmount({
        commissionType: "fixed_per_conversion",
        commissionValue: 200,
        price: 950,
      }),
    ).toBe(200);
    expect(
      pipelineCommissionBumpAmount({
        commissionType: "percentage",
        commissionValue: 10,
        price: 950,
      }),
    ).toBe(95);
  });
});
