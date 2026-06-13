"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListPagination } from "@/components/list-pagination";
import { useAdminDataManagement } from "@/hooks/use-admin-data-management";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  DATA_MANAGEMENT_PAGE_SIZE_OPTIONS,
  buildSubscriptionFilterOptions,
  DATA_MANAGEMENT_SORT_OPTIONS,
  DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL,
  dataManagementStatusLabel,
  dataManagementStaffRoleLabel,
  dataManagementUserLabel,
  filterDataManagementRows,
  formatActiveSubscriptionTitle,
  formatMemberBreakdown,
  sortDataManagementRows,
  type DataManagementLinkRow,
  type DataManagementLinkStatus,
  type DataManagementPageSize,
  type DataManagementSortBy,
  type DataManagementSortOrder,
  type DataManagementStaffRoleFilter,
  type DataManagementStatusFilter,
} from "@/lib/admin/data-management";
import {
  businessInfoPath,
  dataManagementPath,
  parseDataManagementSearchParams,
  type DataManagementUrlState,
} from "@/lib/admin/data-management-url-state";
import { formatSubscriptionPeriod } from "@/lib/dashboard/subscription-labels";
import { cn } from "@/lib/utils";
import { DataManagementNoBusinessDialog } from "@/features/admin/components/data-management-no-business-dialog";
import { DataManagementUserDocsDialog } from "@/features/admin/components/data-management-user-docs-dialog";
import { DataManagementUserLogsDialog } from "@/features/admin/components/data-management-user-logs-dialog";
import { DataManagementRemoveUserDialog } from "@/features/admin/components/data-management-remove-user-dialog";
import { CopyableUserId } from "@/features/admin/components/copyable-user-id";
import { DataManagementUserAvatar } from "@/features/admin/components/data-management-user-avatar";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import { apiClient } from "@/lib/api-client";

type RoleTab = "owners" | "staff";

const ROLE_TABS: {
  id: RoleTab;
  label: string;
  description: string;
}[] = [
  {
    id: "owners",
    label: "Owners",
    description: "Workspace owners linked to their businesses.",
  },
  {
    id: "staff",
    label: "Staff",
    description: "Workspace members with an admin or rider seat role.",
  },
];

const STATUS_STYLES: Record<DataManagementLinkStatus, string> = {
  linked: "border-teal-100 bg-teal-50 text-teal-800",
  no_business: "border-amber-200 bg-amber-50 text-amber-800",
  no_user: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

const STATUS_FILTERS: { value: DataManagementStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "linked", label: "Linked" },
  { value: "no_business", label: "No business" },
  { value: "no_user", label: "No user" },
];

const STAFF_ROLE_FILTERS: { value: DataManagementStaffRoleFilter; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "rider", label: "Rider" },
];

