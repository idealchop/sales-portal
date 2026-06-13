"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { Logo } from "@/components/logo";
import { WaterBackground } from "@/components/water-background";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/lib/firebase/auth";

type OnboardingShellProps = {
  children: ReactNode;
  step: number;
  title: string;
  description: string;
  requiresPasswordChange?: boolean;
};

export function OnboardingShell({
  children,
  step,
  title,
  description,
  requiresPasswordChange = true,
}: OnboardingShellProps) {
  const router = useRouter();
  const { loading } = useAuthGuard("onboarding");
  const [signingOut, setSigningOut] = useState(false);
  const steps = requiresPasswordChange
    ? (["Profile", "Password", "Confirm"] as const)
    : (["Profile", "Confirm"] as const);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      apiClient.clearTokenCache();
      await signOut(auth);
      router.push("/login");
    } catch {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <WaterBackground />
        <div className="relative h-12 w-12 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      <WaterBackground />
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-white/95 p-6 shadow-lg backdrop-blur-sm md:p-8">
          <div className="mb-6">
            <div className="relative mb-4 flex items-center justify-center">
              <Logo />
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
            <div className="mb-4 flex justify-center gap-2">
              {steps.map((label, index) => {
                const stepNum = index + 1;
                const active = stepNum === step;
                const done = stepNum < step;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                      active
                        ? "bg-[var(--primary)] text-white"
                        : done
                          ? "bg-teal-50 text-teal-800"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    <span>{stepNum}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {description}
              </p>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
