"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  fetchAuthStatus,
  resolvePostLoginPath,
  type AuthStatus,
} from "@/lib/auth-status";

type AuthGuardMode = "dashboard" | "onboarding";

export function useAuthGuard(mode: AuthGuardMode) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatus | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const authStatus = await fetchAuthStatus();
        setStatus(authStatus);

        const target = resolvePostLoginPath(authStatus);
        if (mode === "dashboard" && target !== "/dashboard") {
          router.replace(target);
          return;
        }
        if (mode === "onboarding" && target === "/dashboard") {
          router.replace("/dashboard");
          return;
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          apiClient.clearTokenCache();
          await signOut(auth);
        }
        router.replace("/login");
        return;
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [mode, router]);

  return { loading, status };
}
