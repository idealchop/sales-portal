import type { ActiveOwner } from "@/lib/dashboard/analytics";
import type { WorkspaceHealthTier } from "@/lib/dashboard/workspace-health";

/** Lower = surfaced first after pending bucket. */
const HEALTH_PRIORITY: Record<WorkspaceHealthTier, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export const ACTIVE_OWNERS_LIST_LIMIT = 5;

export function sortActiveOwners(owners: ActiveOwner[]): ActiveOwner[] {
  return [...owners].sort((a, b) => {
    const pendingA = (a.pendingApprovals ?? 0) > 0;
    const pendingB = (b.pendingApprovals ?? 0) > 0;
    if (pendingA !== pendingB) return pendingA ? -1 : 1;

    if (pendingA && pendingB) {
      const pendingDiff =
        (b.pendingApprovals ?? 0) - (a.pendingApprovals ?? 0);
      if (pendingDiff !== 0) return pendingDiff;
    }

    const healthDiff =
      HEALTH_PRIORITY[a.healthTier] - HEALTH_PRIORITY[b.healthTier];
    if (healthDiff !== 0) return healthDiff;

    const dayA = a.lastActiveDay || "";
    const dayB = b.lastActiveDay || "";
    if (dayA !== dayB) return dayB.localeCompare(dayA);
    return b.transactionsLast30Days - a.transactionsLast30Days;
  });
}

export function activeOwnersForList(
  owners: ActiveOwner[],
  limit = ACTIVE_OWNERS_LIST_LIMIT,
): ActiveOwner[] {
  return sortActiveOwners(owners).slice(0, limit);
}
