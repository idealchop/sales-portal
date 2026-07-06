export type DataManagementLinkStatus = "linked" | "no_business" | "no_user";

export type DataManagementStaffRole = "admin" | "rider";

export type DataManagementMemberBreakdown = {
  admins: number;
  riders: number;
};

export type DataManagementActiveSubscription = {
  planName: string;
  planCode?: string;
  billingCycle?: string;
  status: string;
  addonNames: string[];
  createdAt?: string;
  activatedAt?: string;
  activatesAt?: string;
  expiresAt?: string;
};

export type DataManagementLinkRow = {
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  userPhotoURL?: string;
  businessId?: string;
  businessName?: string;
  ownerId?: string;
  ownerDisplayName?: string;
  memberBreakdown?: DataManagementMemberBreakdown;
  activeSubscription?: DataManagementActiveSubscription;
  status: DataManagementLinkStatus;
  /** Present on staff rows (admin or rider). */
  staffRole?: DataManagementStaffRole;
  /** Firebase Auth last sign-in for the linked user, when available. */
  lastSignInAt?: string | null;
};

export type DataManagementOverview = {
  owners: DataManagementLinkRow[];
  staff: DataManagementLinkRow[];
};

export function dataManagementStatusLabel(status: DataManagementLinkStatus): string {
  switch (status) {
    case "linked":
      return "Linked";
    case "no_business":
      return "No business";
    case "no_user":
      return "No user";
  }
}

export function dataManagementUserLabel(row: DataManagementLinkRow): string {
  return row.userDisplayName || row.userEmail || row.userId || "—";
}

export function dataManagementStaffRoleLabel(
  role?: DataManagementStaffRole,
): string {
  if (role === "admin") return "Admin";
  if (role === "rider") return "Rider";
  return "—";
}

export function dataManagementBusinessLabel(row: DataManagementLinkRow): string {
  return row.businessName || row.businessId || "—";
}

export function formatMemberBreakdown(
  breakdown?: DataManagementMemberBreakdown,
): string | undefined {
  if (!breakdown) return undefined;
  const adminLabel = `${breakdown.admins} admin${breakdown.admins === 1 ? "" : "s"}`;
  const riderLabel = `${breakdown.riders} rider${breakdown.riders === 1 ? "" : "s"}`;
  return `${adminLabel} · ${riderLabel}`;
}

export function formatActiveSubscriptionTitle(
  subscription?: DataManagementActiveSubscription,
): string {
  if (!subscription) return "—";
  if (subscription.addonNames.length === 0) return subscription.planName;
  return [subscription.planName, ...subscription.addonNames].join(" · ");
}

export type DataManagementSortBy =
  | "user"
  | "business"
  | "status"
  | "role"
  | "lastSignIn";
export type DataManagementSortOrder = "asc" | "desc";

export type DataManagementSortOption = {
  sortBy: DataManagementSortBy;
  order: DataManagementSortOrder;
  label: string;
};

export const DATA_MANAGEMENT_SORT_OPTIONS: DataManagementSortOption[] = [
  { sortBy: "lastSignIn", order: "desc", label: "Last sign-in (newest)" },
  { sortBy: "lastSignIn", order: "asc", label: "Last sign-in (oldest)" },
  { sortBy: "user", order: "asc", label: "User (A → Z)" },
  { sortBy: "user", order: "desc", label: "User (Z → A)" },
  { sortBy: "business", order: "asc", label: "Business (A → Z)" },
  { sortBy: "business", order: "desc", label: "Business (Z → A)" },
  { sortBy: "status", order: "asc", label: "Status (linked first)" },
  { sortBy: "status", order: "desc", label: "Status (issues first)" },
  { sortBy: "role", order: "asc", label: "Role (admin first)" },
  { sortBy: "role", order: "desc", label: "Role (rider first)" },
];

export type DataManagementStatusFilter = "all" | DataManagementLinkStatus;
export type DataManagementStaffRoleFilter = "all" | DataManagementStaffRole;
export type DataManagementSubscriptionFilter = string;

export const DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL = "all";
export const DATA_MANAGEMENT_SUBSCRIPTION_FILTER_NONE = "no_subscription";

export const DATA_MANAGEMENT_PAGE_SIZE_OPTIONS = [5, 8, 10, 15, 20, 25] as const;
export const DEFAULT_DATA_MANAGEMENT_PAGE_SIZE = 10;

export type DataManagementPageSize =
  (typeof DATA_MANAGEMENT_PAGE_SIZE_OPTIONS)[number];

const STATUS_SORT_ORDER: Record<DataManagementLinkStatus, number> = {
  linked: 0,
  no_business: 1,
  no_user: 2,
};

