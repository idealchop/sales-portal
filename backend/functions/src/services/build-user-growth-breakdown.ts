import type { BusinessSnapshot } from "./compute-sales-insights";
import {
  activeUserAveragePerRole,
  resolveSmartRefillUserRole,
  type SmartRefillUserRoleCounts,
} from "./count-smartrefill-user-roles";
import { SMARTREFILL_APP_ID } from "../constants/smartrefill";

export type BreakdownRow = {
  label: string;
  value: string;
  detail?: string;
};

export type BreakdownGroup = {
  title: string;
  rows: BreakdownRow[];
};

export type SmartRefillUserRecord = {
  id: string;
  data: Record<string, unknown>;
  createdAt: Date | null;
};

export type UserGrowthSignalsInput = {
  users: SmartRefillUserRecord[];
  businesses: BusinessSnapshot[];
  ownerLastActive: Map<string, string>;
  userRoleCounts: SmartRefillUserRoleCounts;
  smartRefillUsers: number;
  ownerUserGrowth: { month: string; count: number }[];
  newOwnerSignupsThisMonth: number;
  ownerSignupDelta: number;
  activeLoginUsers: number;
  activeLoginUsersByRole: { owners: number; admins: number; riders: number };
  loginSessionsLast30Days: number;
  monthStart: Date;
  thirtyDayKey: string;
};

export type UserGrowthSignals = {
  acquisitionRows: BreakdownRow[];
  ownerPipelineRows: BreakdownRow[];
  teamExpansionRows: BreakdownRow[];
  priorityAccounts: BreakdownRow[];
  onboardingIncomplete: number;
  ownersWithoutWorkspace: number;
  zeroCustomerWorkspaces: number;
  adoptionGaps: number;
  inactiveOwners: number;
  conversionPipelineTotal: number;
  soloOwnerWorkspaces: number;
  workspacesWithoutAdmin: number;
  workspacesWithoutRider: number;
  avgTeamPerWorkspace: string;
  staffUsers: number;
  onboardedBusinesses: number;
  newOwnerSignupsThisMonth: number;
  ownerSignupDelta: number;
  activeLoginUsersByRole: { owners: number; admins: number; riders: number };
  activeUserAvgPerRole: string;
};

function getActiveSmartRefillAccess(appAccess: unknown): Record<string, unknown> | null {
  if (!Array.isArray(appAccess)) return null;

  const entry = appAccess.find((row) => {
    if (!row || typeof row !== "object") return false;
    const item = row as { appId?: string; accessRevoked?: boolean };
    return (
      String(item.appId || "") === SMARTREFILL_APP_ID &&
      item.accessRevoked !== true
    );
  });

  return entry && typeof entry === "object" ?
    (entry as Record<string, unknown>) :
    null;
}

function getSmartRefillBusinessId(userData: Record<string, unknown>): string | undefined {
  const access = getActiveSmartRefillAccess(userData.appAccess);
  return typeof access?.businessId === "string" ? access.businessId : undefined;
}

function buildStaffByBusiness(
  users: SmartRefillUserRecord[],
  businessOwnerIds: Set<string>,
): Map<string, { admins: number; riders: number }> {
  const staffByBusiness = new Map<string, { admins: number; riders: number }>();

  users.forEach(({ id, data }) => {
    const businessId = getSmartRefillBusinessId(data);
    if (!businessId) return;

    const role = resolveSmartRefillUserRole(id, data, businessOwnerIds);
    if (role !== "admin" && role !== "rider") return;

    const bucket = staffByBusiness.get(businessId) ?? { admins: 0, riders: 0 };
    if (role === "admin") bucket.admins += 1;
    if (role === "rider") bucket.riders += 1;
    staffByBusiness.set(businessId, bucket);
  });

  return staffByBusiness;
}

function isOwnerActive(
  ownerId: string | undefined,
  ownerLastActive: Map<string, string>,
  thirtyDayKey: string,
): boolean {
  if (!ownerId) return false;
  const lastActive = ownerLastActive.get(ownerId);
  return Boolean(lastActive && lastActive >= thirtyDayKey);
}

