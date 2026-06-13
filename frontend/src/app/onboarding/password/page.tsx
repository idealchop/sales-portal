"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { saveOnboardingPasswords } from "@/features/onboarding/lib/onboarding-session";
import { fetchAuthStatus } from "@/lib/auth-status";

const formSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password."),
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

const inputClassName =
  "h-11 w-full rounded-lg border border-[var(--border)] bg-white pl-10 pr-10 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

function PasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const profileQuery = searchParams.toString();
  const backHref = `/onboarding?${profileQuery}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    void fetchAuthStatus().then((status) => {
      if (cancelled) return;
      if (!status.requiresPasswordChange) {
        router.replace(`/onboarding/complete-setup?${profileQuery}`);
        return;
      }
      setCheckingAccess(false);
    });
    return () => {
      cancelled = true;
    };
  }, [profileQuery, router]);

  const onSubmit = (values: FormValues) => {
    setIsSubmitting(true);
    saveOnboardingPasswords({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    router.push(`/onboarding/complete-setup?${profileQuery}`);
  };

  if (checkingAccess) {
    return (
      <OnboardingShell
        step={2}
        title="Step 2: Create a New Password"
        description="Checking your account..."
      >
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={2}
      title="Step 2: Create a New Password"
      description="As a final security measure, please update your temporary password."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {(["currentPassword", "newPassword", "confirmPassword"] as const).map(
          (fieldName) => {
            const labels = {
              currentPassword: "Current password",
              newPassword: "New password",
              confirmPassword: "Confirm new password",
            };
            const placeholders = {
              currentPassword: "Enter your temporary password",
              newPassword: "Enter new password (min. 8 characters)",
              confirmPassword: "Confirm your new password",
            };
            const show =
              fieldName === "currentPassword"
                ? showCurrent
                : fieldName === "newPassword"
                  ? showNew
                  : showConfirm;
            const setShow =
              fieldName === "currentPassword"
                ? setShowCurrent
                : fieldName === "newPassword"
                  ? setShowNew
                  : setShowConfirm;

            return (
              <div key={fieldName}>
                <label className="mb-1.5 block text-sm font-medium">
                  {labels[fieldName]}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type={show ? "text" : "password"}
                    placeholder={placeholders[fieldName]}
                    className={inputClassName}
                    {...form.register(fieldName)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    aria-label="Toggle password visibility"
                  >
                    {show ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors[fieldName] && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors[fieldName]?.message}
                  </p>
                )}
              </div>
            );
          },
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Proceed to final step
        </button>

        <Link
          href={backHref}
          className="block text-center text-sm text-[var(--primary)] hover:underline"
        >
          Go back
        </Link>
      </form>
    </OnboardingShell>
  );
}

export default function PasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <PasswordContent />
    </Suspense>
  );
}
