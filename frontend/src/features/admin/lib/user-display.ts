import type { AdminAppAccessEntry, AdminUserSummary } from "@/lib/admin/users";
import {
  appLabel,
  normalizeSmartRefillRole,
  smartRefillStaffSubRoleSelectValue,
} from "@/lib/admin/users";

export function formatRoleLabel(role?: string): string {
  if (!role) return "No role";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function userDisplayName(user: AdminUserSummary): string {
  return user.displayName || user.email || "Unnamed user";
}

export function userInitials(user: AdminUserSummary): string {
  const source = user.displayName || user.email || "?";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function activeAccessCount(appAccess: AdminAppAccessEntry[]): number {
  return appAccess.filter((row) => row.accessRevoked !== true).length;
}

export function permissionSummary(appAccess: AdminAppAccessEntry[]): string {
  const active = appAccess.filter((row) => row.accessRevoked !== true);
  if (active.length === 0) return "No app access";
  return active
    .map((row) => formatAppAccessLine(row))
    .join(", ");
}

export function formatAppAccessLine(entry: AdminAppAccessEntry): string {
  const role =
    entry.appId === "smartrefill" && entry.role ?
      normalizeSmartRefillRole(entry.role) ?? entry.role
    : entry.role;
  const subRole =
    entry.appId === "smartrefill" && role === "staff" && entry.staffSubRole ?
      smartRefillStaffSubRoleSelectValue(entry.staffSubRole)
    : undefined;
  const roleLabel =
    role ?
      subRole ?
        `${formatRoleLabel(role)} · ${formatRoleLabel(subRole)}`
      : formatRoleLabel(role)
    : "";
  const label = `${appLabel(entry.appId)}${roleLabel ? ` · ${roleLabel}` : ""}`;
  return entry.accessRevoked === true ? `${label} · Revoked` : label;
}

export function accessStatus(appAccess: AdminAppAccessEntry[]): {
  label: string;
  tone: "none" | "active" | "revoked";
} {
  if (appAccess.length === 0) {
    return { label: "No access", tone: "none" };
  }
  const active = activeAccessCount(appAccess);
  if (active === 0) {
    return { label: "All revoked", tone: "revoked" };
  }
  if (active === appAccess.length) {
    return {
      label: `${active} app${active === 1 ? "" : "s"}`,
      tone: "active",
    };
  }
  return {
    label: `${active} active · ${appAccess.length - active} revoked`,
    tone: "active",
  };
}

export type AdminUserSortBy = "name" | "lastSignIn" | "registered";
export type AdminUserSortOrder = "asc" | "desc";

export type AdminUserSortOption = {
  sortBy: AdminUserSortBy;
  order: AdminUserSortOrder;
  label: string;
};

export const ADMIN_USER_SORT_OPTIONS: AdminUserSortOption[] = [
  { sortBy: "name", order: "asc", label: "Name (A → Z)" },
  { sortBy: "name", order: "desc", label: "Name (Z → A)" },
  { sortBy: "lastSignIn", order: "desc", label: "Last sign-in (newest)" },
  { sortBy: "lastSignIn", order: "asc", label: "Last sign-in (oldest)" },
  { sortBy: "registered", order: "desc", label: "Registered (newest)" },
  { sortBy: "registered", order: "asc", label: "Registered (oldest)" },
];

function compareNullableDates(
  a?: string | null,
  b?: string | null,
): number {
  const ta = a ? Date.parse(a) : null;
  const tb = b ? Date.parse(b) : null;
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return ta - tb;
}

export function sortAdminUsers(
  users: AdminUserSummary[],
  sortBy: AdminUserSortBy,
  order: AdminUserSortOrder,
): AdminUserSummary[] {
  const dir = order === "asc" ? 1 : -1;

  return [...users].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = userDisplayName(a).localeCompare(userDisplayName(b), undefined, {
          sensitivity: "base",
        });
        break;
      case "lastSignIn":
        cmp = compareNullableDates(a.lastSignInAt, b.lastSignInAt);
        break;
      case "registered":
        cmp = compareNullableDates(a.registeredAt, b.registeredAt);
        break;
    }

    if (cmp === 0) {
      cmp = userDisplayName(a).localeCompare(userDisplayName(b), undefined, {
        sensitivity: "base",
      });
    }

    return cmp * dir;
  });
}

export function formatAdminTimestamp(value?: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