export function rowSearchText(row: DataManagementLinkRow): string {
  return [
    row.userDisplayName,
    row.userEmail,
    row.userId,
    row.businessName,
    row.businessId,
    row.ownerDisplayName,
    row.ownerId,
    formatMemberBreakdown(row.memberBreakdown),
    row.activeSubscription ?
      formatActiveSubscriptionTitle(row.activeSubscription)
    : undefined,
    dataManagementStatusLabel(row.status),
    row.staffRole ? dataManagementStaffRoleLabel(row.staffRole) : undefined,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function subscriptionDisplayTitle(
  row: DataManagementLinkRow,
): string | null {
  if (!row.activeSubscription) return null;
  return formatActiveSubscriptionTitle(row.activeSubscription);
}

export function buildSubscriptionFilterOptions(
  rows: DataManagementLinkRow[],
): { value: DataManagementSubscriptionFilter; label: string }[] {
  const titles = new Set<string>();
  let hasNone = false;

  for (const row of rows) {
    const title = subscriptionDisplayTitle(row);
    if (title) titles.add(title);
    else hasNone = true;
  }

  const options: { value: DataManagementSubscriptionFilter; label: string }[] = [
    { value: DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL, label: "All subscriptions" },
  ];

  for (const title of [...titles].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  )) {
    options.push({ value: title, label: title });
  }

  if (hasNone) {
    options.push({
      value: DATA_MANAGEMENT_SUBSCRIPTION_FILTER_NONE,
      label: "No subscription",
    });
  }

  return options;
}

function matchesSubscriptionFilter(
  row: DataManagementLinkRow,
  subscriptionFilter: DataManagementSubscriptionFilter,
): boolean {
  if (subscriptionFilter === DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL) {
    return true;
  }
  if (subscriptionFilter === DATA_MANAGEMENT_SUBSCRIPTION_FILTER_NONE) {
    return !row.activeSubscription;
  }
  return subscriptionDisplayTitle(row) === subscriptionFilter;
}

export function filterDataManagementRows(
  rows: DataManagementLinkRow[],
  query: string,
  statusFilter: DataManagementStatusFilter,
  staffRoleFilter: DataManagementStaffRoleFilter = "all",
  subscriptionFilter: DataManagementSubscriptionFilter = "all",
): DataManagementLinkRow[] {
  const q = query.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesStatus =
      statusFilter === "all" || row.status === statusFilter;
    const matchesStaffRole =
      staffRoleFilter === "all" || row.staffRole === staffRoleFilter;
    const matchesSubscription = matchesSubscriptionFilter(
      row,
      subscriptionFilter,
    );
    const matchesQuery = !q || rowSearchText(row).includes(q);
    return (
      matchesStatus &&
      matchesStaffRole &&
      matchesSubscription &&
      matchesQuery
    );
  });
}

const STAFF_ROLE_SORT_ORDER: Record<DataManagementStaffRole, number> = {
  admin: 0,
  rider: 1,
};

export function sortDataManagementRows(
  rows: DataManagementLinkRow[],
  sortBy: DataManagementSortBy,
  order: DataManagementSortOrder,
): DataManagementLinkRow[] {
  const dir = order === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    let cmp = 0;

    switch (sortBy) {
      case "user":
        cmp = dataManagementUserLabel(a).localeCompare(
          dataManagementUserLabel(b),
          undefined,
          { sensitivity: "base" },
        );
        break;
      case "business":
        cmp = dataManagementBusinessLabel(a).localeCompare(
          dataManagementBusinessLabel(b),
          undefined,
          { sensitivity: "base" },
        );
        break;
      case "status":
        cmp = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
        break;
      case "role":
        cmp =
          (a.staffRole ? STAFF_ROLE_SORT_ORDER[a.staffRole] : 99) -
          (b.staffRole ? STAFF_ROLE_SORT_ORDER[b.staffRole] : 99);
        break;
      case "lastSignIn": {
        const ta = a.lastSignInAt ? Date.parse(a.lastSignInAt) : null;
        const tb = b.lastSignInAt ? Date.parse(b.lastSignInAt) : null;
        if (ta === null && tb === null) {
          cmp = 0;
        } else if (ta === null) {
          cmp = 1;
        } else if (tb === null) {
          cmp = -1;
        } else {
          cmp = order === "desc" ? tb - ta : ta - tb;
        }
        if (cmp !== 0) {
          return cmp;
        }
        cmp = dataManagementUserLabel(a).localeCompare(
          dataManagementUserLabel(b),
          undefined,
          { sensitivity: "base" },
        );
        return cmp;
      }
    }

    if (cmp === 0) {
      cmp = dataManagementUserLabel(a).localeCompare(
        dataManagementUserLabel(b),
        undefined,
        { sensitivity: "base" },
      );
    }

    return cmp * dir;
  });
}
