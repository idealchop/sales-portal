"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  describeBulkDeleteImpact,
  describeUserDeleteImpact,
} from "@/features/admin/lib/user-list-display";
import { userDisplayName } from "@/features/admin/lib/user-display";
import type { AdminUserSummary } from "@/lib/admin/users";

export function DeleteUserDialog({
  users,
  currentUid,
  deleting,
  deleteProgress,
  onClose,
  onConfirm,
}: {
  users: AdminUserSummary[];
  currentUid: string | null;
  deleting: boolean;
  deleteProgress: { completed: number; total: number } | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const includesSelf = currentUid ?
    users.some((user) => user.uid === currentUid)
  : false;
  const deletableUsers = currentUid ?
    users.filter((user) => user.uid !== currentUid)
  : users;
  const isBulk = users.length > 1;
  const bulkImpact = isBulk ?
    describeBulkDeleteImpact(deletableUsers.length > 0 ? deletableUsers : users)
  : null;
  const singleImpact = !isBulk ? describeUserDeleteImpact(users[0]) : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [deleting, onClose]);

  if (users.length === 0) return null;

  const title =
    isBulk ?
      `Delete ${deletableUsers.length || users.length} account${(deletableUsers.length || users.length) === 1 ? "" : "s"}?`
    : `Delete ${userDisplayName(users[0])}?`;

  const impactItems =
    isBulk ? bulkImpact?.items ?? [] : singleImpact ?? [];

  const progressPercent =
    deleteProgress && deleteProgress.total > 0 ?
      Math.round((deleteProgress.completed / deleteProgress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => {
          if (!deleting) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Permanent deletion
              </p>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {isBulk ?
                  bulkImpact?.summary
                : "This action cannot be undone. Review what will be lost below."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
            disabled={deleting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto px-5 py-4">
          {deleting ?
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                {isBulk && deleteProgress ?
                  `Deleting ${deleteProgress.completed} of ${deleteProgress.total} account${deleteProgress.total === 1 ? "" : "s"}…`
                : "Deleting account…"}
              </div>
              {isBulk && deleteProgress ?
                <>
                  <div className="mt-3">
                    <Progress value={progressPercent} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {progressPercent}% complete · Please keep this window open
                  </p>
                </>
              : <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--primary)]" />
                </div>
              }
            </div>
          : <>
              {impactItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-red-100 bg-red-50/40 px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-red-900">{item.label}</p>
                  {item.detail && (
                    <p className="mt-0.5 text-sm text-red-800/80">{item.detail}</p>
                  )}
                </div>
              ))}

              {!isBulk && (
                <p className="text-sm text-zinc-600">
                  The user will immediately lose the ability to sign in and access any
                  assigned apps.
                </p>
              )}
            </>
          }
        </div>

        {includesSelf && (
          <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-900">
            Your own account is included in this selection and will be skipped.
          </p>
        )}

        {deletableUsers.length === 0 && (
          <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-900">
            You cannot delete your own account while signed in.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={deleting || deletableUsers.length === 0}
          >
            {deleting ?
              "Deleting…"
            : isBulk ?
              `Delete ${deletableUsers.length} account${deletableUsers.length === 1 ? "" : "s"}`
            : "Delete account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
