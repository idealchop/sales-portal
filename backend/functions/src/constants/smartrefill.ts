export const SMARTREFILL_APP_ID = "smartrefill";

/** Roles that can be assigned in admin permissions and SmartRefill app access. */
export const SMARTREFILL_ASSIGNABLE_ROLES = ["owner", "staff"] as const;

export type SmartRefillAssignableRole =
  (typeof SMARTREFILL_ASSIGNABLE_ROLES)[number];

/** Legacy roles still stored on older records; normalized to staff on save. */
export const SMARTREFILL_LEGACY_ROLE_ALIASES = new Set(["admin", "rider"]);

export function isValidSmartRefillRole(role: string): boolean {
  const normalized = role.trim().toLowerCase();
  return (
    (SMARTREFILL_ASSIGNABLE_ROLES as readonly string[]).includes(normalized) ||
    SMARTREFILL_LEGACY_ROLE_ALIASES.has(normalized)
  );
}

export function normalizeSmartRefillRole(
  role?: string,
): SmartRefillAssignableRole | undefined {
  if (!role) return undefined;
  const normalized = role.trim().toLowerCase();
  if (normalized === "owner") return "owner";
  if (
    normalized === "staff" ||
    normalized === "admin" ||
    normalized === "rider"
  ) {
    return "staff";
  }
  return undefined;
}

/** Seat role on `businesses/{id}/members/{uid}` for staff users. */
export const SMARTREFILL_STAFF_SUB_ROLES = ["admin", "rider"] as const;

export type SmartRefillStaffSubRole =
  (typeof SMARTREFILL_STAFF_SUB_ROLES)[number];

export function isValidSmartRefillStaffSubRole(role: string): boolean {
  const normalized = role.trim().toLowerCase();
  return (SMARTREFILL_STAFF_SUB_ROLES as readonly string[]).includes(normalized);
}

/** Resolve admin/rider seat from a workspace member document. */
export function resolveMemberStaffSubRole(
  memberData: Record<string, unknown>,
): SmartRefillStaffSubRole | undefined {
  const directRole = normalizeSmartRefillStaffSubRole(memberData.role);
  if (directRole === "admin") return "admin";

  const normalizedRole = String(memberData.role ?? "")
    .trim()
    .toLowerCase();
  if (normalizedRole === "staff") {
    const fromSubRole = normalizeSmartRefillStaffSubRole(memberData.staffSubRole);
    if (fromSubRole) return fromSubRole;
  }

  if (directRole === "rider") return "rider";
  return undefined;
}

/** Legacy member / appAccess values map to admin or rider seats. */
export function normalizeSmartRefillStaffSubRole(
  role?: unknown,
): SmartRefillStaffSubRole | undefined {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "rider" || normalized === "staff") return "rider";
  return undefined;
}
