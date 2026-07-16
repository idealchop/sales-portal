import type { ActiveOwner, BusinessMapLocation } from "@/lib/dashboard/analytics";

export function isTestAuthAccountTag(
  tag: unknown,
): tag is "test" {
  return tag === "test";
}

export function isTestAccountOwner(owner: Pick<ActiveOwner, "authAccountTag">): boolean {
  return isTestAuthAccountTag(owner.authAccountTag);
}

export function resolveMapLocationAuthAccountTag(
  location: BusinessMapLocation,
  owner?: ActiveOwner,
): "test" | null | undefined {
  return location.authAccountTag ?? owner?.authAccountTag;
}

export function filterTestAccountMapLocations(
  locations: BusinessMapLocation[],
  owners: ActiveOwner[] = [],
): BusinessMapLocation[] {
  const ownerByBusinessId = new Map(owners.map((owner) => [owner.id, owner]));

  return locations.filter((location) => {
    const owner = ownerByBusinessId.get(location.id);
    return !isTestAuthAccountTag(
      resolveMapLocationAuthAccountTag(location, owner),
    );
  });
}
