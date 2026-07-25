import type {
  PlatformAlert,
  PlatformAlertKind,
  PlatformAlertsSummary,
} from "@/lib/dashboard/analytics";

const EMPTY_COUNTS: Record<PlatformAlertKind, number> = {
  demo_inquiry: 0,
  new_user_registration: 0,
  subscription_change: 0,
  subscription_expiring_soon: 0,
  subscription_grace_period: 0,
};

export function countPlatformAlertsByKind(
  items: PlatformAlert[],
): Record<PlatformAlertKind, number> {
  const counts = { ...EMPTY_COUNTS };
  for (const item of items) {
    counts[item.kind] += 1;
  }
  return counts;
}

/** Drop locally dismissed alerts when a stale analytics refresh reintroduces them. */
export function filterDismissedPlatformAlerts(
  items: PlatformAlert[],
  dismissedIds: ReadonlySet<string>,
): PlatformAlert[] {
  if (dismissedIds.size === 0) return items;
  return items.filter((item) => !dismissedIds.has(item.id));
}

export function buildPlatformAlertsSummary(
  items: PlatformAlert[],
  dismissedIds: ReadonlySet<string> = new Set(),
): PlatformAlertsSummary {
  const filtered = filterDismissedPlatformAlerts(items, dismissedIds);
  return {
    items: filtered,
    counts: countPlatformAlertsByKind(filtered),
  };
}

export function dismissPlatformAlertFromSummary(
  summary: PlatformAlertsSummary,
  alertId: string,
): PlatformAlertsSummary {
  const items = summary.items.filter((item) => item.id !== alertId);
  return {
    items,
    counts: countPlatformAlertsByKind(items),
  };
}