function RoleLinkTable({
  rows,
  tab,
  onOpenProfile,
  onOpenLogs,
  onViewBusinessInfo,
  onRemoveUser,
}: {
  rows: DataManagementLinkRow[];
  tab: RoleTab;
  onOpenProfile: (row: DataManagementLinkRow) => void;
  onOpenLogs: (row: DataManagementLinkRow) => void;
  onViewBusinessInfo: (row: DataManagementLinkRow) => void;
  onRemoveUser: (row: DataManagementLinkRow) => void;
}) {
  const isStaffTab = tab === "staff";

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No records match your filters</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Try a different search term or status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Business</th>
            {!isStaffTab && (
              <th className="px-3 py-2 font-medium">Subscription</th>
            )}
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.userId || "none"}-${row.businessId || "none"}-${index}`}
              onClick={() => {
                if (isStaffTab) {
                  if (row.userId) onOpenProfile(row);
                  return;
                }
                onViewBusinessInfo(row);
              }}
              className="cursor-pointer border-b border-zinc-50 transition last:border-0 hover:bg-zinc-50/80"
            >
              <td className="px-3 py-3 align-top">
                {row.status === "no_user" ?
                  <span className="text-zinc-400">
                    No {row.staffRole === "admin" ? "admin" : row.staffRole === "rider" ? "rider" : "user"}
                  </span>
                : <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                      <DataManagementUserAvatar
                        photoURL={row.userPhotoURL}
                        displayName={dataManagementUserLabel(row)}
                      />
                      <button
                        type="button"
                        className="text-left text-foreground transition hover:text-teal-700 hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenProfile(row);
                        }}
                      >
                        {dataManagementUserLabel(row)}
                      </button>
                      {isStaffTab && row.staffRole && (
                        <Badge className="border-zinc-200 bg-zinc-50 font-normal text-zinc-700">
                          {dataManagementStaffRoleLabel(row.staffRole)}
                        </Badge>
                      )}
                    </div>
                    {row.userEmail && row.userDisplayName && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {row.userEmail}
                      </p>
                    )}
                    {row.userId && (
                      <CopyableUserId
                        uid={row.userId}
                        label=""
                        copyLabel="user ID"
                        muted
                      />
                    )}
                  </div>
                }
              </td>
              <td className="px-3 py-3 align-top">
                <div className="space-y-0.5">
                  {row.businessName ?
                    <>
                      <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        <Building2 className="h-4 w-4 shrink-0 text-zinc-400" />
                        <span>{row.businessName}</span>
                        <Badge className={cn("font-normal", STATUS_STYLES[row.status])}>
                          {dataManagementStatusLabel(row.status)}
                        </Badge>
                      </div>
                      {tab === "staff" && row.ownerDisplayName && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Owner · {row.ownerDisplayName}
                        </p>
                      )}
                      {tab === "owners" && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {formatMemberBreakdown(row.memberBreakdown) ?? "0 admins · 0 riders"}
                        </p>
                      )}
                      {row.businessId && (
                        <CopyableUserId
                          uid={row.businessId}
                          label=""
                          copyLabel="business ID"
                          muted
                        />
                      )}
                    </>
                  : <Badge className={cn("font-normal", STATUS_STYLES[row.status])}>
                      {dataManagementStatusLabel(row.status)}
                    </Badge>
                  }
                </div>
              </td>
              {!isStaffTab && (
                <td className="px-3 py-3 align-top">
                  {row.activeSubscription ?
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">
                        {formatActiveSubscriptionTitle(row.activeSubscription)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatSubscriptionPeriod(row.activeSubscription)}
                      </p>
                    </div>
                  : <span className="text-zinc-400">—</span>}
                </td>
              )}
              <td
                className="px-3 py-3 align-top"
                onClick={(event) => event.stopPropagation()}
              >
                {row.userId ?
                  <FirestoreActionsMenu
                    onViewProfile={() => onOpenProfile(row)}
                    onLogs={() => onOpenLogs(row)}
                    onViewBusinessInfo={
                      isStaffTab ? undefined : () => onViewBusinessInfo(row)
                    }
                    onEdit={() => onOpenProfile(row)}
                    onRemove={() => onRemoveUser(row)}
                  />
                : <span className="text-zinc-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleLinkPanel({
  rows,
  tabKey,
  showStaffRole = false,
  urlState,
  onUrlStateChange,
  onUserCollectionChanged,
}: {
  rows: DataManagementLinkRow[];
  tabKey: RoleTab;
  showStaffRole?: boolean;
  urlState: DataManagementUrlState;
  onUrlStateChange: (patch: Partial<DataManagementUrlState>) => void;
  onUserCollectionChanged?: () => void;
}) {
  const router = useRouter();
  const listReturnPath = dataManagementPath(urlState);
  const [profileRow, setProfileRow] = useState<DataManagementLinkRow | null>(null);
  const [logsRow, setLogsRow] = useState<DataManagementLinkRow | null>(null);
  const [noBusinessRow, setNoBusinessRow] = useState<DataManagementLinkRow | null>(
    null,
  );
  const [removeRow, setRemoveRow] = useState<DataManagementLinkRow | null>(null);

  const filtered = useMemo(
    () =>
      filterDataManagementRows(
        rows,
        urlState.q,
        urlState.status,
        showStaffRole ? urlState.staffRole : "all",
        showStaffRole ? "all" : urlState.subscription,
      ),
    [rows, showStaffRole, urlState.q, urlState.status, urlState.staffRole, urlState.subscription],
  );

  const sorted = useMemo(
    () => sortDataManagementRows(filtered, urlState.sortBy, urlState.sortOrder),
    [filtered, urlState.sortBy, urlState.sortOrder],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / urlState.pageSize));
  const page = Math.min(urlState.page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * urlState.pageSize;
    return sorted.slice(start, start + urlState.pageSize);
  }, [page, sorted, urlState.pageSize]);
  const totalItems = sorted.length;

  useEffect(() => {
    if (urlState.page > totalPages) {
      onUrlStateChange({ page: totalPages });
    }
  }, [onUrlStateChange, totalPages, urlState.page]);

  const handleViewBusinessInfo = useCallback(
    (row: DataManagementLinkRow) => {
      if (!row.businessId) {
        setNoBusinessRow(row);
        return;
      }
      router.push(
        businessInfoPath(row.businessId, listReturnPath, row.userId),
      );
    },
    [listReturnPath, router],
  );

  const stats = useMemo(() => {
    const linked = rows.filter((row) => row.status === "linked").length;
    const noBusiness = rows.filter((row) => row.status === "no_business").length;
    const noUser = rows.filter((row) => row.status === "no_user").length;
    const admins = rows.filter((row) => row.staffRole === "admin").length;
    const riders = rows.filter((row) => row.staffRole === "rider").length;
    return { total: rows.length, linked, noBusiness, noUser, admins, riders };
  }, [rows]);

  const sortOptions = showStaffRole ?
    DATA_MANAGEMENT_SORT_OPTIONS
  : DATA_MANAGEMENT_SORT_OPTIONS.filter((option) => option.sortBy !== "role");

  const subscriptionFilters = useMemo(
    () => buildSubscriptionFilterOptions(rows),
    [rows],
  );

  useEffect(() => {
    if (showStaffRole) return;
    if (
      urlState.subscription === DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL ||
      subscriptionFilters.some((filter) => filter.value === urlState.subscription)
    ) {
      return;
    }
    onUrlStateChange({ subscription: DATA_MANAGEMENT_SUBSCRIPTION_FILTER_ALL });
  }, [onUrlStateChange, showStaffRole, subscriptionFilters, urlState.subscription]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="text-xs text-zinc-500">
            {showStaffRole ? "Members" : "Total rows"}
          </p>
          <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
        </div>
        {showStaffRole ?
          <>
            <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-3">
              <p className="text-xs text-violet-700">Admins</p>
              <p className="text-2xl font-semibold text-violet-900">{stats.admins}</p>
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-4 py-3">
              <p className="text-xs text-sky-700">Riders</p>
              <p className="text-2xl font-semibold text-sky-900">{stats.riders}</p>
            </div>
            <div className="rounded-lg border border-teal-100 bg-teal-50/60 px-4 py-3">
              <p className="text-xs text-teal-700">Linked</p>
              <p className="text-2xl font-semibold text-teal-900">{stats.linked}</p>
            </div>
          </>
        : <>
            <div className="rounded-lg border border-teal-100 bg-teal-50/60 px-4 py-3">
              <p className="text-xs text-teal-700">Linked</p>
              <p className="text-2xl font-semibold text-teal-900">{stats.linked}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3">
              <p className="text-xs text-amber-700">No business</p>
              <p className="text-2xl font-semibold text-amber-900">{stats.noBusiness}</p>
            </div>
          </>
        }
        {!showStaffRole && (
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-xs text-zinc-500">No user</p>
            <p className="text-2xl font-semibold text-foreground">{stats.noUser}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={urlState.q}
            onChange={(event) => onUrlStateChange({ q: event.target.value, page: 1 })}
            placeholder="Search user, email, business, or ID"
            className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm"
          />
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-600">
          <span className="whitespace-nowrap font-medium">Sort by</span>
          <select
            value={`${urlState.sortBy}:${urlState.sortOrder}`}
            onChange={(event) => {
              const [nextSortBy, nextSortOrder] = event.target.value.split(":");
              onUrlStateChange({
                sortBy: nextSortBy as DataManagementSortBy,
                sortOrder: nextSortOrder as DataManagementSortOrder,
                page: 1,
              });
            }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            {sortOptions.map((option) => (
              <option
                key={`${option.sortBy}-${option.order}`}
                value={`${option.sortBy}:${option.order}`}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-600">
          <span className="whitespace-nowrap font-medium">Per page</span>
          <select
            value={urlState.pageSize}
            onChange={(event) =>
              onUrlStateChange({
                pageSize: Number(event.target.value) as DataManagementPageSize,
                page: 1,
              })
            }
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            {DATA_MANAGEMENT_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onUrlStateChange({ status: filter.value, page: 1 })}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              urlState.status === filter.value ?
                "bg-[var(--primary)] text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            {filter.label}
          </button>
        ))}
        {showStaffRole &&
          STAFF_ROLE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onUrlStateChange({ staffRole: filter.value, page: 1 })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                urlState.staffRole === filter.value ?
                  "bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
              )}
            >
              {filter.label}
            </button>
          ))}
        {!showStaffRole &&
          subscriptionFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onUrlStateChange({ subscription: filter.value, page: 1 })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                urlState.subscription === filter.value ?
                  "bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
              )}
            >
              {filter.label}
            </button>
          ))}
      </div>

      <p className="text-xs text-zinc-500">
        Showing {paginatedItems.length} of {totalItems} filtered rows
        {totalItems !== stats.total ? ` (${stats.total} total)` : ""}
      </p>

      <RoleLinkTable
        rows={paginatedItems}
        tab={tabKey}
        onOpenProfile={setProfileRow}
        onOpenLogs={setLogsRow}
        onViewBusinessInfo={handleViewBusinessInfo}
        onRemoveUser={setRemoveRow}
      />

      {profileRow && (
        <DataManagementUserDocsDialog
          row={profileRow}
          tab={tabKey}
          onClose={() => setProfileRow(null)}
          onRemove={() => {
            setRemoveRow(profileRow);
            setProfileRow(null);
          }}
        />
      )}

      {logsRow && (
        <DataManagementUserLogsDialog
          row={logsRow}
          onClose={() => setLogsRow(null)}
        />
      )}

      {noBusinessRow && tabKey === "owners" && (
        <DataManagementNoBusinessDialog
          row={noBusinessRow}
          onClose={() => setNoBusinessRow(null)}
        />
      )}

      {removeRow && removeRow.userId && (
        <DataManagementRemoveUserDialog
          row={removeRow}
          onClose={() => setRemoveRow(null)}
          onConfirm={async () => {
            await apiClient.delete<{ data: { deletedPaths: string[] } }>(
              `/admin/users/${removeRow.userId}/firestore-profile`,
            );
            onUserCollectionChanged?.();
          }}
        />
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={urlState.pageSize}
        onPageChange={(nextPage) => onUrlStateChange({ page: nextPage })}
      />
    </div>
  );
}

export function AdminDataManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: profileLoading } = useSalesProfile();
  const { overview, isLoading, error, refresh } = useAdminDataManagement();
  const urlState = useMemo(
    () => parseDataManagementSearchParams(searchParams),
    [searchParams],
  );
  const activeTab = urlState.tab;

  const patchUrlState = useCallback(
    (patch: Partial<DataManagementUrlState>) => {
      router.replace(dataManagementPath({ ...urlState, ...patch }));
    },
    [router, urlState],
  );

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [profile?.role, profileLoading, router]);

  if (profileLoading || profile?.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
      </div>
    );
  }

  const activeTabMeta = ROLE_TABS.find((tab) => tab.id === activeTab)!;
  const activeRows =
    overview ?
      activeTab === "owners" ? overview.owners : overview.staff
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data management</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Review SmartRefill owners and staff linked to their workspaces.
            Rows with missing links show as No business or No user.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("mr-1 h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {isLoading && !overview && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
        </div>
      )}

      {overview && (
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-base">User ↔ business links</CardTitle>
              <CardDescription>{activeTabMeta.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-zinc-100 pb-1">
              {ROLE_TABS.map((tab) => {
                const count =
                  tab.id === "owners" ? overview.owners.length : overview.staff.length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => patchUrlState({ tab: tab.id, page: 1 })}
                    className={cn(
                      "rounded-t-lg px-4 py-2 text-sm font-medium transition",
                      activeTab === tab.id ?
                        "border border-b-white border-zinc-200 bg-white text-[var(--primary-dark)]"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800",
                    )}
                  >
                    {tab.label}
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent>
            <RoleLinkPanel
              key={activeTab}
              rows={activeRows}
              tabKey={activeTab}
              showStaffRole={activeTab === "staff"}
              urlState={urlState}
              onUrlStateChange={patchUrlState}
              onUserCollectionChanged={() => void refresh()}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
