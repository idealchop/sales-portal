"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AddUserForm } from "@/features/admin/components/add-user-form";
import { UserPermissionsPanel } from "@/features/admin/components/user-permissions-panel";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { useAuthUid } from "@/hooks/use-auth-uid";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { ApiError } from "@/lib/api-client";

export function AdminPermissionsPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const { uid: currentUid } = useAuthUid();
  const { users, isLoading, error, createUser, saveAppAccess, deleteUsers } =
    useAdminUsers();

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Permissions</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Create login accounts and control which apps each person can use.
        </p>
      </div>

      <AddUserForm
        onCreate={async (input) => {
          try {
            await createUser(input);
          } catch (err) {
            throw err instanceof ApiError ?
                err
              : new Error("Could not create user.");
          }
        }}
      />

      <UserPermissionsPanel
        users={users}
        isLoading={isLoading}
        error={error}
        currentUid={currentUid}
        onSave={saveAppAccess}
        onDelete={deleteUsers}
      />
    </div>
  );
}
