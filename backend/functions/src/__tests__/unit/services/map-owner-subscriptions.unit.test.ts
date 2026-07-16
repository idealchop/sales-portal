import { describe, expect, it } from "vitest";
import { mapOwnerSubscriptions } from "../../../services/map-owner-subscriptions";

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
          createdAt: "2026-06-09T06:41:13.448Z",
          dates: {
            activatedAt: "2026-06-09T06:41:13.448Z",
            expiresAt: "2026-08-09T06:41:13.426Z",
          },
        }),
      },
    ]);

    expect(rows[0]?.createdAt).toBe("2026-06-09T06:41:13.448Z");
    expect(rows[0]?.activatedAt).toBe("2026-06-09T06:41:13.448Z");
    expect(rows[0]?.expiresAt).toBe("2026-08-09T06:41:13.426Z");
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
});
