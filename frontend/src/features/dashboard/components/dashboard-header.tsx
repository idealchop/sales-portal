"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, RefreshCw, Settings } from "lucide-react";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/auth";
import { apiClient } from "@/lib/api-client";
import { roleLabel, type SalesPortalRole } from "@/lib/auth-status";
import type { UserProfile } from "@/lib/definitions";
import { isDashboardAppPath } from "@/features/dashboard/config/dashboard-apps";
import { useOptionalDashboardAnalyticsContext } from "@/features/dashboard/components/dashboard-analytics-context";
import { resolveDashboardPageTitle } from "@/features/dashboard/lib/resolve-dashboard-page-title";

function formatComputedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardHeader({
  profile,
  role,
  onMenuClick,
}: {
  profile: UserProfile | null;
  role: SalesPortalRole | null;
  onMenuClick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const analytics = useOptionalDashboardAnalyticsContext();
  const pageTitle = resolveDashboardPageTitle(pathname);
  const showAnalyticsRefresh = isDashboardAppPath(pathname) && analytics;
  const asOf = formatComputedAt(analytics?.computedAt ?? null);
  const displayName = profile?.displayName || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
              {pageTitle}
            </h1>
            {showAnalyticsRefresh && asOf ?
              <p className="truncate text-xs text-[var(--muted-foreground)]">
                Data as of {asOf}
                {analytics?.isRefreshing ? " · Refreshing…" : ""}
              </p>
            : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showAnalyticsRefresh ?
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={analytics?.isRefreshing}
              onClick={() => void analytics?.refresh()}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${analytics?.isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          : null}

          <Link
            href="/dashboard/settings"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {role ? roleLabel(role) : ""}
              </p>
            </div>
            <div className="relative h-9 w-9 overflow-hidden rounded-full border border-[var(--border)] bg-teal-50">
              {profile?.photoURL ?
                <Image
                  src={profile.photoURL}
                  alt={displayName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              : <span className="flex h-full items-center justify-center text-xs font-semibold text-teal-800">
                  {initials}
                </span>
              }
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              apiClient.clearTokenCache();
              await signOut(auth);
              router.push("/login");
            }}
            className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
