import type {
  ActiveOwner,
  ChartBusinessContext,
  DashboardAnalytics,
} from "@/lib/dashboard/analytics";
import { pickLatestCurrentPlanSubscription } from "@/features/dashboard/lib/build-user-subscriptions-list";
import { isFreeForeverPlan } from "@/lib/dashboard/subscription-plan-codes";

/**
 * Overlay each workspace with its latest current plan from activeOwners
 * (including Free — not the latest paid Scale left behind).
 */
export function withLatestLivePlans(
  businesses: ChartBusinessContext[],
  owners: ActiveOwner[] | undefined,
): ChartBusinessContext[] {
  if (!owners?.length) return businesses;

  const byId = new Map(owners.map((owner) => [owner.id, owner]));

  return businesses.map((biz) => {
    const owner = byId.get(biz.id);
    if (!owner) return biz;

    const latest = pickLatestCurrentPlanSubscription(owner.subscriptions ?? []);
    if (!latest) {
      return {
        ...biz,
        name: biz.name?.trim() || owner.businessName,
        ownerEmail: biz.ownerEmail?.trim() || owner.ownerEmail,
      };
    }

    const freeForever = isFreeForeverPlan(latest);
    return {
      ...biz,
      name: biz.name?.trim() || owner.businessName,
      ownerEmail: biz.ownerEmail?.trim() || owner.ownerEmail,
      planName: freeForever ? "Free" : latest.planName || biz.planName,
      planCode: freeForever ? "free" : latest.planCode || biz.planCode,
      price: freeForever ? 0 : Number(latest.price) || 0,
      paymentStatus: latest.paymentStatus ?? biz.paymentStatus,
      billingCycle: latest.billingCycle ?? biz.billingCycle,
      subscriptionStatus: latest.status,
    };
  });
}

export function businessesForMrrInsights(
  data: DashboardAnalytics,
  businesses: ChartBusinessContext[],
): ChartBusinessContext[] {
  return withLatestLivePlans(
    businesses,
    data.growthSalesMetrics?.activeOwners,
  );
}
