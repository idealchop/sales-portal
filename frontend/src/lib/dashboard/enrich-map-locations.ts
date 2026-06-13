import type { ActiveOwner, BusinessMapLocation } from "@/lib/dashboard/analytics";

export function enrichMapLocations(
  locations: BusinessMapLocation[],
  owners: ActiveOwner[],
): BusinessMapLocation[] {
  const ownerByBusinessId = new Map(owners.map((owner) => [owner.id, owner]));

  return locations.map((location) => {
    const owner = ownerByBusinessId.get(location.id);
    return {
      ...location,
      planName: location.planName ?? owner?.planName,
      lastActiveDay: location.lastActiveDay ?? owner?.lastActiveDay,
    };
  });
}
