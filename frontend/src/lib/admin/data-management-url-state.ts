import {
  DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL,
  DEFAULT_DATA_MANAGEMENT_PAGE_SIZE,
  type DataManagementPageSize,
  type DataManagementSortBy,
  type DataManagementSortOrder,
  type DataManagementStaffRoleFilter,
  type DataManagementStatusFilter,
  type DataManagementSubscriptionFilter,
} from "@/lib/admin/data-management";

export type DataManagementRoleTab = "owners" | "staff";

export type DataManagementUrlState = {
  tab: DataManagementRoleTab;
  q: string;
  status: DataManagementStatusFilter;
  staffRole: DataManagementStaffRoleFilter;
  subscription: DataManagementSubscriptionFilter;
  sortBy: DataManagementSortBy;
  sortOrder: DataManagementSortOrder;
  page: number;
  pageSize: DataManagementPageSize;
};

const PAGE_SIZE_SET = new Set<number>([5, 8, 10, 15, 20, 25]);

const DEFAULT_URL_STATE: DataManagementUrlState = {
  tab: "owners",
  q: "",
  status: "all",
  staffRole: "all",
  subscription: DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL,
  sortBy: "user",
  sortOrder: "asc",
  page: 1,
  pageSize: DEFAULT_DATA_MANAGEMENT_PAGE_SIZE,
};

function parsePageSize(value: string | null): DataManagementPageSize {
  const parsed = Number(value);
  if (PAGE_SIZE_SET.has(parsed)) {
    return parsed as DataManagementPageSize;
  }
  return DEFAULT_DATA_MANAGEMENT_PAGE_SIZE;
}

function parseSort(
  value: string | null,
): Pick<DataManagementUrlState, "sortBy" | "sortOrder"> {
  const [sortBy, sortOrder] = (value ?? "user:asc").split(":");
  const validSortBy: DataManagementSortBy[] = [
    "user",
    "business",
    "status",
    "role",
  ];
  const validSortOrder: DataManagementSortOrder[] = ["asc", "desc"];
  return {
    sortBy:
      validSortBy.includes(sortBy as DataManagementSortBy) ?
        (sortBy as DataManagementSortBy)
      : "user",
    sortOrder:
      validSortOrder.includes(sortOrder as DataManagementSortOrder) ?
        (sortOrder as DataManagementSortOrder)
      : "asc",
  };
}

export function parseDataManagementSearchParams(
  searchParams: URLSearchParams,
): DataManagementUrlState {
  const tab =
    searchParams.get("tab") === "staff" ? "staff" : DEFAULT_URL_STATE.tab;
  const status = searchParams.get("status");
  const staffRole = searchParams.get("staffRole");
  const subscription = searchParams.get("subscription");
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  return {
    tab,
    q: searchParams.get("q") ?? "",
    status:
      status === "linked" || status === "no_business" || status === "no_user" ?
        status
      : "all",
    staffRole: staffRole === "admin" || staffRole === "rider" ? staffRole : "all",
    subscription: subscription ?? DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL,
    ...parseSort(searchParams.get("sort")),
    page,
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildDataManagementSearchParams(
  state: DataManagementUrlState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.tab !== DEFAULT_URL_STATE.tab) params.set("tab", state.tab);
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.status !== "all") params.set("status", state.status);
  if (state.staffRole !== "all") params.set("staffRole", state.staffRole);
  if (state.subscription !== DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL) {
    params.set("subscription", state.subscription);
  }
  if (state.sortBy !== "user" || state.sortOrder !== "asc") {
    params.set("sort", `${state.sortBy}:${state.sortOrder}`);
  }
  if (state.page > 1) params.set("page", String(state.page));
  if (state.pageSize !== DEFAULT_DATA_MANAGEMENT_PAGE_SIZE) {
    params.set("pageSize", String(state.pageSize));
  }

  return params;
}

export function dataManagementPath(state?: DataManagementUrlState): string {
  const params = buildDataManagementSearchParams(state ?? DEFAULT_URL_STATE);
  const query = params.toString();
  return query ? `/admin/data-management?${query}` : "/admin/data-management";
}

export function businessInfoPath(
  businessId: string,
  returnTo: string,
  userId?: string,
): string {
  const params = new URLSearchParams({ returnTo });
  if (userId) params.set("userId", userId);
  return `/admin/data-management/business/${businessId}?${params.toString()}`;
}
