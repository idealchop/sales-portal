"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { DashboardHeader } from "./dashboard-header";
import { DashboardNav } from "./dashboard-nav";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { cn } from "@/lib/utils";
import type { SalesPortalRole } from "@/lib/auth-status";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { loading, status } = useAuthGuard("dashboard");
  const { profile, loading: profileLoading } = useSalesProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (status?.role || profile?.role || null) as SalesPortalRole | null;

  if (loading || profileLoading || !status) {
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
          <DashboardNav role={role} />
        </div>
        <div className="border-t border-[var(--border)] p-4 text-xs text-zinc-400">
          v2.0
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          profile={profile}
          role={role}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
