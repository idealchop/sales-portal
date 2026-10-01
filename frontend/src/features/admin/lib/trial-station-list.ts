import type { UserSubscriptionListItem } from "@/features/dashboard/lib/build-user-subscriptions-list";
import { businessInfoPath } from "@/lib/admin/data-management-url-state";
import { trialStartedAt } from "@/lib/admin/plan-subscriber-roster";
import { trialDaysRemainingCount } from "@/lib/dashboard/subscription-labels";

const TRIAL_STATIONS_RETURN = "/subscriptions/trial";

/** Data management page for a station on the free-trial roster. */
export function trialStationDataManagementPath(row: {
  businessId?: string | null;
  ownerUserId?: string | null;
}): string | null {
  const businessId = row.businessId?.trim();
  if (!businessId) return null;
  const userId = row.ownerUserId?.trim();
  return businessInfoPath(
    businessId,
    TRIAL_STATIONS_RETURN,
    userId && userId !== "smartrefill" ? userId : undefined,
  );
}

export type TrialUrgencyFilter = "all" | "ending" | "later";

export type TrialStationSort =
  | "expires-asc"
  | "expires-desc"
  | "station-asc"
  | "station-desc"
  | "started-desc"
  | "started-asc"
  | "active-desc"
  | "active-asc";

export const TRIAL_STATION_SORT_OPTIONS: Array<{
  value: TrialStationSort;
  label: string;
}> = [
  { value: "expires-asc", label: "Soonest to expire" },
  { value: "expires-desc", label: "Most days left" },
  { value: "station-asc", label: "Station A–Z" },
  { value: "station-desc", label: "Station Z–A" },
  { value: "started-desc", label: "Started newest" },
  { value: "started-asc", label: "Started oldest" },
  { value: "active-desc", label: "Last active newest" },
  { value: "active-asc", label: "Last active oldest" },
];

function stationName(row: UserSubscriptionListItem): string {
  return (row.businessName || row.businessId).trim();
}

function planCode(row: UserSubscriptionListItem): string {
  return (row.subscription.planCode || row.subscription.planName || "")
    .trim()
    .toLowerCase();
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareDate(a: string | undefined, b: string | undefined, direction: 1 | -1): number {
  const aMs = a ? new Date(a).getTime() : Number.NaN;
  const bMs = b ? new Date(b).getTime() : Number.NaN;
  const aMissing = Number.isNaN(aMs);
  const bMissing = Number.isNaN(bMs);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return (aMs - bMs) * direction;
}

export function trialPlanFilterOptions(
  stations: UserSubscriptionListItem[],
): Array<{ code: string; label: string }> {
  const byCode = new Map<string, string>();
  for (const row of stations) {
    const code = planCode(row);
    if (!code || byCode.has(code)) continue;
    byCode.set(code, row.subscription.planName || code);
  }
  return [...byCode.entries()]
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => compareText(a.label, b.label));
}

export function filterAndSortTrialStations(
  stations: UserSubscriptionListItem[],
  input: {
    query?: string;
    plan?: string;
    urgency?: TrialUrgencyFilter;
    sort?: TrialStationSort;
    now?: Date;
  },
): UserSubscriptionListItem[] {
  const needle = input.query?.trim().toLowerCase() ?? "";
  const plan = (input.plan || "all").toLowerCase();
  const urgency = input.urgency ?? "all";
  const sort = input.sort ?? "expires-asc";
  const now = input.now ?? new Date();

  const filtered = stations.filter((row) => {
    if (plan !== "all" && planCode(row) !== plan) return false;
    if (urgency !== "all") {
      const daysLeft = trialDaysRemainingCount(row.subscription.expiresAt, now);
      const ending = daysLeft !== null && daysLeft <= 3;
      if (urgency === "ending" && !ending) return false;
      if (urgency === "later" && ending) return false;
    }
    if (!needle) return true;
    const haystack = [
      row.businessName,
      row.ownerEmail,
      row.businessId,
      row.subscription.planName,
      row.subscription.planCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });

  const direction = sort.endsWith("-desc") ? -1 : 1;
  return [...filtered].sort((a, b) => {
    let result = 0;
    if (sort.startsWith("expires")) {
      const aDays = trialDaysRemainingCount(a.subscription.expiresAt, now);
      const bDays = trialDaysRemainingCount(b.subscription.expiresAt, now);
      if (aDays === null && bDays === null) result = 0;
      else if (aDays === null) result = 1;
      else if (bDays === null) result = -1;
      else result = (aDays - bDays) * (sort === "expires-desc" ? -1 : 1);
    } else if (sort.startsWith("station")) {
      result = compareText(stationName(a), stationName(b)) * direction;
    } else if (sort.startsWith("started")) {
      result = compareDate(trialStartedAt(a.subscription), trialStartedAt(b.subscription), direction);
    } else if (sort.startsWith("active")) {
      result = compareDate(a.lastActiveDay, b.lastActiveDay, direction);
    }
    if (result !== 0) return result;
    return compareText(stationName(a), stationName(b));
  });
}
