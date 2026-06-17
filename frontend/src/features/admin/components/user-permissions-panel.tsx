"use client";

import { ChevronDown, Plus, Search, Settings2, Shield, ShieldOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteUserDialog } from "@/features/admin/components/delete-user-dialog";
import { RevokeAccessDialog } from "@/features/admin/components/revoke-access-dialog";
import { CopyableUserId } from "@/features/admin/components/copyable-user-id";
import { UserFirestoreDocumentsPanel } from "@/features/admin/components/user-firestore-documents-panel";
import { ListPagination } from "@/components/list-pagination";
import {
  accessStatus,
  ADMIN_USER_SORT_OPTIONS,
  formatAdminTimestamp,
  formatAppAccessLine,
  formatRoleLabel,
  sortAdminUsers,
  userDisplayName,
  userInitials,
  type AdminUserSortBy,
  type AdminUserSortOrder,
} from "@/features/admin/lib/user-display";
import {
  ADMIN_USER_CARD_DISPLAY_OPTIONS,
  ADMIN_USER_PAGE_SIZE_OPTIONS,
  DEFAULT_ADMIN_USER_PAGE_SIZE,
  DEFAULT_ADMIN_USER_ROW_DISPLAY,
  loadAdminUserCardDisplay,
  loadAdminUserPageSize,
  saveAdminUserCardDisplay,
  saveAdminUserPageSize,
  type AdminUserPageSize,
  type AdminUserRowDisplay,
} from "@/features/admin/lib/user-list-display";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";
import {
  ADMIN_KNOWN_APPS,
  rolesForApp,
  SMARTREFILL_ROLE_OPTIONS,
  SMARTREFILL_STAFF_SUB_ROLE_OPTIONS,
  smartRefillRoleSelectValue,
  smartRefillStaffSubRoleSelectValue,
  type AdminAppAccessEntry,
  type AdminUserSummary,
} from "@/lib/admin/users";

type AccessFilter = "all" | "with-access" | "no-access";

function emptyAccess(): AdminAppAccessEntry {
  return { appId: "sales-portal", role: "sales" };
}

function draftFromUserAppAccess(appAccess: AdminAppAccessEntry[]) {
  return appAccess.map((entry) =>
    entry.appId === "smartrefill" ?
      {
        ...entry,
        role: smartRefillRoleSelectValue(entry.role) || entry.role,
        staffSubRole:
          smartRefillStaffSubRoleSelectValue(entry.staffSubRole) ||
          entry.staffSubRole,
      }
    : entry,
  );
}

const STATUS_STYLES = {
  none: "bg-zinc-100 text-zinc-600",
  active: "bg-emerald-50 text-emerald-700",
  revoked: "bg-amber-50 text-amber-700",
};

function UserAvatar({ user, isSelf }: { user: AdminUserSummary; isSelf?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        isSelf ?
          "bg-[var(--primary)] text-white"
        : "bg-teal-100 text-teal-800",
      )}
    >
      {userInitials(user)}
    </div>
  );
}

function CardAppAccessList({ appAccess }: { appAccess: AdminAppAccessEntry[] }) {
  if (appAccess.length === 0) {
    return (
      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-zinc-500">
        <li>No app access</li>
      </ul>
    );
  }

  return (
    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-zinc-600">
      {appAccess.map((entry, index) => (
        <li
          key={`${entry.appId}-${index}`}
          className={cn(entry.accessRevoked === true && "text-amber-700")}
        >
          {formatAppAccessLine(entry)}
        </li>
      ))}
    </ul>
  );
}

function AccessBadge({ entry }: { entry: AdminAppAccessEntry }) {
  return (
    <Badge
      className={cn(
        entry.accessRevoked ?
          "border-amber-200 bg-amber-50 text-amber-800"
        : "border-teal-100 bg-teal-50 text-teal-800",
      )}
    >
      {formatAppAccessLine(entry).replace(/ · Revoked$/, "")}
      {entry.accessRevoked ? " · Revoked" : ""}
    </Badge>
  );
}

