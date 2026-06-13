import { SMARTREFILL_APP_ID } from "../constants/smartrefill";

export type SmartRefillUserRoleCounts = {
  owners: number;
  admins: number;
  riders: number;
  unassigned: number;
};

type SmartRefillRole = "owner" | "admin" | "rider" | "unassigned";

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

function normalizeRole(raw: string): SmartRefillRole | null {
  const role = raw.trim().toLowerCase();
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "rider" || role === "staff") return "rider";
  return null;
}

export function resolveSmartRefillUserRole(
  uid: string,
  userData: Record<string, unknown>,
  businessOwnerIds: Set<string>,
): SmartRefillRole {
  const access = getActiveSmartRefillAccess(userData.appAccess);
  const accessRole =
    access && typeof access.role === "string" ?
      normalizeRole(access.role) :
      null;

  if (accessRole) return accessRole;
  if (businessOwnerIds.has(uid)) return "owner";
  return "unassigned";
}

export function filterOwnerSmartRefillUsers(
  users: Array<{ id: string; data: Record<string, unknown> }>,
  businessOwnerIds: Set<string>,
): Array<{ id: string; data: Record<string, unknown> }> {
  return users.filter(
    ({ id, data }) =>
      resolveSmartRefillUserRole(id, data, businessOwnerIds) === "owner",
  );
}
export function countActiveUsersByRole(
  activeUserIds: Set<string>,
  users: Array<{ id: string; data: Record<string, unknown> }>,
  businessOwnerIds: Set<string>,
): { owners: number; admins: number; riders: number } {
  const counts = { owners: 0, admins: 0, riders: 0 };

  activeUserIds.forEach((uid) => {
    const user = users.find((entry) => entry.id === uid);
    if (!user) return;

    const role = resolveSmartRefillUserRole(uid, user.data, businessOwnerIds);
    if (role === "owner") {
      counts.owners += 1;
    } else if (role === "admin") {
      counts.admins += 1;
    } else if (role === "rider") {
      counts.riders += 1;
    }
  });

  return counts;
}

export function activeUserAveragePerRole(counts: {
  owners: number;
  admins: number;
  riders: number;
}): string {
  return ((counts.owners + counts.admins + counts.riders) / 3).toFixed(1);
}

export function countSmartRefillUserRoles(
  users: Array<{ id: string; data: Record<string, unknown> }>,
  businessOwnerIds: Set<string>,
): SmartRefillUserRoleCounts {
  const counts: SmartRefillUserRoleCounts = {
    owners: 0,
    admins: 0,
    riders: 0,
    unassigned: 0,
  };

  users.forEach(({ id, data }) => {
    const role = resolveSmartRefillUserRole(id, data, businessOwnerIds);
    if (role === "owner") {
      counts.owners += 1;
    } else if (role === "admin") {
      counts.admins += 1;
    } else if (role === "rider") {
      counts.riders += 1;
    } else {
      counts.unassigned += 1;
    }
  });

  return counts;
}

function rolePercent(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

export function buildUserRoleBreakdown(
  counts: SmartRefillUserRoleCounts,
  totalUsers: number,
): Array<{ label: string; value: string; detail?: string }> {
  const rows = [
    {
      label: "Owners",
      value: counts.owners.toLocaleString(),
      detail: `${rolePercent(counts.owners, totalUsers)} of SmartRefill users · workspace owners`,
    },
    {
      label: "Admins",
      value: counts.admins.toLocaleString(),
      detail: `${rolePercent(counts.admins, totalUsers)} of SmartRefill users · back-office staff`,
    },
    {
      label: "Riders",
      value: counts.riders.toLocaleString(),
      detail: `${rolePercent(counts.riders, totalUsers)} of SmartRefill users · field / delivery staff`,
    },
  ];

  if (counts.unassigned > 0) {
    rows.push({
      label: "Unassigned",
      value: counts.unassigned.toLocaleString(),
      detail: `${rolePercent(counts.unassigned, totalUsers)} of SmartRefill users · role not set in app access`,
    });
  }

  return rows;
}
