import { describe, expect, it } from "vitest";
import {
  buildUserSubscriptionsList,
  countActiveSubscriptions,
  countUserSubscriptionsByFilter,
  filterUserSubscriptionsList,
  pickLatestSubscription,
  resolveSubscriptionChangeKind,
} from "@/features/dashboard/lib/build-user-subscriptions-list";
import type { ActiveOwner } from "@/lib/dashboard/analytics";

const owner = (
  id: string,
  subs: ActiveOwner["subscriptions"],
): ActiveOwner => ({
  id,
  businessName: `Business ${id}`,
  customers: 1,
  transactionsLast30Days: 0,
  healthTier: "medium",
  onboardingComplete: true,
  monthlyRevenue: 0,
  subscriptions: subs,
});

describe("buildUserSubscriptionsList", () => {
  it("includes only the latest subscription record per business by createdAt", () => {
    const items = buildUserSubscriptionsList([
      owner("b1", [
        {
          id: "current",
          planName: "Scale",
          status: "active",
          price: 999,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
          createdAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "future",
          planName: "Growth",
          status: "scheduled",
          price: 850,
          timeline: "future",
          cancelAtPeriodEnd: false,
          needsApproval: true,
          isDowngrade: false,
          isCancellation: false,
          changeType: "upgrade",
          createdAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "past",
          planName: "Starter",
          status: "expired",
          price: 0,
          timeline: "past",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
        },
      ]),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.subscription.id).toBe("future");
    expect(items[0]?.activeSubscriptionCount).toBe(2);
  });

  it("prefers a newer renewal over an expired current plan", () => {
    const now = new Date("2026-07-04T12:00:00.000Z").getTime();
    const items = buildUserSubscriptionsList(
      [
        owner("danum", [
          {
            id: "may-cycle",
            planName: "Scale",
            status: "active",
            price: 1650,
            timeline: "current",
            cancelAtPeriodEnd: false,
            needsApproval: false,
            isDowngrade: false,
            isCancellation: false,
            billingCycle: "monthly",
            createdAt: "2026-05-02T00:00:00.000Z",
            expiresAt: "2026-06-01T00:00:00.000Z",
          },
          {
            id: "july-renewal",
            planName: "Scale",
            status: "pending",
            price: 1650,
            timeline: "future",
            cancelAtPeriodEnd: false,
            needsApproval: true,
            isDowngrade: false,
            isCancellation: false,
            billingCycle: "monthly",
            changeType: "renew",
            createdAt: "2026-07-01T00:00:00.000Z",
            activatesAt: "2026-07-01T00:00:00.000Z",
            expiresAt: "2026-08-01T00:00:00.000Z",
          },
        ]),
      ],
      now,
    );

    expect(items[0]?.subscription.id).toBe("july-renewal");
    expect(items[0]?.activeSubscriptionCount).toBe(1);
  });

  it("does not count date-expired subscriptions as active", () => {
    const now = new Date("2026-07-04T12:00:00.000Z").getTime();
    expect(
      countActiveSubscriptions(
        [
          {
            id: "stale",
            planName: "Scale",
            status: "active",
            price: 1650,
            timeline: "current",
            cancelAtPeriodEnd: false,
            needsApproval: false,
            isDowngrade: false,
            isCancellation: false,
            expiresAt: "2026-06-01T00:00:00.000Z",
          },
        ],
        now,
      ),
    ).toBe(0);
  });

  it("counts one active subscription when only the current plan is live", () => {
    const items = buildUserSubscriptionsList([
      owner("b1", [
        {
          id: "current",
          planName: "Scale",
          status: "active",
          price: 999,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
          createdAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "past",
          planName: "Starter",
          status: "expired",
          price: 0,
          timeline: "past",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
        },
      ]),
    ]);

    expect(items[0]?.activeSubscriptionCount).toBe(1);
  });

  it("countActiveSubscriptions ignores past and cancelled rows", () => {
    expect(
      countActiveSubscriptions([
        {
          id: "current",
          planName: "Scale",
          status: "active",
          price: 999,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
        },
        {
          id: "past",
          planName: "Starter",
          status: "expired",
          price: 0,
          timeline: "past",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
        },
        {
          id: "cancelled",
          planName: "Growth",
          status: "cancelled",
          price: 850,
          timeline: "current",
          cancelAtPeriodEnd: true,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: true,
        },
      ]),
    ).toBe(1);
  });

  it("sorts businesses by latest subscription activity", () => {
    const items = buildUserSubscriptionsList([
      owner("older", [
        {
          id: "old-sub",
          planName: "Starter",
          status: "active",
          price: 0,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
          createdAt: "2026-05-01T00:00:00.000Z",
        },
      ]),
      owner("newer", [
        {
          id: "new-sub",
          planName: "Scale",
          status: "active",
          price: 999,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
          createdAt: "2026-07-01T00:00:00.000Z",
        },
      ]),
    ]);

    expect(items.map((item) => item.businessId)).toEqual(["newer", "older"]);
  });

  it("pickLatestSubscription prefers the most recent activity timestamp", () => {
    const latest = pickLatestSubscription([
      {
        id: "current",
        planName: "Scale",
        status: "active",
        price: 999,
        timeline: "current",
        cancelAtPeriodEnd: false,
        needsApproval: false,
        isDowngrade: false,
        isCancellation: false,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "future",
        planName: "Growth",
        status: "scheduled",
        price: 850,
        timeline: "future",
        cancelAtPeriodEnd: false,
        needsApproval: true,
        isDowngrade: false,
        isCancellation: false,
        createdAt: "2026-07-02T00:00:00.000Z",
      },
    ]);

    expect(latest?.id).toBe("future");
  });

  it("classifies upgrade, downgrade, and renewal changes", () => {
    expect(
      resolveSubscriptionChangeKind({
        id: "1",
        planName: "A",
        status: "pending",
        price: 1,
        timeline: "current",
        cancelAtPeriodEnd: false,
        needsApproval: true,
        isDowngrade: false,
        isCancellation: false,
        changeType: "upgrade",
      }),
    ).toBe("upgrade");

    expect(
      resolveSubscriptionChangeKind({
        id: "2",
        planName: "B",
        status: "pending",
        price: 1,
        timeline: "current",
        cancelAtPeriodEnd: false,
        needsApproval: true,
        isDowngrade: true,
        isCancellation: false,
        changeType: "downgrade",
      }),
    ).toBe("downgrade");

    expect(
      resolveSubscriptionChangeKind({
        id: "3",
        planName: "C",
        status: "pending",
        price: 1,
        timeline: "current",
        cancelAtPeriodEnd: false,
        needsApproval: true,
        isDowngrade: false,
        isCancellation: false,
        changeType: "renew",
      }),
    ).toBe("renewal");
  });

  it("filters and counts by pending and change kind", () => {
    const items = buildUserSubscriptionsList([
      owner("b1", [
        {
          id: "upgrade",
          planName: "Scale",
          status: "pending",
          price: 999,
          timeline: "future",
          cancelAtPeriodEnd: false,
          needsApproval: true,
          isDowngrade: false,
          isCancellation: false,
          changeType: "upgrade",
          createdAt: "2026-07-02T00:00:00.000Z",
        },
        {
          id: "renew",
          planName: "Growth",
          status: "active",
          price: 850,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
          changeType: "renew",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ]),
      owner("b2", [
        {
          id: "renew-only",
          planName: "Growth",
          status: "active",
          price: 850,
          timeline: "current",
          cancelAtPeriodEnd: false,
          needsApproval: false,
          isDowngrade: false,
          isCancellation: false,
          changeType: "renew",
          createdAt: "2026-07-01T00:00:00.000Z",
        },
      ]),
    ]);

    const counts = countUserSubscriptionsByFilter(items);
    expect(counts.all).toBe(2);
    expect(counts.pending).toBe(1);
    expect(counts.upgrade).toBe(1);
    expect(counts.renewal).toBe(1);

    expect(filterUserSubscriptionsList(items, "pending")).toHaveLength(1);
    expect(filterUserSubscriptionsList(items, "renewal")).toHaveLength(1);
  });
});
