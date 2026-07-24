import {
  normalizeDashboardSummary,
  type ChartBusinessContext,
  type DashboardAnalytics,
} from "@/lib/dashboard/analytics";

type RoleCounts = DashboardAnalytics["summary"]["userRoleCounts"];
type TierCounts = DashboardAnalytics["summary"]["businessTierCounts"];
type VirtualStaffCounts = DashboardAnalytics["summary"]["virtualStaffCounts"];

function parseCount(value: string): number {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasRoleCounts(counts: RoleCounts): boolean {
  return counts.owners + counts.admins + counts.riders > 0;
}

function hasTierCounts(counts: TierCounts): boolean {
  return counts.scale + counts.grow + counts.starter + counts.free > 0;
}

function hasVirtualStaffCounts(counts: VirtualStaffCounts): boolean {
  return counts.admins + counts.riders > 0;
}

export function parseUserRoleSubtitle(subtitle: string): RoleCounts | null {
  const match = subtitle.match(
    /^([\d,]+)\s+owners?\s·\s([\d,]+)\s+(?:staff-admin|admins?)\s·\s([\d,]+)\s+(?:staff-rider|riders?)/i,
  );
  if (!match) return null;

  return {
    owners: parseCount(match[1]),
    admins: parseCount(match[2]),
    riders: parseCount(match[3]),
  };
}

export function parseVirtualStaffSubtitle(subtitle: string): VirtualStaffCounts | null {
  const match = subtitle.match(
    /^([\d,]+)\s+(?:staff-admin|admin)\s·\s([\d,]+)\s+(?:staff-rider|rider)\s·/i,
  );
  if (!match) return null;

  return {
    admins: parseCount(match[1]),
    riders: parseCount(match[2]),
  };
}

export function classifyBusinessTier(
  planName?: string,
  planCode?: string,
  price = 0,
): keyof TierCounts {
  const key = `${planCode || ""} ${planName || ""}`.trim().toLowerCase();
  if (!key || key.includes("free") || price <= 0) return "free";
  if (key.includes("scale")) return "scale";
  if (key.includes("growth") || key.includes("grow")) return "grow";
  if (key.includes("starter")) return "starter";
  return "free";
}

export function deriveBusinessTierCounts(
  businesses: ChartBusinessContext[],
): TierCounts {
  const counts: TierCounts = { scale: 0, grow: 0, starter: 0, free: 0 };
  for (const business of businesses) {
    if (business.authAccountTag === "test") continue;
    counts[classifyBusinessTier(business.planName, business.planCode, business.price)] += 1;
  }
  return counts;
}

export function resolvePlatformKpiSummary(
  data: Pick<
    DashboardAnalytics,
    "summary" | "growthSalesMetrics" | "chartBusinessContext"
  >,
): DashboardAnalytics["summary"] {
  const base = normalizeDashboardSummary(data.summary);

  let userRoleCounts = base.userRoleCounts;
  if (!hasRoleCounts(userRoleCounts) && base.smartRefillUsers > 0) {
    const usersMetric = data.growthSalesMetrics.growth.find(
      (metric) => metric.id === "users",
    );
    if (usersMetric) {
      const parsed = parseUserRoleSubtitle(usersMetric.subtitle);
      if (parsed && hasRoleCounts(parsed)) {
        userRoleCounts = parsed;
      }
    }
  }

  let virtualStaffCounts = base.virtualStaffCounts;
  if (!hasVirtualStaffCounts(virtualStaffCounts)) {
    const teamMetric = data.growthSalesMetrics.growth.find(
      (metric) => metric.id === "team-expansion-upside",
    );
    if (teamMetric) {
      const parsed = parseVirtualStaffSubtitle(teamMetric.subtitle);
      if (parsed && hasVirtualStaffCounts(parsed)) {
        virtualStaffCounts = parsed;
      }
    }
  }

  let businessTierCounts = base.businessTierCounts;
  if (!hasTierCounts(businessTierCounts) && data.chartBusinessContext.length > 0) {
    businessTierCounts = deriveBusinessTierCounts(data.chartBusinessContext);
  } else if (
    !hasTierCounts(businessTierCounts) &&
    base.totalBusinesses > 0 &&
    data.chartBusinessContext.length === 0
  ) {
    businessTierCounts = { scale: 0, grow: 0, starter: 0, free: base.totalBusinesses };
  }

  let customerBreakdown = base.customerBreakdown;
  if (
    base.totalCustomers > 0 &&
    customerBreakdown.active === 0 &&
    customerBreakdown.deactivated === 0
  ) {
    customerBreakdown = {
      active: base.totalCustomers,
      deactivated: 0,
    };
  }

  return {
    ...base,
    userRoleCounts,
    virtualStaffCounts,
    businessTierCounts,
    customerBreakdown,
  };
}
