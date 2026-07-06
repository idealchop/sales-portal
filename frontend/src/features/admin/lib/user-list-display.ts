import type { AdminUserSummary } from "@/lib/admin/users";
import { appLabel } from "@/lib/admin/users";
import { formatRoleLabel, userDisplayName } from "@/features/admin/lib/user-display";

export type AdminUserRowDisplay = {
  avatar: boolean;
  email: boolean;
  statusBadge: boolean;
  authOnlyBadge: boolean;
  testAccountBadge: boolean;
  permissions: boolean;
  lastSignIn: boolean;
  registered: boolean;
  userId: boolean;
};

export const DEFAULT_ADMIN_USER_ROW_DISPLAY: AdminUserRowDisplay = {
  avatar: true,
  email: true,
  statusBadge: true,
  authOnlyBadge: true,
  testAccountBadge: true,
  permissions: true,
  lastSignIn: true,
  registered: true,
  userId: false,
};

export const ADMIN_USER_CARD_DISPLAY_OPTIONS: {
  key: keyof AdminUserRowDisplay;
  label: string;
}[] = [
  { key: "avatar", label: "Avatar" },
  { key: "email", label: "Email" },
  { key: "statusBadge", label: "Access status" },
  { key: "authOnlyBadge", label: "Auth-only badge" },
  { key: "testAccountBadge", label: "Test account badge" },
  { key: "permissions", label: "App permissions (list)" },
  { key: "lastSignIn", label: "Last sign-in (Auth)" },
  { key: "registered", label: "Registered (Auth created)" },
  { key: "userId", label: "User ID" },
];

/** @deprecated Use ADMIN_USER_CARD_DISPLAY_OPTIONS */
export const ADMIN_USER_ROW_DISPLAY_OPTIONS = ADMIN_USER_CARD_DISPLAY_OPTIONS;

const CARD_DISPLAY_STORAGE_KEY = "sales-portal.admin-user-card-display";
const LEGACY_ROW_DISPLAY_STORAGE_KEY = "sales-portal.admin-user-row-display";
const PAGE_SIZE_STORAGE_KEY = "sales-portal.admin-user-page-size";

export const ADMIN_USER_PAGE_SIZE_OPTIONS = [5, 8, 10, 15, 20, 25, 50] as const;
export const DEFAULT_ADMIN_USER_PAGE_SIZE = 8;

export type AdminUserPageSize = (typeof ADMIN_USER_PAGE_SIZE_OPTIONS)[number];

export function loadAdminUserCardDisplay(): AdminUserRowDisplay {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_USER_ROW_DISPLAY;
  }

  try {
    const stored =
      localStorage.getItem(CARD_DISPLAY_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_ROW_DISPLAY_STORAGE_KEY);
    if (!stored) return DEFAULT_ADMIN_USER_ROW_DISPLAY;
    return { ...DEFAULT_ADMIN_USER_ROW_DISPLAY, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_ADMIN_USER_ROW_DISPLAY;
  }
}

/** @deprecated Use loadAdminUserCardDisplay */
export const loadAdminUserRowDisplay = loadAdminUserCardDisplay;

export function saveAdminUserCardDisplay(display: AdminUserRowDisplay): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CARD_DISPLAY_STORAGE_KEY, JSON.stringify(display));
}

/** @deprecated Use saveAdminUserCardDisplay */
export const saveAdminUserRowDisplay = saveAdminUserCardDisplay;

export function loadAdminUserPageSize(): AdminUserPageSize {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_USER_PAGE_SIZE;
  }

  try {
    const stored = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    if (!stored) return DEFAULT_ADMIN_USER_PAGE_SIZE;
    const parsed = Number.parseInt(stored, 10);
    return ADMIN_USER_PAGE_SIZE_OPTIONS.includes(parsed as AdminUserPageSize) ?
        (parsed as AdminUserPageSize)
      : DEFAULT_ADMIN_USER_PAGE_SIZE;
  } catch {
    return DEFAULT_ADMIN_USER_PAGE_SIZE;
  }
}

export function saveAdminUserPageSize(size: AdminUserPageSize): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
}

export type DeleteImpactItem = {
  label: string;
  detail?: string;
};

export function describeUserDeleteImpact(user: AdminUserSummary): DeleteImpactItem[] {
  const items: DeleteImpactItem[] = [];

  if (user.email || user.displayName) {
    items.push({
      label: "Account",
      detail: userDisplayName(user) + (user.email ? ` (${user.email})` : ""),
    });
  }

  items.push({
    label: "Firebase Authentication login",
    detail: user.hasRiverDbProfile || user.registeredAt ?
      "Sign-in credentials and session history"
    : "Auth-only account — no RiverDB profile yet",
  });

  if (user.hasRiverDbProfile) {
    items.push({
      label: "RiverDB user profile",
      detail: "Profile data stored in the shared users collection",
    });
  }

  const activeAccess = user.appAccess.filter((row) => row.accessRevoked !== true);
  if (activeAccess.length > 0) {
    items.push({
      label: `${activeAccess.length} active app permission${activeAccess.length === 1 ? "" : "s"}`,
      detail: activeAccess
        .map(
          (row) =>
            `${appLabel(row.appId)}${row.role ? ` (${formatRoleLabel(row.role)})` : ""}`,
        )
        .join(", "),
    });
  }

  const revokedAccess = user.appAccess.filter((row) => row.accessRevoked === true);
  if (revokedAccess.length > 0) {
    items.push({
      label: `${revokedAccess.length} revoked permission${revokedAccess.length === 1 ? "" : "s"}`,
      detail: revokedAccess.map((row) => appLabel(row.appId)).join(", "),
    });
  }

  return items;
}

export function describeBulkDeleteImpact(users: AdminUserSummary[]): {
  items: DeleteImpactItem[];
  summary: string;
} {
  const authCount = users.filter((user) => user.registeredAt || !user.hasRiverDbProfile).length;
  const profileCount = users.filter((user) => user.hasRiverDbProfile).length;
  const withAccess = users.filter((user) =>
    user.appAccess.some((row) => row.accessRevoked !== true),
  ).length;

  const items: DeleteImpactItem[] = [
    {
      label: `${users.length} account${users.length === 1 ? "" : "s"}`,
      detail: users
        .slice(0, 5)
        .map((user) => userDisplayName(user))
        .join(", ") + (users.length > 5 ? `, and ${users.length - 5} more` : ""),
    },
    {
      label: "Firebase Authentication logins",
      detail: `${authCount} login${authCount === 1 ? "" : "s"} will be permanently removed`,
    },
  ];

  if (profileCount > 0) {
    items.push({
      label: "RiverDB profiles",
      detail: `${profileCount} profile${profileCount === 1 ? "" : "s"} will be deleted`,
    });
  }

  if (withAccess > 0) {
    items.push({
      label: "App permissions",
      detail: `${withAccess} user${withAccess === 1 ? "" : "s"} will lose active app access`,
    });
  }

  return {
    items,
    summary: `This will permanently delete ${users.length} account${users.length === 1 ? "" : "s"}. This cannot be undone.`,
  };
}
