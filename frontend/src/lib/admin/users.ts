export type AdminAppAccessEntry = {
  appId: string;
  role?: string;
  businessId?: string;
  /** Admin or rider seat from `businesses/{businessId}/members/{uid}`. */
  staffSubRole?: string;
  accessRevoked?: boolean;
  onboardingComplete?: boolean;
};

export type AuthAccountTag = "test";

export type AdminUserSummary = {
  uid: string;
  email?: string;
  displayName?: string;
  appAccess: AdminAppAccessEntry[];
  createdAt?: string | null;
  registeredAt?: string | null;
  lastSignInAt?: string | null;
  hasRiverDbProfile: boolean;
  authAccountTag?: AuthAccountTag | null;
};

export type AdminUserPermissionsInput = {
  appAccess: AdminAppAccessEntry[];
  authAccountTag: AuthAccountTag | null;
};

export const SMARTREFILL_ROLE_OPTIONS = [
  {
    value: "owner",
    label: "Owner",
    description: "Workspace owner with full control",
  },
  {
    value: "staff",
    label: "Staff",
    description: "Team member for a workspace",
  },
] as const;

export type SmartRefillStaffSubRole = "admin" | "rider";

export const SMARTREFILL_STAFF_SUB_ROLE_OPTIONS = [
  {
    value: "admin" as const,
    label: "Admin",
    description: "Back-office staff for the workspace",
  },
  {
    value: "rider" as const,
    label: "Rider",
    description: "Field / delivery staff",
  },
];

export const ADMIN_KNOWN_APPS = [
  {
    appId: "sales-portal",
    label: "Sales Portal",
    roles: ["admin", "manager", "sales"],
  },
  {
    appId: "smartrefill",
    label: "SmartRefill",
    roles: SMARTREFILL_ROLE_OPTIONS.map((role) => role.value),
  },
] as const;

export function appLabel(appId: string): string {
  return (
    ADMIN_KNOWN_APPS.find((app) => app.appId === appId)?.label ?? appId
  );
}

export function rolesForApp(appId: string): string[] {
  return (
    ADMIN_KNOWN_APPS.find((app) => app.appId === appId)?.roles.slice() ?? []
  );
}

export function normalizeSmartRefillRole(role?: string): string | undefined {
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

export function smartRefillRoleSelectValue(role?: string): string {
  return normalizeSmartRefillRole(role) ?? role ?? "";
}

export function smartRefillStaffSubRoleSelectValue(
  staffSubRole?: string,
): SmartRefillStaffSubRole | "" {
  const normalized = staffSubRole?.trim().toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "rider" || normalized === "staff") return "rider";
  return "";
}
