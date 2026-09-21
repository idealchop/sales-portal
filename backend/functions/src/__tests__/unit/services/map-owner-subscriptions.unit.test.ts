import { describe, expect, it } from "vitest";
import {
  mapOwnerSubscriptions,
  pickLatestCurrentPlanSubscription,
  pickLatestLivePaidSubscription,
} from "../../../services/map-owner-subscriptions";

describe("mapOwnerSubscriptions", () => {
  it("classifies current, future, and past rows", () => {
    const now = Date.now();
    const future = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    const past = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

    const rows = mapOwnerSubscriptions([
      {
        id: "past-sub",
        data: () => ({
          planName: "Starter",
          status: "superseded",
          price: 0,
          createdAt: { _seconds: Math.floor(new Date(past).getTime() / 1000) },
        }),
      },
      {
        id: "current-sub",
        data: () => ({
          planName: "Scale",
          status: "active",
          paymentStatus: "verified",
          price: 1650,
          billingCycle: "monthly",
          createdAt: { _seconds: Math.floor(now / 1000) },
          dates: { expiresAt: { _seconds: Math.floor((now + 86400000) / 1000) } },
        }),
      },
      {
        id: "future-sub",
        data: () => ({
          planName: "Scale",
          status: "scheduled",
          paymentStatus: "pending_verification",
          price: 1949,
          createdAt: { _seconds: Math.floor(now / 1000) },
          dates: { activatesAt: { _seconds: Math.floor(new Date(future).getTime() / 1000) } },
          metadata: { changeType: "downgrade", downgradeReasonCode: "too_expensive" },
        }),
      },
    ]);

    expect(rows.find((row) => row.id === "current-sub")?.timeline).toBe("current");
    expect(rows.find((row) => row.id === "future-sub")?.timeline).toBe("future");
    expect(rows.find((row) => row.id === "past-sub")?.timeline).toBe("past");
    expect(rows.find((row) => row.id === "future-sub")?.needsApproval).toBe(true);
    expect(rows.find((row) => row.id === "future-sub")?.isDowngrade).toBe(true);
  });

  it("maps ISO string timestamps from newer subscription documents", () => {
    const activatedAt = "2026-06-09T06:41:13.448Z";
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const rows = mapOwnerSubscriptions([
      {
        id: "renewal-sub",
        data: () => ({
          planName: "Scale",
          planCode: "scale",
          status: "active",
          paymentStatus: "approved",
          price: 1650,
          billingCycle: "monthly",
          createdAt: activatedAt,
          dates: {
            activatedAt,
            expiresAt,
          },
        }),
      },
    ]);

    expect(rows[0]?.createdAt).toBe(activatedAt);
    expect(rows[0]?.activatedAt).toBe(activatedAt);
    expect(rows[0]?.expiresAt).toBe(expiresAt);
    expect(rows[0]?.timeline).toBe("current");
  });

  it("marks date-expired active subscriptions as past", () => {
    const now = Date.now();
    const expiredAt = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();

    const rows = mapOwnerSubscriptions([
      {
        id: "stale-sub",
        data: () => ({
          planName: "Scale",
          status: "active",
          paymentStatus: "verified",
          price: 1650,
          billingCycle: "monthly",
          createdAt: { _seconds: Math.floor((now - 60 * 86400000) / 1000) },
          dates: { expiresAt: { _seconds: Math.floor(new Date(expiredAt).getTime() / 1000) } },
        }),
      },
      {
        id: "renewal-sub",
        data: () => ({
          planName: "Scale",
          status: "pending",
          paymentStatus: "pending_verification",
          price: 1650,
          billingCycle: "monthly",
          createdAt: { _seconds: Math.floor(now / 1000) },
          dates: {
            activatesAt: { _seconds: Math.floor(now / 1000) },
            expiresAt: { _seconds: Math.floor((now + 30 * 86400000) / 1000) },
          },
          metadata: { changeType: "renew" },
        }),
      },
    ]);

    expect(rows.find((row) => row.id === "stale-sub")?.timeline).toBe("past");
    expect(rows.find((row) => row.id === "renewal-sub")?.timeline).toBe("current");
  });

  it("maps payment proof fields from subscription documents", () => {
    const rows = mapOwnerSubscriptions([
      {
        id: "proof-sub",
        data: () => ({
          planName: "Scale",
          status: "pending",
          paymentStatus: "pending_verification",
          paymentReference: "PAY-123",
          paymentMethod: "gcash",
          receiptUrl: "https://example.com/receipt.jpg",
          price: 1650,
        }),
      },
    ]);

    expect(rows[0]?.paymentReference).toBe("PAY-123");
    expect(rows[0]?.paymentMethod).toBe("gcash");
    expect(rows[0]?.receiptUrl).toBe("https://example.com/receipt.jpg");
  });

  it("picks the newest active paid plan over pending renewals", () => {
    const now = Date.now();
    const rows = mapOwnerSubscriptions([
      {
        id: "old-active-custom",
        data: () => ({
          planName: "Scale",
          status: "active",
          paymentStatus: "verified",
          price: 1949,
          billingCycle: "monthly",
          createdAt: new Date(now - 90 * 86400000).toISOString(),
          dates: {
            activatedAt: new Date(now - 90 * 86400000).toISOString(),
            expiresAt: new Date(now + 30 * 86400000).toISOString(),
          },
        }),
      },
      {
        id: "latest-active-list",
        data: () => ({
          planName: "Scale",
          status: "active",
          paymentStatus: "verified",
          price: 1650,
          billingCycle: "monthly",
          createdAt: new Date(now - 5 * 86400000).toISOString(),
          dates: {
            activatedAt: new Date(now - 5 * 86400000).toISOString(),
            expiresAt: new Date(now + 25 * 86400000).toISOString(),
          },
        }),
      },
      {
        id: "pending-renewal",
        data: () => ({
          planName: "Scale",
          status: "pending",
          paymentStatus: "pending_verification",
          price: 1949,
          billingCycle: "monthly",
          createdAt: new Date(now).toISOString(),
        }),
      },
    ]);

    const latest = pickLatestLivePaidSubscription(rows);
    expect(latest?.id).toBe("latest-active-list");
    expect(latest?.price).toBe(1650);
  });

  it("picks newer Starter over older Scale still marked active", () => {
    const now = Date.now();
    const rows = mapOwnerSubscriptions([
      {
        id: "old-scale",
        data: () => ({
          planName: "Scale",
          status: "active",
          paymentStatus: "verified",
          price: 1650,
          billingCycle: "monthly",
          createdAt: new Date(now - 120 * 86400000).toISOString(),
          dates: {
            activatedAt: new Date(now - 120 * 86400000).toISOString(),
            expiresAt: new Date(now + 30 * 86400000).toISOString(),
          },
        }),
      },
      {
        id: "new-starter",
        data: () => ({
          planName: "Starter",
          planCode: "starter",
          status: "active",
          price: 0,
          billingCycle: "monthly",
          createdAt: new Date(now - 10 * 86400000).toISOString(),
          dates: {
            activatedAt: new Date(now - 10 * 86400000).toISOString(),
          },
        }),
      },
    ]);

    const current = pickLatestCurrentPlanSubscription(rows);
    expect(current?.id).toBe("new-starter");
    expect(current?.planName).toBe("Starter");
    expect(pickLatestLivePaidSubscription(rows)).toBeUndefined();
  });

  it("maps addon line items from the document or metadata", () => {
    const now = Date.now();
    const rows = mapOwnerSubscriptions([
      {
        id: "with-addons",
        data: () => ({
          planName: "Scale",
          planCode: "scale",
          status: "active",
          paymentStatus: "verified",
          price: 1650,
          billingCycle: "monthly",
          createdAt: new Date(now).toISOString(),
          dates: {
            expiresAt: new Date(now + 86400000).toISOString(),
          },
          addonLineItems: [
            { addonId: "addon_ext_rider", quantity: 2 },
            { code: "EXT_AI_BOOST" },
            { quantity: 1 },
          ],
        }),
      },
      {
        id: "metadata-addons",
        data: () => ({
          planName: "Grow",
          planCode: "grow",
          status: "superseded",
          price: 950,
          createdAt: new Date(now - 86400000).toISOString(),
          metadata: {
            addonLineItems: [{ addonId: "addon_ext_business", code: "EXT_BUSINESS" }],
          },
        }),
      },
    ]);

    expect(rows.find((row) => row.id === "with-addons")?.addonLineItems).toEqual([
      { addonId: "addon_ext_rider", quantity: 2 },
      { code: "EXT_AI_BOOST" },
    ]);
    expect(rows.find((row) => row.id === "metadata-addons")?.addonLineItems).toEqual([
      { addonId: "addon_ext_business", code: "EXT_BUSINESS" },
    ]);
  });

  it("maps voucher and affiliate codes from the document or metadata", () => {
    const now = Date.now();
    const rows = mapOwnerSubscriptions([
      {
        id: "voucher-sub",
        data: () => ({
          planName: "Scale",
          planCode: "scale",
          status: "active",
          price: 0,
          billingCycle: "monthly",
          createdAt: new Date(now).toISOString(),
          voucherCode: "LAUNCH20",
        }),
      },
      {
        id: "affiliate-sub",
        data: () => ({
          planName: "Grow",
          planCode: "grow",
          status: "superseded",
          price: 950,
          createdAt: new Date(now - 86400000).toISOString(),
          metadata: {
            affiliateCode: "PARTNER10",
            affiliateDocId: "affiliate_partner10",
          },
        }),
      },
    ]);

    expect(rows.find((row) => row.id === "voucher-sub")?.voucherCode).toBe("LAUNCH20");
    expect(rows.find((row) => row.id === "affiliate-sub")).toMatchObject({
      affiliateCode: "PARTNER10",
      affiliateDocId: "affiliate_partner10",
    });
  });
});
