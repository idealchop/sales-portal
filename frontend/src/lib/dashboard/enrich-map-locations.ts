import type { ActiveOwner, BusinessMapLocation } from "@/lib/dashboard/analytics";
import { filterTestAccountMapLocations } from "@/lib/dashboard/test-account-filters";

function resolveCurrentBillingCycle(owner?: ActiveOwner): string | undefined {
  return owner?.subscriptions?.find((sub) => sub.timeline === "current")
    ?.billingCycle;
}

export function enrichMapLocations(
  locations: BusinessMapLocation[],
  owners: ActiveOwner[] = [],
): BusinessMapLocation[] {
  const ownerByBusinessId = new Map(owners.map((owner) => [owner.id, owner]));

  return filterTestAccountMapLocations(locations, owners).map((location) => {
    const owner = ownerByBusinessId.get(location.id);
    return {
      ...location,
      planName: location.planName ?? owner?.planName,
      lastActiveDay: location.lastActiveDay ?? owner?.lastActiveDay,
      billingCycle:
        location.billingCycle ?? resolveCurrentBillingCycle(owner),
      authAccountTag:
        location.authAccountTag ?? owner?.authAccountTag ?? null,
    };
  });
}

export { filterTestAccountMapLocations } from "@/lib/dashboard/test-account-filters";
