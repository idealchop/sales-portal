import type { BusinessSnapshot } from "./compute-sales-insights";
import type { OwnerSubscription } from "./map-owner-subscriptions";
import {
  buildRoleActiveTimeBreakdownRows,
  type RoleActiveTimeSummary,
} from "./compute-role-active-times";
import {
  buildUserGrowthBreakdownGroups,
  computeUserGrowthSignals,
  type SmartRefillUserRecord,
} from "./build-user-growth-breakdown";
import type { SmartRefillUserRoleCounts } from "./count-smartrefill-user-roles";
import {
  classifyHealthForSnapshot,
} from "./compute-sales-insights-helpers";

export type BreakdownRow = {
  label: string;
  value: string;
  detail?: string;
};

export type BreakdownGroup = {
  title: string;
  rows: BreakdownRow[];
};

export type DashboardMetricVariant =
  | "users"
  | "devices"
  | "workspaces"
  | "engagement"
  | "payment"
  | "upsell"
  | "reengagement"
  | "pipeline";

export type DashboardMetricHighlight = {
  label: string;
  value: string;
};

export type DashboardMetric = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  variant: DashboardMetricVariant;
  highlights?: DashboardMetricHighlight[];
  breakdown: BreakdownRow[];
  breakdownGroups?: BreakdownGroup[];
};

export type ActiveOwner = {
  id: string;
  ownerId?: string;
  businessName: string;
  ownerEmail?: string;
  planName?: string;
  customers: number;
  transactionsLast30Days: number;
  healthTier: "high" | "medium" | "low";
  paymentStatus?: string;
  onboardingComplete: boolean;
  address?: string;
  lastActiveDay?: string;
  /** ISO timestamp of last outreach contact; used for 7-day Contact button cooldown. */
  lastContactedAt?: string | null;
  monthlyRevenue: number;
  subscriptions: OwnerSubscription[];
  pendingApprovals: number;
  authAccountTag?: "test" | null;
};

export type GrowthSalesMetrics = {
  growth: DashboardMetric[];
  sales: DashboardMetric[];
  activeOwners: ActiveOwner[];
};

type UsageRow = { name: string; sessions: number; uniqueUsers: number };

type FeatureAdoptionRow = {
  feature: string;
  rate: number;
  completed: number;
  total: number;
};

function healthTier(snapshot: BusinessSnapshot): "high" | "medium" | "low" {
  return classifyHealthForSnapshot(snapshot);
}

