"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { Eye, EyeOff, Loader2, Lock, ShieldAlert, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { WaterBackground } from "@/components/water-background";
import { auth } from "@/lib/firebase/auth";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  fetchAuthStatus,
  recordLoginEvent,
  resolvePostLoginPath,
} from "@/lib/auth-status";

const MARKETING_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSales_Mats_v3.png?alt=media&token=5e2fc62e-0082-4c37-9078-e1cf5e188635";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormValues = z.infer<typeof formSchema>;

const inputClassName =
  "h-11 w-full rounded-lg border border-[var(--border)] bg-white pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

function resolveLoginAccessError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NO_SALES_PORTAL_ACCESS") {
      return `${error.message} An administrator must assign the Sales Portal app under Admin → Permissions.`;
    }
    if (error.code === "USER_DOC_NOT_FOUND") {
      return error.message;
    }
    if (error.status === 404 || error.status === 502 || error.status === 503) {
      return "The Sales Portal API is unavailable. For local development, run `npm run dev:api` in another terminal.";
    }
    return error.message;
  }

  if (error instanceof TypeError) {
    return "Could not reach the Sales Portal API. For local development, run `npm run dev:api` in another terminal.";
  }

  return "Could not verify Sales Portal access. Please try again.";
}

export function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setIsCheckingSession(false);
        return;
      }
      try {
        const status = await fetchAuthStatus();
        router.replace(resolvePostLoginPath(status));
      } catch {
        await signOut(auth);
        setIsCheckingSession(false);
      }
    });
    return () => unsub();
  }, [router]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setAccessError(null);
    apiClient.clearTokenCache();

    try {
      await signInWithEmailAndPassword(
        auth,
        values.email.trim(),
        values.password,
      );

      try {
        const status = await fetchAuthStatus();
        try {
          await recordLoginEvent();
        } catch {
          // Login still succeeds if event recording fails.
        }
        router.push(resolvePostLoginPath(status));
      } catch (error) {
        await signOut(auth);
        setAccessError(resolveLoginAccessError(error));
      }
    } catch (error) {
      let message = "An unexpected error occurred. Please try again.";
      if (error instanceof FirebaseError) {
        if (
          error.code === "auth/invalid-credential" ||
          error.code === "auth/user-not-found" ||
          error.code === "auth/wrong-password"
        ) {
          message = "Invalid email or password. Please try again.";
        } else if (error.code === "auth/too-many-requests") {
          message =
            "Too many failed attempts. Please try again later or reset your password.";
        }
      }
      setAccessError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = isSubmitting || isCheckingSession;

  if (isCheckingSession) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center overflow-hidden">
        <WaterBackground />
        <div className="relative h-16 w-16 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans">
      <WaterBackground />

      {/* Right — marketing illustration on light water wash */}
      <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
        <div className="absolute inset-0 bg-gradient-to-l from-sky-50/30 to-transparent" />
        <Image
          src={MARKETING_IMAGE}
          alt="Smart Refill — automating water refills for every facility and business size"
          fill
          className="object-contain p-8 lg:p-12"
          priority
        />
      </div>

      {/* Login form — clean centered look */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-8 md:justify-start md:pl-[8vw]">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <Logo />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Smart Refill Sales Portal
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Please enter your credentials to log in.
            </p>
          </div>

          {accessError && (
            <div className="mb-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{accessError}</p>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <fieldset disabled={isFormDisabled} className="grid gap-4">
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="Email Address"
                    className={inputClassName}
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Password"
                    className={`${inputClassName} pr-10`}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={isFormDisabled}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-sm font-bold text-white transition hover:from-[var(--primary-dark)] hover:to-[#36a6a0] disabled:opacity-60"
            >
              {isFormDisabled && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Login Now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
