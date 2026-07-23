import { describe, expect, it } from "vitest";
import { buildPlatformAlerts } from "../../../services/build-platform-alerts";
import type { OwnerSubscription } from "../../../services/map-owner-subscriptions";

describe("buildPlatformAlerts", () => {
  const now = new Date("2026-07-04T10:00:00.000Z");

  it("builds demo, user, subscription, expiring, and grace alerts", () => {
    const subscriptionsByBusiness = new Map<string, OwnerSubscription[]>([
      [
        "biz-expiring",
        [
          {
            id: "sub-expiring",
            planName: "Scale",
            status: "active",
            price: 1650,
            timeline: "current",
            cancelAtPeriodEnd: false,
            needsApproval: false,
            isDowngrade: false,
            isCancellation: false,
            expiresAt: "2026-07-07T12:00:00.000Z",
            createdAt: "2026-06-01T00:00:00.000Z",
          },
        ],
      ],
      [
        "biz-grace",
        [
          {
            id: "sub-grace",
            planName: "Growth",
            status: "active",
            price: 850,
            timeline: "current",
            cancelAtPeriodEnd: false,
            needsApproval: false,
            isDowngrade: false,
            isCancellation: false,
            expiresAt: "2026-07-01T00:00:00.000Z",
            createdAt: "2026-05-01T00:00:00.000Z",
          },
        ],
      ],
      [
        "biz-change",
        [
          {
            id: "sub-change",
            planName: "Starter",
            status: "active",
            price: 0,
            timeline: "current",
            cancelAtPeriodEnd: false,
            needsApproval: false,
            isDowngrade: true,
            isCancellation: false,
            changeType: "downgrade",
            createdAt: "2026-07-03T00:00:00.000Z",
          },
        ],
      ],
    ]);

    const summary = buildPlatformAlerts({
      now,
      inquiries: [
        {
          id: "inq-1",
          data: {
            type: "request_demo",
            name: "Jaime",
            email: "demo@example.com",
            businessName: "Pureflow",
            stationCount: "2",
            createdAt: "2026-07-02T00:00:00.000Z",
          },
        },
      ],
      newJoiners: {
        salesReps: [],
        businesses: [],
        platformUsers: [
          {
            id: "user-1",
            displayName: "New Owner",
            email: "owner@example.com",
            role: "owner",
            joinedAt: "2026-07-01T00:00:00.000Z",
          },
        ],
      },
      subscriptionsByBusiness,
      businessNamesById: new Map([
        ["biz-expiring", "Expiring Co"],
        ["biz-grace", "Grace Co"],
        ["biz-change", "Changed Co"],
      ]),
    });

    expect(summary.counts.demo_inquiry).toBe(1);
    expect(summary.counts.new_user_registration).toBe(1);
    expect(summary.counts.subscription_change).toBe(1);
    expect(summary.counts.subscription_expiring_soon).toBe(1);
    expect(summary.counts.subscription_grace_period).toBe(1);

    expect(
      summary.items.some(
        (item) =>
          item.kind === "demo_inquiry" &&
          item.email === "demo@example.com" &&
          item.businessName === "Pureflow",
      ),
    ).toBe(true);
    expect(
      summary.items.some((item) => item.kind === "subscription_expiring_soon" && item.businessId === "biz-expiring"),
    ).toBe(true);
    expect(
      summary.items.some((item) => item.kind === "subscription_grace_period" && item.businessId === "biz-grace"),
    ).toBe(true);
  });
});
