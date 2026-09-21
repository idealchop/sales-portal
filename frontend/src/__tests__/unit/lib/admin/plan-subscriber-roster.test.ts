import { describe, expect, it } from "vitest";
import type { UserSubscriptionListItem } from "@/features/dashboard/lib/build-user-subscriptions-list";
import type { OwnerSubscription } from "@/lib/dashboard/analytics";
import {
  catalogAddonMatchKeys,
  catalogCodeForCurrentSubscription,
  currentTrialSubscribers,
  groupCurrentSubscribersByAddonKey,
  groupCurrentSubscribersByCatalogCode,
  groupCurrentSubscribersByOfferKey,
  subscribersForCatalogAddon,
  subscribersForCatalogOffer,
  subscribersForCatalogPlan,
  trialStartedAt,
} from "@/lib/admin/plan-subscriber-roster";

function sub(overrides: Partial<OwnerSubscription>): OwnerSubscription {
  return {
    id: "sub-1",
    planName: "Grow",
    planCode: "grow",
    status: "active",
    price: 950,
    billingCycle: "monthly",
    timeline: "current",
    cancelAtPeriodEnd: false,
    needsApproval: false,
    isDowngrade: false,
    isCancellation: false,
    ...overrides,
  };
}

function item(
  overrides: Partial<UserSubscriptionListItem> & {
    subscription: OwnerSubscription;
  },
): UserSubscriptionListItem {
  return {
    businessId: "biz-1",
    businessName: "Aqua Station",
    ownerEmail: "owner@example.com",
    changeKind: "other",
    activeSubscriptionCount: 1,
    history: [overrides.subscription],
    planSortRank: 1,
    hasPendingPayment: false,
    justPaid: false,
    opsBucket: "paying",
    planTier: "grow",
    isGrace: false,
    isExpired: false,
    isExpiringSoon: false,
    isVoucher: false,
    ...overrides,
  };
}

describe("catalogCodeForCurrentSubscription", () => {
  it("maps unpaid Starter to Free", () => {
    expect(
      catalogCodeForCurrentSubscription(
        sub({ planCode: "starter", planName: "Starter", price: 0 }),
      ),
    ).toBe("free");
  });

  it("keeps paid Starter on Starter", () => {
    expect(
      catalogCodeForCurrentSubscription(
        sub({ planCode: "starter", planName: "Starter", price: 399 }),
      ),
    ).toBe("starter");
  });

  it("maps Scale trial to Scale", () => {
    expect(
      catalogCodeForCurrentSubscription(
        sub({
          planCode: "scale",
          planName: "Scale",
          price: 0,
          billingCycle: "trial",
        }),
      ),
    ).toBe("scale");
  });

  it("maps pro to Grow and keeps Enterprise off Scale", () => {
    expect(
      catalogCodeForCurrentSubscription(sub({ planCode: "pro", planName: "Pro" })),
    ).toBe("grow");
    expect(
      catalogCodeForCurrentSubscription(
        sub({ planCode: "enterprise", planName: "Enterprise", price: 5000 }),
      ),
    ).toBe("enterprise");
  });
});

describe("groupCurrentSubscribersByCatalogCode", () => {
  it("counts current stations per catalog plan and skips ended", () => {
    const grouped = groupCurrentSubscribersByCatalogCode([
      item({
        businessId: "a",
        businessName: "Beta WRS",
        subscription: sub({ planCode: "grow" }),
      }),
      item({
        businessId: "b",
        businessName: "Alpha WRS",
        subscription: sub({ planCode: "grow" }),
      }),
      item({
        businessId: "c",
        businessName: "Closed WRS",
        opsBucket: "ended",
        subscription: sub({ planCode: "grow" }),
      }),
      item({
        businessId: "d",
        businessName: "Free WRS",
        opsBucket: "free",
        planTier: "free",
        subscription: sub({
          planCode: "starter",
          planName: "Starter",
          price: 0,
        }),
      }),
    ]);

    const grow = subscribersForCatalogPlan(grouped, "grow");
    expect(grow.map((row) => row.businessName)).toEqual(["Alpha WRS", "Beta WRS"]);
    expect(subscribersForCatalogPlan(grouped, "free")).toHaveLength(1);
    expect(subscribersForCatalogPlan(grouped, "scale")).toHaveLength(0);
  });
});

