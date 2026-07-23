import type { ActiveOwner } from "@/lib/dashboard/analytics";
import { isOwnerInactive } from "@/lib/dashboard/map-marker-style";
import type { WorkspaceHealthTier } from "@/lib/dashboard/workspace-health";

/** Lower = surfaced first after pending bucket. */
const HEALTH_PRIORITY: Record<WorkspaceHealthTier, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export const INACTIVE_OWNERS_LIST_LIMIT = 10;

/** @deprecated Use INACTIVE_OWNERS_LIST_LIMIT */
export const ACTIVE_OWNERS_LIST_LIMIT = INACTIVE_OWNERS_LIST_LIMIT;

export function filterInactiveOwners(
  owners: ActiveOwner[],
  now = new Date(),
): ActiveOwner[] {
  return owners.filter((owner) => isOwnerInactive(owner.lastActiveDay, now));
}

/**
 * Inactive owners (no login activity in 7+ days).
 * Pending approvals first, then longest-idle, then at-risk health.
 */
export function sortInactiveOwners(owners: ActiveOwner[]): ActiveOwner[] {
  return [...owners].sort((a, b) => {
    const pendingA = (a.pendingApprovals ?? 0) > 0;
    const pendingB = (b.pendingApprovals ?? 0) > 0;
    if (pendingA !== pendingB) return pendingA ? -1 : 1;

    if (pendingA && pendingB) {
      const pendingDiff =
        (b.pendingApprovals ?? 0) - (a.pendingApprovals ?? 0);
      if (pendingDiff !== 0) return pendingDiff;
    }

    const dayA = a.lastActiveDay || "";
    const dayB = b.lastActiveDay || "";
    // Oldest / missing activity first (most inactive).
    if (dayA !== dayB) {
      if (!dayA) return -1;
      if (!dayB) return 1;
      return dayA.localeCompare(dayB);
    }

    const healthDiff =
      HEALTH_PRIORITY[a.healthTier] - HEALTH_PRIORITY[b.healthTier];
    if (healthDiff !== 0) return healthDiff;

    return b.transactionsLast30Days - a.transactionsLast30Days;
  });
}

export function inactiveOwnersForList(
  owners: ActiveOwner[],
  limit = INACTIVE_OWNERS_LIST_LIMIT,
  now = new Date(),
): ActiveOwner[] {
  return sortInactiveOwners(filterInactiveOwners(owners, now)).slice(0, limit);
}

/** @deprecated Use inactiveOwnersForList */
export function activeOwnersForList(
  owners: ActiveOwner[],
  limit = INACTIVE_OWNERS_LIST_LIMIT,
): ActiveOwner[] {
  return inactiveOwnersForList(owners, limit);
}

/** @deprecated Use sortInactiveOwners */
export function sortActiveOwners(owners: ActiveOwner[]): ActiveOwner[] {
  return sortInactiveOwners(filterInactiveOwners(owners));
}