function quarterKey(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

function parseGrowthMonth(month: string): Date {
  const parsed = new Date(`1 ${month}`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function quarterSortValue(label: string): number {
  const match = label.match(/^Q(\d)\s(\d{4})$/);
  if (!match) return 0;
  return Number(match[2]) * 10 + Number(match[1]);
}

export function buildQuarterSignupRows(
  userGrowth: { month: string; count: number }[],
): BreakdownRow[] {
  const byQuarter = new Map<string, number>();

  userGrowth.forEach(({ month, count }) => {
    const key = quarterKey(parseGrowthMonth(month));
    byQuarter.set(key, (byQuarter.get(key) || 0) + count);
  });

  const sortedQuarters = [...byQuarter.entries()].sort(
    (a, b) => quarterSortValue(a[0]) - quarterSortValue(b[0]),
  );

  if (sortedQuarters.length === 0) {
    return [
      {
        label: "Past quarter",
        value: "0 owner signups",
        detail: "Owner signups for the prior quarter",
      },
      {
        label: "Current quarter",
        value: "0 owner signups",
        detail: "Owner signups this quarter",
      },
    ];
  }

  if (sortedQuarters.length === 1) {
    const onlyQuarter = sortedQuarters[0];
    if (!onlyQuarter) {
      return [
        {
          label: "Past quarter",
          value: "0 owner signups",
          detail: "Owner signups for the prior quarter",
        },
        {
          label: "Current quarter",
          value: "0 owner signups",
          detail: "Owner signups this quarter",
        },
      ];
    }
    const [label, count] = onlyQuarter;
    return [
      {
        label: `Past quarter (${label})`,
        value: "0 owner signups",
        detail: "No owner signup data for the prior quarter",
      },
      {
        label: `Current quarter (${label})`,
        value: `${count} owner signups`,
        detail: "Owner signups this quarter",
      },
    ];
  }

  const pastQuarter = sortedQuarters[sortedQuarters.length - 2];
  const currentQuarter = sortedQuarters[sortedQuarters.length - 1];
  if (!pastQuarter || !currentQuarter) {
    return [
      {
        label: "Past quarter",
        value: "0 owner signups",
        detail: "Owner signups for the prior quarter",
      },
      {
        label: "Current quarter",
        value: "0 owner signups",
        detail: "Owner signups this quarter",
      },
    ];
  }
  return [
    {
      label: `Past quarter (${pastQuarter[0]})`,
      value: `${pastQuarter[1]} owner signups`,
      detail: "Owner signups for the prior quarter",
    },
    {
      label: `Current quarter (${currentQuarter[0]})`,
      value: `${currentQuarter[1]} owner signups`,
      detail: "Owner signups this quarter",
    },
  ];
}

function buildActiveUsersPerRoleRows(input: {
  activeLoginUsersByRole: { owners: number; admins: number; riders: number };
  activeUserAvgPerRole: string;
}): BreakdownRow[] {
  const { activeLoginUsersByRole, activeUserAvgPerRole } = input;

  return [
    {
      label: "Owners",
      value: `${activeLoginUsersByRole.owners}`,
      detail: "Active owner logins in the last 30 days",
    },
    {
      label: "Admins",
      value: `${activeLoginUsersByRole.admins}`,
      detail: "Active admin logins in the last 30 days",
    },
    {
      label: "Riders",
      value: `${activeLoginUsersByRole.riders}`,
      detail: "Active rider logins in the last 30 days",
    },
    {
      label: "Average per role",
      value: activeUserAvgPerRole,
      detail: "Mean active users across owner, admin, and rider",
    },
  ];
}

export function computeUserGrowthSignals(
  input: UserGrowthSignalsInput,
): UserGrowthSignals {
  const {
    users,
    businesses,
    ownerLastActive,
    userRoleCounts,
    smartRefillUsers,
    ownerUserGrowth,
    activeLoginUsers,
    activeLoginUsersByRole,
    loginSessionsLast30Days,
    monthStart,
    thirtyDayKey,
  } = input;

  const businessOwnerIds = new Set(
    businesses
      .map((business) => business.ownerId)
      .filter((ownerId): ownerId is string => typeof ownerId === "string"),
  );

  const newOwnerSignupsThisMonth = users.filter(({ id, data, createdAt }) => {
    if (!createdAt || createdAt < monthStart) return false;
    return resolveSmartRefillUserRole(id, data, businessOwnerIds) === "owner";
  }).length;

  const ownerGrowthLastTwo = ownerUserGrowth.slice(-2);
  const ownerSignupDelta =
    (ownerGrowthLastTwo[1]?.count ?? newOwnerSignupsThisMonth) -
    (ownerGrowthLastTwo[0]?.count ?? 0);

  const staffByBusiness = buildStaffByBusiness(users, businessOwnerIds);
  const onboardedBusinessList = businesses.filter((business) => business.onboardingComplete);
  const onboardingIncompleteList = businesses.filter((business) => !business.onboardingComplete);
  const zeroCustomerList = onboardedBusinessList.filter(
    (business) => business.customers === 0,
  );
  const adoptionGapList = onboardedBusinessList.filter(
    (business) => business.gettingStartedCompleted < 3,
  );
  const inactiveOwnerList = businesses.filter(
    (business) =>
      business.customers > 0 &&
      business.transactionsLast30Days === 0 &&
      !isOwnerActive(business.ownerId, ownerLastActive, thirtyDayKey),
  );

  const ownersWithoutWorkspace = users.filter(({ id, data }) => {
    const role = resolveSmartRefillUserRole(id, data, businessOwnerIds);
    return role === "owner" && !businessOwnerIds.has(id);
  }).length;

  const workspacesWithoutAdmin = onboardedBusinessList.filter((business) => {
    const staff = staffByBusiness.get(business.id);
    return !staff || staff.admins === 0;
  });
  const workspacesWithoutRider = onboardedBusinessList.filter((business) => {
    const staff = staffByBusiness.get(business.id);
    return !staff || staff.riders === 0;
  });
  const soloOwnerWorkspaceList = onboardedBusinessList.filter((business) => {
    const staff = staffByBusiness.get(business.id);
    return !staff || (staff.admins === 0 && staff.riders === 0);
  });

  const staffUsers = userRoleCounts.admins + userRoleCounts.riders;
  const avgTeamPerWorkspace =
    onboardedBusinessList.length > 0 ?
      (staffUsers / onboardedBusinessList.length).toFixed(1) :
      "0";
  const activationRate =
    smartRefillUsers > 0 ?
      Math.round((activeLoginUsers / smartRefillUsers) * 100) :
      0;

  const onboardingIncomplete = onboardingIncompleteList.length;
  const zeroCustomerWorkspaces = zeroCustomerList.length;
  const adoptionGaps = adoptionGapList.length;
  const inactiveOwners = inactiveOwnerList.length;
  const soloOwnerWorkspaces = soloOwnerWorkspaceList.length;

  const conversionPipelineTotal =
    onboardingIncomplete +
    ownersWithoutWorkspace +
    zeroCustomerWorkspaces +
    adoptionGaps +
    inactiveOwners;

  const activeUserAvgPerRole = activeUserAveragePerRole(activeLoginUsersByRole);

  const acquisitionRows: BreakdownRow[] = [
    {
      label: "New owners this month",
      value: `+${newOwnerSignupsThisMonth}`,
      detail: `${ownerSignupDelta >= 0 ? "+" : ""}${ownerSignupDelta} vs prior month in owner signups`,
    },
    {
      label: "Activation rate (30d)",
      value: `${activationRate}%`,
      detail: `${activeLoginUsers} of ${smartRefillUsers} users logged in · ${loginSessionsLast30Days.toLocaleString()} sessions`,
    },
    ...buildQuarterSignupRows(ownerUserGrowth),
  ];

  const ownerPipelineRows: BreakdownRow[] = [
    {
      label: "Onboarding incomplete",
      value: `${onboardingIncomplete}`,
      detail: "Owners still setting up their workspace — high-touch conversion opportunity",
    },
    {
      label: "Owners without workspace",
      value: `${ownersWithoutWorkspace}`,
      detail: "Signed up as owner but no business created yet",
    },
    {
      label: "Onboarded, zero customers",
      value: `${zeroCustomerWorkspaces}`,
      detail: "Workspace live but no end-customers added — activation help needed",
    },
    {
      label: "Low product adoption",
      value: `${adoptionGaps}`,
      detail: "Onboarded owners with fewer than 3 getting-started steps done",
    },
    {
      label: "Inactive owner accounts",
      value: `${inactiveOwners}`,
      detail: "Has customers but no logins or transactions in the last 30 days",
    },
  ];

  const teamExpansionRows: BreakdownRow[] = [
    {
      label: "Solo-owner workspaces",
      value: `${soloOwnerWorkspaces}`,
      detail: "Onboarded with no admin or rider seats filled — team upsell potential",
    },
    {
      label: "No admin assigned",
      value: `${workspacesWithoutAdmin.length}`,
      detail: "Onboarded workspaces missing a back-office admin user",
    },
    {
      label: "No rider assigned",
      value: `${workspacesWithoutRider.length}`,
      detail: "Onboarded workspaces missing delivery / field staff",
    },
    {
      label: "Avg staff per workspace",
      value: avgTeamPerWorkspace,
      detail: `${staffUsers} admins + riders across ${onboardedBusinessList.length} onboarded workspaces`,
    },
  ];

  const priorityAccounts: BreakdownRow[] = [
    ...onboardingIncompleteList.slice(0, 4).map((business) => ({
      label: business.name,
      value: "Needs onboarding",
      detail: business.ownerEmail || "Owner email not on file",
    })),
    ...zeroCustomerList.slice(0, 3).map((business) => ({
      label: business.name,
      value: "0 customers",
      detail: `${business.gettingStartedCompleted}/9 setup steps · ${business.planName || "No plan"}`,
    })),
    ...inactiveOwnerList.slice(0, 3).map((business) => ({
      label: business.name,
      value: `${business.customers} customers`,
      detail: "No activity in 30 days — re-engagement candidate",
    })),
  ];

  if (priorityAccounts.length === 0) {
    priorityAccounts.push({
      label: "No urgent gaps",
      value: "Healthy",
      detail: "Owners are onboarding, activating, and staying active",
    });
  }

  return {
    acquisitionRows,
    ownerPipelineRows,
    teamExpansionRows,
    priorityAccounts,
    onboardingIncomplete,
    ownersWithoutWorkspace,
    zeroCustomerWorkspaces,
    adoptionGaps,
    inactiveOwners,
    conversionPipelineTotal,
    soloOwnerWorkspaces,
    workspacesWithoutAdmin: workspacesWithoutAdmin.length,
    workspacesWithoutRider: workspacesWithoutRider.length,
    avgTeamPerWorkspace,
    staffUsers,
    onboardedBusinesses: onboardedBusinessList.length,
    newOwnerSignupsThisMonth,
    ownerSignupDelta,
    activeLoginUsersByRole,
    activeUserAvgPerRole,
  };
}

export function buildUserGrowthBreakdownGroups(
  input: UserGrowthSignalsInput,
): BreakdownGroup[] {
  const signals = computeUserGrowthSignals(input);

  return [
    { title: "Acquisition momentum", rows: signals.acquisitionRows },
    {
      title: "Active user avg. per role",
      rows: buildActiveUsersPerRoleRows({
        activeLoginUsersByRole: signals.activeLoginUsersByRole,
        activeUserAvgPerRole: signals.activeUserAvgPerRole,
      }),
    },
  ];
}
