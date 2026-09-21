import { describe, expect, it } from "vitest";
import {
  buildAffiliatePromoteDraft,
  buildVoucherPromoteDraft,
  filterPromoteOffers,
  parsePromoteOffers,
} from "@/features/lead-pipeline/lib/lead-promote-offer";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

function doc(
  id: string,
  data: Record<string, unknown>,
): UserFirestoreDocumentRow {
  return { documentId: id, data };
}

describe("lead promote offer helpers", () => {
  const documents = [
    doc("voucher_SAVE20", {
      kind: "voucher",
      code: "SAVE20",
      name: "Twenty off",
      isActive: true,
      discountType: "percentage",
      discountValue: 20,
      validUntil: "2026-12-31T00:00:00.000Z",
      applicablePlanCodes: ["starter", "grow"],
    }),
    doc("affiliate_ANA", {
      kind: "affiliate",
      code: "ANA",
      name: "Ana Partner",
      isActive: true,
      commissionType: "percentage",
      commissionValue: 10,
      contactEmail: "ana@partner.com",
    }),
    doc("voucher_OLD", {
      kind: "voucher",
      code: "OLD",
      name: "Expired",
      isActive: false,
      discountType: "fixed_amount",
      discountValue: 100,
    }),
  ];

  it("parses catalog offers", () => {
    const offers = parsePromoteOffers(documents);
    expect(offers.map((row) => row.code)).toEqual(["ANA", "SAVE20", "OLD"]);
    expect(offers[1]?.offerLine).toBe("20% off");
  });

  it("filters by kind and active", () => {
    const offers = parsePromoteOffers(documents);
    expect(filterPromoteOffers(offers, "voucher").map((r) => r.code)).toEqual([
      "SAVE20",
    ]);
    expect(
      filterPromoteOffers(offers, "voucher", { activeOnly: false }).map(
        (r) => r.code,
      ),
    ).toEqual(["SAVE20", "OLD"]);
  });

  it("builds voucher and affiliate drafts", () => {
    const offers = parsePromoteOffers(documents);
    const voucher = offers.find((row) => row.code === "SAVE20")!;
    const affiliate = offers.find((row) => row.code === "ANA")!;
    const voucherDraft = buildVoucherPromoteDraft(voucher);
    expect(voucherDraft.subject).toContain("SAVE20");
    expect(voucherDraft.bodyText).toContain("Use code: SAVE20");
    expect(voucherDraft.bodyText).toContain("{{firstName}}");
    const affiliateDraft = buildAffiliatePromoteDraft(affiliate);
    expect(affiliateDraft.subject).toContain("ANA");
    expect(affiliateDraft.bodyText).toContain("partner code");
  });
});
