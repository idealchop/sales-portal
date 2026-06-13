"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Loader2,
  MapPin,
  Phone,
  Shield,
  User,
  Users,
} from "lucide-react";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import {
  clearOnboardingPasswords,
  loadOnboardingPasswords,
} from "@/features/onboarding/lib/onboarding-session";
import { completeOnboarding } from "@/lib/onboarding-api";
import { fetchAuthStatus, roleLabel, type SalesPortalRole } from "@/lib/auth-status";
import { auth } from "@/lib/firebase/auth";
import { apiClient } from "@/lib/api-client";

function CompleteSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<SalesPortalRole | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(true);
  const [status, setStatus] = useState<"idle" | "finalizing" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const displayName = searchParams.get("displayName");
  const team = searchParams.get("team");
  const location = searchParams.get("location");
  const roleParam = searchParams.get("role");
  const birthdayStr = searchParams.get("birthday");
  const phone = searchParams.get("phone");
  const photoURL = searchParams.get("photoURL");
  const birthday = birthdayStr ? new Date(birthdayStr) : null;

  const confirmStep = requiresPasswordChange ? 3 : 2;
  const backHref = requiresPasswordChange
    ? `/onboarding/password?${searchParams.toString()}`
    : `/onboarding?${searchParams.toString()}`;

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const authStatus = await fetchAuthStatus();
        if (cancelled) return;

        setRequiresPasswordChange(authStatus.requiresPasswordChange);

        const resolvedRole = authStatus.roleAssigned
          ? authStatus.role
          : roleParam === "sales" || roleParam === "manager"
            ? roleParam
            : authStatus.role;
        setRole(resolvedRole);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [roleParam]);

  useEffect(() => {
    if (loading) return;
    const passwords = loadOnboardingPasswords();
    const missingProfile = !displayName || !phone || !birthdayStr;
    const missingPasswords = requiresPasswordChange && !passwords;
    if (missingProfile || missingPasswords) {
      router.replace("/onboarding");
    }
  }, [loading, displayName, phone, birthdayStr, requiresPasswordChange, router]);

  const handleFinalize = async () => {
    const passwords = loadOnboardingPasswords();
    const user = auth.currentUser;

    if (!user?.email || !displayName || !phone || !birthday || !role) {
      setError("Onboarding data is incomplete. Please start over.");
      router.push("/onboarding");
      return;
    }

    if (requiresPasswordChange && !passwords) {
      setError("Onboarding data is incomplete. Please start over.");
      router.push("/onboarding");
      return;
    }

    setStatus("finalizing");
    setError(null);

    try {
      if (requiresPasswordChange && passwords) {
        const credential = EmailAuthProvider.credential(
          user.email,
          passwords.currentPassword,
        );
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwords.newPassword);
      }

      await updateProfile(user, {
        displayName,
        photoURL: photoURL || null,
      });

      await completeOnboarding({
        displayName,
        phone,
        birthday: birthday.toISOString(),
        photoURL: photoURL || null,
        ...(role === "sales" && team ? { team } : {}),
        ...(role === "manager" && location ? { location } : {}),
        ...(role === "sales" || role === "manager" ? { role } : {}),
      });

      clearOnboardingPasswords();
      apiClient.clearTokenCache();
      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (
          err.code === "auth/wrong-password" ||
          err.code === "auth/invalid-credential"
        ) {
          clearOnboardingPasswords();
          setError("Your current password was incorrect. Please try again.");
          router.push(`/onboarding/password?${searchParams.toString()}`);
          return;
        }
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      setStatus("idle");
    }
  };

  if (loading || !displayName || !role) {
    return (
      <OnboardingShell
        step={confirmStep}
        requiresPasswordChange={requiresPasswordChange}
        title={
          requiresPasswordChange
            ? "Step 3: Confirm Your Details"
            : "Step 2: Confirm Your Details"
        }
        description="Loading..."
      >
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </OnboardingShell>
    );
  }

  if (status === "success") {
    return (
      <OnboardingShell
        step={confirmStep}
        requiresPasswordChange={requiresPasswordChange}
        title="Setup complete"
        description="Your account is ready."
      >
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <p className="text-lg font-semibold">Welcome, {displayName}!</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Redirecting to your dashboard...
          </p>
        </div>
      </OnboardingShell>
    );
  }

  const RoleIcon =
    role === "admin" ? Shield : role === "manager" ? Briefcase : User;

  return (
    <OnboardingShell
      step={confirmStep}
      requiresPasswordChange={requiresPasswordChange}
      title={
        requiresPasswordChange
          ? "Step 3: Confirm Your Details"
          : "Step 2: Confirm Your Details"
      }
      description="Review your information and complete the setup process."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[var(--border)] bg-zinc-50">
            {photoURL ? (
              <Image
                src={photoURL}
                alt={displayName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full items-center justify-center text-2xl font-semibold text-zinc-400">
                {displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold">{displayName}</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
            <RoleIcon className="h-4 w-4" />
            {roleLabel(role)}
          </span>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/80 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-zinc-400" />
            <span className="text-zinc-500">Mobile:</span>
            <span className="font-medium">{phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <span className="text-zinc-500">Birthday:</span>
            <span className="font-medium">
              {birthday?.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          {role === "manager" && location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-500">Location:</span>
              <span className="font-medium">{location}</span>
            </div>
          )}
          {role === "sales" && team && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-500">Team:</span>
              <span className="font-medium">{team}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleFinalize}
          disabled={status === "finalizing"}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-sm font-bold text-white disabled:opacity-60"
        >
          {status === "finalizing" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finalizing your account...
            </>
          ) : (
            "Complete setup and go to dashboard"
          )}
        </button>

        <Link
          href={backHref}
          className="block text-center text-sm text-[var(--primary)] hover:underline"
        >
          Go back
        </Link>
      </div>
    </OnboardingShell>
  );
}

export default function CompleteSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <CompleteSetupContent />
    </Suspense>
  );
}
