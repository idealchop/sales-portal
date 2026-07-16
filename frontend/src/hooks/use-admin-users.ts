"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type {
  AdminAppAccessEntry,
  AdminUserPermissionsInput,
  AdminUserSummary,
} from "@/lib/admin/users";
import { sortAdminUsers } from "@/features/admin/lib/user-display";

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: { users: AdminUserSummary[] } }>(
        "/admin/users",
      );
      setUsers(response.data.users);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load users.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const createUser = useCallback(
    async (input: { email: string; displayName: string; password: string }) => {
      const response = await apiClient.post<{ data: { user: AdminUserSummary } }>(
        "/admin/users",
        input,
      );
      setUsers((current) =>
        sortAdminUsers([...current, response.data.user], "name", "asc"),
      );
      return response.data.user;
    },
    [],
  );

  const saveAppAccess = useCallback(
    async (uid: string, input: AdminUserPermissionsInput) => {
      const response = await apiClient.patch<{ data: { user: AdminUserSummary } }>(
        `/admin/users/${uid}/app-access`,
        input,
      );
      setUsers((current) =>
        current.map((user) =>
          user.uid === uid ? response.data.user : user,
        ),
      );
      return response.data.user;
    },
    [],
  );

  const revokeUserAccess = useCallback(async (uid: string) => {
    const response = await apiClient.post<{ data: { user: AdminUserSummary } }>(
      `/admin/users/${uid}/revoke-access`,
    );
    setUsers((current) =>
      current.map((user) => (user.uid === uid ? response.data.user : user)),
    );
    return response.data.user;
  }, []);

  const deleteUsers = useCallback(
    async (
      uids: string[],
      onProgress?: (completed: number, total: number) => void,
    ) => {
      const unique = [...new Set(uids.filter(Boolean))];
      if (unique.length === 0) return { deleted: [], failed: [] };

      onProgress?.(0, unique.length);

      if (unique.length === 1) {
        const uid = unique[0];
        try {
          await apiClient.delete(`/admin/users/${uid}`);
          setUsers((current) => current.filter((user) => user.uid !== uid));
          onProgress?.(1, 1);
          return {
            deleted: [{ uid, deletedAuth: true, deletedProfile: true }],
            failed: [],
          };
        } catch (err) {
          return {
            deleted: [],
            failed: [
              {
                uid,
                reason: err instanceof ApiError ? err.message : "Delete failed.",
              },
            ],
          };
        }
      }

      try {
        const response = await apiClient.post<{
          data: {
            deleted: {
              uid: string;
              deletedAuth: boolean;
              deletedProfile: boolean;
            }[];
            failed: { uid: string; reason: string }[];
          };
        }>("/admin/users/bulk-delete", { uids: unique });

        const { deleted, failed } = response.data;
        const deletedUids = new Set(deleted.map((row) => row.uid));
        setUsers((current) => current.filter((user) => !deletedUids.has(user.uid)));
        onProgress?.(unique.length, unique.length);
        return { deleted, failed };
      } catch (err) {
        return {
          deleted: [],
          failed: unique.map((uid) => ({
            uid,
            reason: err instanceof ApiError ? err.message : "Bulk delete failed.",
          })),
        };
      }
    },
    [],
  );

  return {
    users,
    isLoading,
    error,
    refresh: load,
    createUser,
    saveAppAccess,
    revokeUserAccess,
    deleteUsers,
  };
}