describe("groupCurrentSubscribersByAddonKey", () => {
  it("matches catalog add-ons by document id or code and skips ended", () => {
    const grouped = groupCurrentSubscribersByAddonKey([
      item({
        businessId: "a",
        businessName: "Beta WRS",
        subscription: sub({
          addonLineItems: [{ addonId: "addon_ext_rider", quantity: 2 }],
        }),
      }),
      item({
        businessId: "b",
        businessName: "Alpha WRS",
        subscription: sub({
          addonLineItems: [{ code: "EXT_RIDER" }],
        }),
      }),
      item({
        businessId: "c",
        businessName: "Closed WRS",
        opsBucket: "ended",
        subscription: sub({
          addonLineItems: [{ addonId: "addon_ext_rider" }],
        }),
      }),
      item({
        businessId: "d",
        businessName: "AI WRS",
        subscription: sub({
          addonLineItems: [{ addonId: "addon_ext_ai_boost", code: "EXT_AI_BOOST" }],
        }),
      }),
    ]);

    const rider = subscribersForCatalogAddon(
      grouped,
      catalogAddonMatchKeys("addon_ext_rider", { code: "EXT_RIDER" }),
    );
    expect(rider.map((row) => row.businessName)).toEqual(["Alpha WRS", "Beta WRS"]);

    const ai = subscribersForCatalogAddon(
      grouped,
      catalogAddonMatchKeys("addon_ext_ai_boost", { code: "EXT_AI_BOOST" }),
    );
    expect(ai.map((row) => row.businessName)).toEqual(["AI WRS"]);

    expect(
      subscribersForCatalogAddon(
        grouped,
        catalogAddonMatchKeys("addon_ext_business", { code: "EXT_BUSINESS" }),
      ),
    ).toHaveLength(0);
  });
});

describe("groupCurrentSubscribersByOfferKey", () => {
  it("matches vouchers by code and affiliates by code or linked voucher", () => {
    const grouped = groupCurrentSubscribersByOfferKey([
      item({
        businessId: "a",
        businessName: "Beta WRS",
        subscription: sub({ voucherCode: "LAUNCH20" }),
      }),
      item({
        businessId: "b",
        businessName: "Alpha WRS",
        subscription: sub({ voucherCode: "launch20" }),
      }),
      item({
        businessId: "c",
        businessName: "Closed WRS",
        opsBucket: "ended",
        subscription: sub({ voucherCode: "LAUNCH20" }),
      }),
      item({
        businessId: "d",
        businessName: "Partner WRS",
        subscription: sub({
          affiliateCode: "PARTNER10",
          affiliateDocId: "affiliate_partner10",
        }),
      }),
      item({
        businessId: "e",
        businessName: "Linked Voucher WRS",
        subscription: sub({ voucherCode: "PARTNERDEAL" }),
      }),
    ]);

    const voucherStations = subscribersForCatalogOffer(
      grouped,
      { documentId: "voucher_launch20", data: { kind: "voucher", code: "LAUNCH20" } },
    );
    expect(voucherStations.map((row) => row.businessName)).toEqual([
      "Alpha WRS",
      "Beta WRS",
    ]);

    const affiliateStations = subscribersForCatalogOffer(
      grouped,
      {
        documentId: "affiliate_partner10",
        data: { kind: "affiliate", code: "PARTNER10" },
      },
      [
        {
          documentId: "voucher_partnerdeal",
          data: {
            kind: "voucher",
            code: "PARTNERDEAL",
            affiliateDocId: "affiliate_partner10",
          },
        },
      ],
    );
    expect(affiliateStations.map((row) => row.businessName)).toEqual([
      "Linked Voucher WRS",
      "Partner WRS",
    ]);
  });
});

describe("currentTrialSubscribers", () => {
  it("lists live trials by soonest expiry and skips ended trials", () => {
    const now = new Date("2026-09-21T08:00:00");
    const rows = currentTrialSubscribers(
      [
        item({
          businessId: "later",
          businessName: "Later WRS",
          opsBucket: "trial",
          planTier: "trial",
          subscription: sub({
            planCode: "scale",
            planName: "Scale",
            billingCycle: "trial",
            expiresAt: "2026-10-01T00:00:00.000Z",
          }),
        }),
        item({
          businessId: "soon",
          businessName: "Soon WRS",
          opsBucket: "trial",
          planTier: "trial",
          subscription: sub({
            planCode: "scale",
            planName: "Scale",
            billingCycle: "trial",
            expiresAt: "2026-09-22T00:00:00.000Z",
          }),
        }),
        item({
          businessId: "ended",
          businessName: "Ended WRS",
          opsBucket: "trial",
          planTier: "trial",
          subscription: sub({
            planCode: "scale",
            planName: "Scale",
            billingCycle: "trial",
            expiresAt: "2026-09-01T00:00:00.000Z",
          }),
        }),
        item({
          businessId: "paid",
          businessName: "Paid Grow",
          subscription: sub({ planCode: "grow" }),
        }),
      ],
      now,
    );

    expect(rows.map((row) => row.businessName)).toEqual(["Soon WRS", "Later WRS"]);
  });

  it("uses activatedAt then createdAt as the trial start", () => {
    expect(
      trialStartedAt(
        sub({ createdAt: "2026-09-01T00:00:00.000Z", activatedAt: "2026-09-02T00:00:00.000Z" }),
      ),
    ).toBe("2026-09-02T00:00:00.000Z");
  });
});
