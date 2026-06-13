"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/logo";
import { auth } from "@/lib/firebase/auth";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  fetchAuthStatus,
  recordLoginEvent,
  resolvePostLoginPath,
} from "@/lib/auth-status";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormValues = z.infer<typeof formSchema>;

const inputClassName =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-foreground outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

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

function BrandPanel() {
  return (
    <aside className="relative hidden w-1/2 flex-col bg-[#0a1628] lg:flex">
      <div className="p-10 xl:p-12">
        <div className="flex items-center gap-3">
          <Logo variant="white" size={36} />
          <span className="text-xl font-medium tracking-tight text-white lowercase">
            river
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-10 pb-16 xl:px-16">
        <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight text-white xl:text-[2.75rem] xl:leading-[1.15]">
          The platform to run{" "}
          <span className="text-blue-400">essential needs</span> for business
          workforce.
        </h1>
        <p className="mt-5 max-w-md text-lg text-zinc-400">
          Simplifying how modern teams operate.
        </p>
      </div>
    </aside>
  );
}

export function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

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
    setInfoMessage(null);
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

  async function handleForgotPassword() {
    setAccessError(null);
    setInfoMessage(null);

    const email = form.getValues("email").trim();
    if (!email) {
      setAccessError("Enter your email address, then choose forgot password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setInfoMessage("Password reset email sent. Check your inbox.");
    } catch (error) {
      if (error instanceof FirebaseError && error.code === "auth/user-not-found") {
        setInfoMessage("If an account exists for that email, a reset link was sent.");
        return;
      }
      setAccessError("Could not send reset email. Please try again.");
    }
  }

  const isFormDisabled = isSubmitting || isCheckingSession;

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-sans">
      <BrandPanel />

      <main className="flex w-full flex-col justify-center bg-white px-8 py-12 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={32} />
            <span className="text-lg font-medium lowercase text-foreground">
              river
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Welcome back! Please enter your details.
            </p>
          </div>

          {accessError && (
            <div className="mb-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{accessError}</p>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              {infoMessage}
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
            <fieldset disabled={isFormDisabled} className="grid gap-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className={inputClassName}
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-medium uppercase tracking-wider text-zinc-400"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    className="text-xs font-medium uppercase tracking-wider text-blue-600 transition hover:text-blue-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`${inputClassName} pr-10`}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ?
                      <EyeOff className="h-5 w-5" />
                    : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={isFormDisabled}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isFormDisabled && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign in
            </button>
          </form>

          <p className="mt-8 text-center text-xs uppercase tracking-wider text-zinc-400">
            Need access?{" "}
            <span className="text-zinc-500">Contact your administrator</span>
          </p>
        </div>
      </main>
    </div>
  );
}
