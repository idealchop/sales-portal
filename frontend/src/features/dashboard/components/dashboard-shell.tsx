"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { DashboardHeader } from "./dashboard-header";
import { DashboardNav } from "./dashboard-nav";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { prefetchDashboardAnalytics } from "@/lib/dashboard/fetch-dashboard-analytics";
import { cn } from "@/lib/utils";
import type { SalesPortalRole } from "@/lib/auth-status";
import type { UserProfile } from "@/lib/definitions";

function profileFromAuthStatus(
  status: NonNullable<ReturnType<typeof useAuthGuard>["status"]>,
): UserProfile {
  return {
    id: status.uid,
    displayName:
      status.salesProfile?.displayName ||
      status.displayName ||
      status.userProfile?.displayName ||
      "User",
    role: status.role ?? "sales",
    phone: status.salesProfile?.phone || status.userProfile?.phone,
    birthday: status.salesProfile?.birthday || status.userProfile?.birthday,
    photoURL: status.salesProfile?.photoURL ?? status.userProfile?.photoURL,
    email: status.email || status.userProfile?.email,
  };
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { loading, status } = useAuthGuard("dashboard");
  const { profile } = useSalesProfile();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  useEffect(() => {
    if (!loading && status) {
      prefetchDashboardAnalytics();
    }
  }, [loading, status]);

  const role = (status?.role || profile?.role || null) as SalesPortalRole | null;
  const headerProfile = profile ?? (status ? profileFromAuthStatus(status) : null);

  if (loading || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-white transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
          <Logo size={32} />
          <div>
            <p className="font-semibold text-foreground">Smart Refill</p>
            <p className="text-xs text-[var(--muted-foreground)]">Sales Portal</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DashboardNav role={role} onNavigate={() => setMobileOpen(false)} />
        </div>
        <div className="border-t border-[var(--border)] p-4 text-xs text-zinc-400">
          v2.0
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          profile={headerProfile}
          role={role}
          onMenuClick={() => setMobileOpen((open) => !open)}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
