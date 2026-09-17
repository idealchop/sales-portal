import type {
  ActiveOwner,
  ChartBusinessContext,
  DashboardAnalytics,
} from "@/lib/dashboard/analytics";
import { pickLatestCurrentPlanSubscription } from "@/features/dashboard/lib/build-user-subscriptions-list";

/**
 * Overlay each workspace with its latest current plan from activeOwners
 * (including free Starter — not the latest paid Scale left behind).
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

    return {
      ...biz,
      name: biz.name?.trim() || owner.businessName,
      ownerEmail: biz.ownerEmail?.trim() || owner.ownerEmail,
      planName: latest.planName || biz.planName,
      planCode: latest.planCode || biz.planCode,
      price: Number(latest.price) || 0,
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