function UserPermissionEditor({
  user,
  expanded,
  rowDisplay,
  selected,
  isSelf,
  onToggle,
  onSelect,
  onSave,
  onDelete,
  onRevoke,
}: {
  user: AdminUserSummary;
  expanded: boolean;
  rowDisplay: AdminUserRowDisplay;
  selected: boolean;
  isSelf: boolean;
  onToggle: () => void;
  onSelect: (checked: boolean) => void;
  onSave: (uid: string, appAccess: AdminAppAccessEntry[]) => Promise<unknown>;
  onDelete: () => void;
  onRevoke: () => void;
}) {
  const draftKey = `${user.uid}:${JSON.stringify(user.appAccess)}`;
  const [draft, setDraft] = useState(() => draftFromUserAppAccess(user.appAccess));
  const [draftKeyState, setDraftKeyState] = useState(draftKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const status = accessStatus(user.appAccess);

  if (draftKeyState !== draftKey) {
    setDraftKeyState(draftKey);
    setDraft(draftFromUserAppAccess(user.appAccess));
    setSaved(false);
    setError(null);
  }

  function updateRow(index: number, patch: Partial<AdminAppAccessEntry>) {
    setDraft((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
    setSaved(false);
  }

  function addRow() {
    setDraft((current) => [...current, emptyAccess()]);
    setSaved(false);
  }

  function removeRow(index: number) {
    setDraft((current) => current.filter((_, rowIndex) => rowIndex !== index));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(user.uid, draft);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const timestampParts: string[] = [];

  if (rowDisplay.lastSignIn) {
    timestampParts.push(`Last sign-in ${formatAdminTimestamp(user.lastSignInAt)}`);
  }
  if (rowDisplay.registered) {
    timestampParts.push(`Registered ${formatAdminTimestamp(user.registeredAt)}`);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition",
        isSelf ?
          "border-[var(--primary)] bg-teal-50/50 ring-2 ring-[var(--primary)]/20"
        : selected ?
          "border-[var(--primary)] bg-white ring-1 ring-[var(--primary)]/20"
        : "border-[var(--border)] bg-white",
      )}
    >
      <div className="flex items-start gap-2 px-3 py-3 sm:px-4 sm:py-4">
        {!isSelf && (
          <label className="mt-3 flex shrink-0 items-center">
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelect(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
              aria-label={`Select ${userDisplayName(user)}`}
            />
          </label>
        )}
        <div className="min-w-0 flex-1">
          {isSelf ?
            <div className="flex w-full items-start gap-3">
              {rowDisplay.avatar && <UserAvatar user={user} isSelf={isSelf} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--primary-dark)]">
                    {userDisplayName(user)}
                  </p>
                  {rowDisplay.authOnlyBadge && !user.hasRiverDbProfile && (
                    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                      Auth only
                    </span>
                  )}
                  {rowDisplay.statusBadge && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_STYLES[status.tone],
                      )}
                    >
                      {status.label}
                    </span>
                  )}
                  <span className="rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-medium text-white">
                    Signed in
                  </span>
                </div>
                {rowDisplay.email && user.email && (
                  <p className="mt-0.5 truncate text-sm text-[var(--muted-foreground)]">
                    {user.email}
                  </p>
                )}
                {rowDisplay.permissions && (
                  <CardAppAccessList appAccess={user.appAccess} />
                )}
                {timestampParts.length > 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {timestampParts.join(" · ")}
                  </p>
                )}
                {rowDisplay.userId && (
                  <p
                    className={cn(
                      "mt-2 font-mono text-xs text-zinc-500",
                      rowDisplay.avatar && "pl-0",
                    )}
                  >
                    User ID: {user.uid}
                  </p>
                )}
                <p className="mt-3 text-xs text-[var(--primary-dark)]">
                  Your signed-in account is read-only in this list.
                </p>
              </div>
            </div>
          : <>
              <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-start gap-3 text-left transition hover:opacity-90"
              >
                {rowDisplay.avatar && <UserAvatar user={user} isSelf={isSelf} />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {userDisplayName(user)}
                    </p>
                    {rowDisplay.authOnlyBadge && !user.hasRiverDbProfile && (
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        Auth only
                      </span>
                    )}
                    {rowDisplay.statusBadge && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[status.tone],
                        )}
                      >
                        {status.label}
                      </span>
                    )}
                  </div>
                  {rowDisplay.email && user.email && (
                    <p className="mt-0.5 truncate text-sm text-[var(--muted-foreground)]">
                      {user.email}
                    </p>
                  )}
                  {!expanded && rowDisplay.permissions && (
                    <CardAppAccessList appAccess={user.appAccess} />
                  )}
                  {!expanded && timestampParts.length > 0 && (
                    <p className="mt-2 text-xs text-zinc-500">
                      {timestampParts.join(" · ")}
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 h-4 w-4 shrink-0 text-zinc-400 transition",
                    expanded && "rotate-180",
                  )}
                />
              </button>
              {!expanded && rowDisplay.userId && (
                <CopyableUserId
                  uid={user.uid}
                  className={cn("mt-2", rowDisplay.avatar && "pl-14")}
                />
              )}
            </>
          }
        </div>
        {!isSelf && (
          <div className="mt-1 flex shrink-0 flex-col gap-1">
            {status.tone === "active" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                onClick={onRevoke}
                aria-label={`Revoke access for ${userDisplayName(user)}`}
              >
                <ShieldOff className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onDelete}
              aria-label={`Delete ${userDisplayName(user)}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {expanded && !isSelf && (
        <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-4">
          {!user.hasRiverDbProfile && (
            <p className="mb-4 rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2 text-sm text-violet-900">
              This account exists in Firebase Auth but has no RiverDB profile yet.
              Saving app access will create their profile automatically.
            </p>
          )}
          <div className="mb-4 flex flex-wrap gap-2">
            {user.appAccess.length > 0 ?
              user.appAccess.map((entry, index) => (
                <AccessBadge key={`${user.uid}-saved-${index}`} entry={entry} />
              ))
            : <span className="text-sm text-[var(--muted-foreground)]">No apps assigned yet.</span>}
          </div>

          <div className="space-y-3">
            {draft.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-6 text-center">
                <Shield className="mx-auto h-8 w-8 text-zinc-300" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  No app access assigned
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Choose which apps this person can use and their role.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={addRow}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Assign an app
                </Button>
              </div>
            ) : (
              draft.map((row, index) => {
                const roles = rolesForApp(row.appId);
                const showBusinessId = row.appId === "smartrefill";
                const isSmartRefill = row.appId === "smartrefill";
                const smartRefillRole = isSmartRefill ?
                  smartRefillRoleSelectValue(row.role)
                : "";
                const showStaffSubRole =
                  isSmartRefill && smartRefillRole === "staff";
                return (
                  <div
                    key={`${user.uid}-${index}`}
                    className="rounded-lg border border-zinc-200 bg-white p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-foreground">Application</span>
                        <select
                          value={row.appId}
                          onChange={(event) => {
                            const appId = event.target.value;
                            updateRow(index, {
                              appId,
                              role: rolesForApp(appId)[0],
                              staffSubRole: undefined,
                            });
                          }}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        >
                          {ADMIN_KNOWN_APPS.map((app) => (
                            <option key={app.appId} value={app.appId}>
                              {app.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-foreground">Role</span>
                        <select
                          value={
                            isSmartRefill ?
                              smartRefillRoleSelectValue(row.role)
                            : row.role || ""
                          }
                          onChange={(event) => {
                            const role = event.target.value;
                            updateRow(index, {
                              role,
                              ...(isSmartRefill && role !== "staff" ?
                                { staffSubRole: undefined }
                              : isSmartRefill && role === "staff" ?
                                {
                                  staffSubRole:
                                    smartRefillStaffSubRoleSelectValue(
                                      row.staffSubRole,
                                    ) || "admin",
                                }
                              : {}),
                            });
                          }}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        >
                          <option value="">Select role</option>
                          {isSmartRefill ?
                            SMARTREFILL_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label} — {option.description}
                              </option>
                            ))
                          : roles.map((role) => (
                              <option key={role} value={role}>
                                {formatRoleLabel(role)}
                              </option>
                            ))
                          }
                        </select>
                      </label>

                      {showStaffSubRole && (
                        <label className="space-y-1.5 text-sm md:col-span-2">
                          <span className="font-medium text-foreground">
                            Staff sub-role
                          </span>
                          <select
                            value={
                              smartRefillStaffSubRoleSelectValue(
                                row.staffSubRole,
                              ) || ""
                            }
                            onChange={(event) =>
                              updateRow(index, {
                                staffSubRole: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          >
                            <option value="">Select sub-role</option>
                            {SMARTREFILL_STAFF_SUB_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label} — {option.description}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-zinc-500">
                            Stored on the workspace member record (
                            <code className="rounded bg-zinc-100 px-1">
                              businesses/…/members/{user.uid}
                            </code>
                            ).
                          </p>
                        </label>
                      )}

                      {showBusinessId && (
                        <label className="space-y-1.5 text-sm md:col-span-2">
                          <span className="font-medium text-foreground">
                            Workspace ID
                          </span>
                          <input
                            type="text"
                            value={row.businessId || ""}
                            onChange={(event) =>
                              updateRow(index, { businessId: event.target.value })
                            }
                            placeholder="Required for staff on a specific workspace"
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                          />
                        </label>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm text-zinc-600">
                        <input
                          type="checkbox"
                          checked={row.accessRevoked === true}
                          onChange={(event) =>
                            updateRow(index, { accessRevoked: event.target.checked })
                          }
                        />
                        Access revoked
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {draft.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-1 h-4 w-4" />
                Add another app
              </Button>
            )}
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && (
              <span className="text-sm text-emerald-700">Changes saved.</span>
            )}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>

          <div className="mt-4">
            <CopyableUserId uid={user.uid} />
          </div>

          {user.hasRiverDbProfile && (
            <UserFirestoreDocumentsPanel uid={user.uid} enabled={expanded} />
          )}
        </div>
      )}
    </div>
  );
}

export function UserPermissionsPanel({
  users,
  isLoading,
  error,
  currentUid,
  onSave,
  onDelete,
  onRevoke,
}: {
  users: AdminUserSummary[];
  isLoading: boolean;
  error: string | null;
  currentUid: string | null;
  onSave: (uid: string, appAccess: AdminAppAccessEntry[]) => Promise<unknown>;
  onDelete: (
    uids: string[],
    onProgress?: (completed: number, total: number) => void,
  ) => Promise<{
    deleted: { uid: string }[];
    failed: { uid: string; reason: string }[];
  }>;
  onRevoke: (uid: string) => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [sortBy, setSortBy] = useState<AdminUserSortBy>("name");
  const [sortOrder, setSortOrder] = useState<AdminUserSortOrder>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cardDisplay, setCardDisplay] = useState<AdminUserRowDisplay>(() =>
    loadAdminUserCardDisplay(),
  );
  const [pageSize, setPageSize] = useState<AdminUserPageSize>(() =>
    loadAdminUserPageSize(),
  );
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargets, setDeleteTargets] = useState<AdminUserSummary[] | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminUserSummary | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  function updateCardDisplay(next: AdminUserRowDisplay) {
    setCardDisplay(next);
    saveAdminUserCardDisplay(next);
  }

  function updatePageSize(next: AdminUserPageSize) {
    setPageSize(next);
    saveAdminUserPageSize(next);
  }

  const sorted = useMemo(
    () => sortAdminUsers(users, sortBy, sortOrder),
    [users, sortBy, sortOrder],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((user) => {
      const matchesQuery =
        !q ||
        user.email?.toLowerCase().includes(q) ||
        user.displayName?.toLowerCase().includes(q) ||
        user.uid.toLowerCase().includes(q);

      const hasAccess = user.appAccess.some((row) => row.accessRevoked !== true);
      const needsSetup = !hasAccess || !user.hasRiverDbProfile;
      const matchesFilter =
        accessFilter === "all" ||
        (accessFilter === "with-access" && hasAccess) ||
        (accessFilter === "no-access" && needsSetup);

      return matchesQuery && matchesFilter;
    });
  }, [query, sorted, accessFilter]);

  const { paginatedItems, page, setPage, totalPages, totalItems } =
    usePagination(
      filtered,
      pageSize,
      `${query}-${accessFilter}-${sortBy}-${sortOrder}-${pageSize}`,
    );

  const pageSelectableIds = useMemo(
    () =>
      paginatedItems
        .filter((user) => user.uid !== currentUid)
        .map((user) => user.uid),
    [paginatedItems, currentUid],
  );

  const allPageSelected =
    pageSelectableIds.length > 0 &&
    pageSelectableIds.every((uid) => selectedIds.has(uid));

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedIds.has(user.uid)),
    [users, selectedIds],
  );

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        pageSelectableIds.forEach((uid) => next.add(uid));
      } else {
        pageSelectableIds.forEach((uid) => next.delete(uid));
      }
      return next;
    });
  }

  function toggleSelectUser(uid: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(uid);
      else next.delete(uid);
      return next;
    });
  }

  async function confirmDelete() {
    if (!deleteTargets || deleteTargets.length === 0) return;

    setDeleting(true);
    setDeleteError(null);
    setDeleteProgress(null);
    try {
      const uids = deleteTargets
        .map((user) => user.uid)
        .filter((uid) => uid !== currentUid);
      const result = await onDelete(uids, (completed, total) => {
        setDeleteProgress({ completed, total });
      });
      setSelectedIds((current) => {
        const next = new Set(current);
        result.deleted.forEach((row) => next.delete(row.uid));
        return next;
      });
      if (result.failed.length > 0) {
        setDeleteError(
          result.failed
            .map((row) => `${row.uid}: ${row.reason}`)
            .join(" · "),
        );
      } else {
        setDeleteTargets(null);
      }
      if (expandedId && uids.includes(expandedId)) {
        setExpandedId(null);
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete users.",
      );
    } finally {
      setDeleting(false);
      setDeleteProgress(null);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      await onRevoke(revokeTarget.uid);
      if (expandedId === revokeTarget.uid) {
        setExpandedId(null);
      }
      setRevokeTarget(null);
    } catch (err) {
      setRevokeError(
        err instanceof Error ? err.message : "Could not revoke access.",
      );
    } finally {
      setRevoking(false);
    }
  }

  const stats = useMemo(() => {
    const withAccess = users.filter((user) =>
      user.appAccess.some((row) => row.accessRevoked !== true),
    ).length;
    const authOnly = users.filter((user) => !user.hasRiverDbProfile).length;
    const needsSetup = users.filter((user) => {
      const hasAccess = user.appAccess.some((row) => row.accessRevoked !== true);
      return !hasAccess || !user.hasRiverDbProfile;
    }).length;
    return {
      total: users.length,
      withAccess,
      authOnly,
      needsSetup,
    };
  }, [users]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Who can access what</CardTitle>
        <CardDescription>
          Assign apps and roles for each person. Sales Portal controls this
          dashboard; SmartRefill controls the owner app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-xs text-zinc-500">Total accounts</p>
            <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <p className="text-xs text-emerald-700">With app access</p>
            <p className="text-2xl font-semibold text-emerald-900">{stats.withAccess}</p>
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-3">
            <p className="text-xs text-violet-700">Auth only (no RiverDB)</p>
            <p className="text-2xl font-semibold text-violet-900">{stats.authOnly}</p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-xs text-zinc-500">Needs setup</p>
            <p className="text-2xl font-semibold text-foreground">{stats.needsSetup}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-lg border border-zinc-200 py-2.5 pl-10 pr-3 text-sm"
            />
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-600">
            <span className="whitespace-nowrap font-medium">Sort by</span>
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(event) => {
                const [nextSortBy, nextSortOrder] = event.target.value.split(":");
                setSortBy(nextSortBy as AdminUserSortBy);
                setSortOrder(nextSortOrder as AdminUserSortOrder);
              }}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              {ADMIN_USER_SORT_OPTIONS.map((option) => (
                <option
                  key={`${option.sortBy}-${option.order}`}
                  value={`${option.sortBy}:${option.order}`}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "All"],
              ["with-access", "Has access"],
              ["no-access", "Needs setup"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccessFilter(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  accessFilter === value ?
                    "bg-[var(--primary)] text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-zinc-100 bg-zinc-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={allPageSelected}
                disabled={pageSelectableIds.length === 0}
                onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Select page
            </label>
            {selectedUsers.length > 0 && (
              <span className="text-sm text-zinc-600">
                {selectedUsers.length} selected
              </span>
            )}
            {selectedUsers.length > 0 && (
              <Button
                type="button"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => setDeleteTargets(selectedUsers)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete selected
              </Button>
            )}
          </div>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDisplaySettings((current) => !current)}
            >
              <Settings2 className="mr-1 h-4 w-4" />
              Card display
            </Button>
            {showDisplaySettings && (
              <>
                <button
                  type="button"
                  aria-label="Close card display settings"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setShowDisplaySettings(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Show on each card
                  </p>
                  <div className="space-y-2">
                    {ADMIN_USER_CARD_DISPLAY_OPTIONS.map((option) => (
                      <label
                        key={option.key}
                        className="flex items-center gap-2 text-sm text-zinc-700"
                      >
                        <input
                          type="checkbox"
                          checked={cardDisplay[option.key]}
                          onChange={(event) =>
                            updateCardDisplay({
                              ...cardDisplay,
                              [option.key]: event.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-zinc-300"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>

                  <div className="my-3 border-t border-zinc-100" />

                  <label className="block space-y-1.5 text-sm text-zinc-700">
                    <span className="font-medium text-foreground">Cards per page</span>
                    <select
                      value={pageSize}
                      onChange={(event) =>
                        updatePageSize(Number(event.target.value) as AdminUserPageSize)
                      }
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    >
                      {ADMIN_USER_PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size} cards
                        </option>
                      ))}
                    </select>
                  </label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      updateCardDisplay(DEFAULT_ADMIN_USER_ROW_DISPLAY);
                      updatePageSize(DEFAULT_ADMIN_USER_PAGE_SIZE);
                    }}
                  >
                    Reset to default
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {isLoading && (
          <p className="text-sm text-[var(--muted-foreground)]">Loading users…</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
        {revokeError && <p className="text-sm text-red-600">{revokeError}</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No users match your search</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Try a different name, email, or filter.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {paginatedItems.map((user) => (
            <UserPermissionEditor
              key={user.uid}
              user={user}
              rowDisplay={cardDisplay}
              selected={selectedIds.has(user.uid)}
              isSelf={user.uid === currentUid}
              expanded={expandedId === user.uid && user.uid !== currentUid}
              onToggle={() => {
                if (user.uid === currentUid) return;
                setExpandedId((current) =>
                  current === user.uid ? null : user.uid,
                );
              }}
              onSelect={(checked) => toggleSelectUser(user.uid, checked)}
              onSave={onSave}
              onDelete={() => setDeleteTargets([user])}
              onRevoke={() => setRevokeTarget(user)}
            />
          ))}
        </div>

        <ListPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />

        {deleteTargets && (
          <DeleteUserDialog
            users={deleteTargets}
            currentUid={currentUid}
            deleting={deleting}
            deleteProgress={deleteProgress}
            onClose={() => {
              if (!deleting) {
                setDeleteTargets(null);
                setDeleteError(null);
                setDeleteProgress(null);
              }
            }}
            onConfirm={() => void confirmDelete()}
          />
        )}

        {revokeTarget && (
          <RevokeAccessDialog
            displayName={userDisplayName(revokeTarget)}
            email={revokeTarget.email}
            revoking={revoking}
            onClose={() => {
              if (!revoking) setRevokeTarget(null);
            }}
            onConfirm={() => void confirmRevoke()}
          />
        )}
      </CardContent>
    </Card>
  );
}
