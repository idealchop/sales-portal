"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Settings } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { apiClient } from "@/lib/api-client";
import { roleLabel, type SalesPortalRole } from "@/lib/auth-status";
import type { UserProfile } from "@/lib/definitions";

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
  const displayName = profile?.displayName || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-white/90 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="hidden text-sm font-medium text-zinc-500 sm:block">
          Smart Refill Sales Portal
        </p>
      </div>

      <div className="flex items-center gap-3">
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
            {profile?.photoURL ? (
              <Image
                src={profile.photoURL}
                alt={displayName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full items-center justify-center text-xs font-semibold text-teal-800">
                {initials}
              </span>
            )}
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
    </header>
  );
}