export function computeGrowthSalesMetrics(input: {
  businesses: BusinessSnapshot[];
  ownerLastActive: Map<string, string>;
  ownerUserGrowth: { month: string; count: number }[];
  businessGrowth: { month: string; count: number }[];
  totalCustomers: number;
  smartRefillUsers: number;
  smartRefillUserRecords: SmartRefillUserRecord[];
  userRoleCounts: SmartRefillUserRoleCounts;
  activeLoginUsers: number;
  activeLoginUsersByRole: { owners: number; admins: number; riders: number };
  loginSessionsLast30Days: number;
  topDevice: string;
  topBrowser: string;
  deviceUsage: UsageRow[];
  browserUsage: UsageRow[];
  avgActiveTimeByRole: RoleActiveTimeSummary;
  featureAdoption: FeatureAdoptionRow[];
  dailyActiveUsers: { date: string; sessions: number; uniqueUsers: number }[];
  newOwnerSignupsThisMonth: number;
  newWorkspacesThisMonth: number;
  monthStart: Date;
  activeWindowStartKey: string;
  subscriptionsByBusiness: Map<string, OwnerSubscription[]>;
  virtualStaffCounts: { admins: number; riders: number };
  testAccountOwnerIds?: ReadonlySet<string>;
}): { growth: DashboardMetric[]; activeOwners: ActiveOwner[] } {
  const {
    businesses,
    ownerLastActive,
    testAccountOwnerIds,
    ownerUserGrowth,
    smartRefillUsers,
    smartRefillUserRecords,
    userRoleCounts,
    activeLoginUsers,
    activeLoginUsersByRole,
    loginSessionsLast30Days,
    topDevice,
    topBrowser,
    deviceUsage,
    browserUsage,
    avgActiveTimeByRole,
    newOwnerSignupsThisMonth,
    monthStart,
    activeWindowStartKey,
    subscriptionsByBusiness,
    virtualStaffCounts,
  } = input;

  const ownerGrowthLastTwo = ownerUserGrowth.slice(-2);
  const ownerSignupDelta =
    (ownerGrowthLastTwo[1]?.count ?? newOwnerSignupsThisMonth) -
    (ownerGrowthLastTwo[0]?.count ?? 0);

  const totalDeviceSessions = deviceUsage.reduce((sum, row) => sum + row.sessions, 0);
  const totalBrowserSessions = browserUsage.reduce((sum, row) => sum + row.sessions, 0);
  const topDeviceRow = deviceUsage[0];
  const topBrowserRow = browserUsage[0];
  const topDeviceShare =
    totalDeviceSessions > 0 && topDeviceRow ?
      Math.round((topDeviceRow.sessions / totalDeviceSessions) * 100) :
      0;
  const topBrowserShare =
    totalBrowserSessions > 0 && topBrowserRow ?
      Math.round((topBrowserRow.sessions / totalBrowserSessions) * 100) :
      0;
  const activationRate =
    smartRefillUsers > 0 ?
      Math.round((activeLoginUsers / smartRefillUsers) * 100) :
      0;

  const userGrowthSignals = computeUserGrowthSignals({
    users: smartRefillUserRecords,
    businesses,
    ownerLastActive,
    userRoleCounts,
    smartRefillUsers,
    ownerUserGrowth,
    newOwnerSignupsThisMonth,
    ownerSignupDelta,
    activeLoginUsers,
    activeLoginUsersByRole,
    loginSessionsLast30Days,
    monthStart,
    thirtyDayKey: activeWindowStartKey,
  });

  const userGrowthBreakdownGroups = buildUserGrowthBreakdownGroups({
    users: smartRefillUserRecords,
    businesses,
    ownerLastActive,
    userRoleCounts,
    smartRefillUsers,
    ownerUserGrowth,
    newOwnerSignupsThisMonth,
    ownerSignupDelta,
    activeLoginUsers,
    activeLoginUsersByRole,
    loginSessionsLast30Days,
    monthStart,
    thirtyDayKey: activeWindowStartKey,
  });

  const growth: DashboardMetric[] = [
    {
      id: "users",
      title: "Users",
      variant: "users",
      value: smartRefillUsers.toLocaleString(),
      subtitle: `${userRoleCounts.owners.toLocaleString()} owners · ${userRoleCounts.admins.toLocaleString()} admins · ${userRoleCounts.riders.toLocaleString()} riders`,
      highlights: [
        {
          label: "New owners this month",
          value: `+${userGrowthSignals.newOwnerSignupsThisMonth}`,
        },
        {
          label: "Activation rate (30d)",
          value: `${activationRate}%`,
        },
        {
          label: "Active user avg. per role",
          value: userGrowthSignals.activeUserAvgPerRole,
        },
      ],
      breakdown: userGrowthBreakdownGroups.flatMap((group) => group.rows),
      breakdownGroups: userGrowthBreakdownGroups,
    },
    {
      id: "device-browser",
      title: "Device & browser",
      variant: "devices",
      value: topDevice,
      subtitle: `${topDeviceShare}% of sessions · browser leader ${topBrowser}`,
      highlights: [
        {
          label: "Top device",
          value: `${topDeviceShare}%`,
        },
        {
          label: "Top browser",
          value: `${topBrowserShare}%`,
        },
        {
          label: "Sessions (30d)",
          value: loginSessionsLast30Days.toLocaleString(),
        },
      ],
      breakdown: [],
      breakdownGroups: [
        {
          title: "Devices",
          rows:
            deviceUsage.length > 0 ?
              deviceUsage.map((row) => ({
                label: row.name,
                value: `${row.sessions.toLocaleString()} sessions`,
                detail: `${row.uniqueUsers} unique users`,
              })) :
              [{ label: "No device data", value: "—", detail: "Login events not recorded yet" }],
        },
        {
          title: "Browsers",
          rows:
            browserUsage.length > 0 ?
              browserUsage.map((row) => ({
                label: row.name,
                value: `${row.sessions.toLocaleString()} sessions`,
                detail: `${row.uniqueUsers} unique users`,
              })) :
              [{ label: "No browser data", value: "—", detail: "Login events not recorded yet" }],
        },
        {
          title: "Usual active time by role",
          rows: buildRoleActiveTimeBreakdownRows(avgActiveTimeByRole),
        },
      ],
    },
    {
      id: "owner-conversion-pipeline",
      title: "Owner conversion pipeline",
      variant: "workspaces",
      value: `${userGrowthSignals.conversionPipelineTotal}`,
      subtitle: `${userGrowthSignals.onboardingIncomplete} onboarding · ${userGrowthSignals.zeroCustomerWorkspaces} need customers`,
      highlights: [
        {
          label: "Onboarding incomplete",
          value: `${userGrowthSignals.onboardingIncomplete}`,
        },
        {
          label: "Zero customers",
          value: `${userGrowthSignals.zeroCustomerWorkspaces}`,
        },
        {
          label: "Inactive owners",
          value: `${userGrowthSignals.inactiveOwners}`,
        },
      ],
      breakdown: userGrowthSignals.ownerPipelineRows,
      breakdownGroups: [
        {
          title: "Owner conversion pipeline",
          rows: userGrowthSignals.ownerPipelineRows,
        },
        {
          title: "Priority owner accounts",
          rows: userGrowthSignals.priorityAccounts,
        },
      ],
    },
    {
      id: "team-expansion-upside",
      title: "Team expansion upside",
      variant: "engagement",
      value: `${userGrowthSignals.soloOwnerWorkspaces}`,
      subtitle: `${virtualStaffCounts.admins.toLocaleString()} staff-admin · ${virtualStaffCounts.riders.toLocaleString()} staff-rider · ${userGrowthSignals.workspacesWithoutAdmin} missing admin · ${userGrowthSignals.workspacesWithoutRider} missing rider`,
      highlights: [
        {
          label: "Solo-owner workspaces",
          value: `${userGrowthSignals.soloOwnerWorkspaces}`,
        },
        {
          label: "No admin assigned",
          value: `${userGrowthSignals.workspacesWithoutAdmin}`,
        },
        {
          label: "Avg staff / workspace",
          value: userGrowthSignals.avgTeamPerWorkspace,
        },
      ],
      breakdown: userGrowthSignals.teamExpansionRows,
      breakdownGroups: [
        {
          title: "Team expansion upside",
          rows: userGrowthSignals.teamExpansionRows,
        },
      ],
    },
  ];

  const activeOwners: ActiveOwner[] = businesses
    .filter((b) => {
      const lastActive = b.ownerId ?
        ownerLastActive.get(b.ownerId) :
        undefined;
      const recentlyActive =
        (lastActive && lastActive >= activeWindowStartKey) ||
        b.transactionsLast30Days > 0;
      const activeSub = b.subscriptionStatus === "active";
      return recentlyActive || activeSub;
    })
    .map((b) => {
      const subscriptions = subscriptionsByBusiness.get(b.id) ?? [];
      return {
        id: b.id,
        ownerId: b.ownerId,
        businessName: b.name,
        ownerEmail: b.ownerEmail,
        planName: b.planName,
        customers: b.customers,
        transactionsLast30Days: b.transactionsLast30Days,
        healthTier: healthTier(b),
        paymentStatus: b.paymentStatus,
        onboardingComplete: b.onboardingComplete,
        address: b.address,
        lastActiveDay: b.ownerId ? ownerLastActive.get(b.ownerId) : undefined,
        monthlyRevenue: b.price,
        subscriptions,
        pendingApprovals: subscriptions.filter((sub) => sub.needsApproval).length,
        authAccountTag:
          b.ownerId && testAccountOwnerIds?.has(b.ownerId) ? "test" as const : null,
      };
    })
    .sort((a, b) => {
      const dayA = a.lastActiveDay || "";
      const dayB = b.lastActiveDay || "";
      if (dayA !== dayB) return dayB.localeCompare(dayA);
      return b.transactionsLast30Days - a.transactionsLast30Days;
    });

  return { growth, activeOwners };
}
