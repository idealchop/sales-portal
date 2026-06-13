"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Briefcase,
  Calendar,
  Loader2,
  Phone,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import {
  fetchAuthStatus,
  roleLabel,
  type SalesPortalRole,
  type SelfSelectableRole,
} from "@/lib/auth-status";
import {
  fetchOnboardingManagers,
  uploadOnboardingAvatar,
} from "@/lib/onboarding-api";
import { ApiError } from "@/lib/api-client";
import { auth } from "@/lib/firebase/auth";

const inputClassName =
  "h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-foreground outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

const labelClassName = "mb-1.5 block text-sm font-medium text-foreground";

function buildSchema(role: SalesPortalRole | null) {
  return z
    .object({
      firstName: z.string().min(2, "First name must be at least 2 characters."),
      lastName: z.string().min(2, "Last name must be at least 2 characters."),
      phone: z.string().min(10, "Please enter a valid mobile number."),
      birthday: z.string().min(1, "Your date of birth is required."),
      team: z.string().optional(),
      location: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (role === "sales" && !data.team?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Team is required for sales executives.",
          path: ["team"],
        });
      }
      if (role === "manager" && !data.location?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Location is required for sales managers.",
          path: ["location"],
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function parseBirthdayInput(value?: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function OnboardingProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assignedRole, setAssignedRole] = useState<SalesPortalRole | null>(null);
  const [roleAssigned, setRoleAssigned] = useState(true);
  const [selectedRole, setSelectedRole] = useState<SelfSelectableRole | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [managers, setManagers] = useState<
    Awaited<ReturnType<typeof fetchOnboardingManagers>>["managers"]
  >([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(true);

  const effectiveRole: SalesPortalRole | null = roleAssigned
    ? assignedRole
    : selectedRole;

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(effectiveRole)),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: searchParams.get("phone") || "",
      birthday: parseBirthdayInput(searchParams.get("birthday")),
      team: searchParams.get("team") || "",
      location: searchParams.get("location") || "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const status = await fetchAuthStatus();
        if (cancelled) return;

        setAssignedRole(status.role);
        setRoleAssigned(status.roleAssigned);
        setRequiresPasswordChange(status.requiresPasswordChange ?? true);

        const paramRole = searchParams.get("role");
        if (
          !status.roleAssigned &&
          (paramRole === "sales" || paramRole === "manager")
        ) {
          setSelectedRole(paramRole);
        }

        const displayName =
          searchParams.get("displayName") ||
          status.userProfile?.displayName ||
          status.salesProfile?.displayName ||
          status.displayName ||
          auth.currentUser?.displayName ||
          "";
        if (displayName) {
          const parts = displayName.trim().split(/\s+/);
          const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
          const firstName =
            parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] || "";
          form.setValue("firstName", firstName);
          form.setValue("lastName", lastName);
        }

        const phone =
          searchParams.get("phone") ||
          status.userProfile?.phone ||
          status.salesProfile?.phone ||
          "";
        if (phone) form.setValue("phone", phone);

        const birthday = parseBirthdayInput(
          searchParams.get("birthday") ||
            status.userProfile?.birthday ||
            status.salesProfile?.birthday,
        );
        if (birthday) form.setValue("birthday", birthday);

        const photo =
          searchParams.get("photoURL") ||
          status.userProfile?.photoURL ||
          status.salesProfile?.photoURL ||
          auth.currentUser?.photoURL;
        if (photo) setPhotoPreview(photo);

        if (
          status.roleAssigned &&
          (status.role === "sales" || status.role === "manager")
        ) {
          const data = await fetchOnboardingManagers();
          if (!cancelled) {
            setManagers(data.managers);
            setLocations(data.locations);
          }
        }
      } catch {
        if (!cancelled) setError("Unable to load your account. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [form, searchParams]);

  useEffect(() => {
    if (roleAssigned) return;
    if (selectedRole !== "sales" && selectedRole !== "manager") return;

    let cancelled = false;
    void fetchOnboardingManagers().then((data) => {
      if (!cancelled) {
        setManagers(data.managers);
        setLocations(data.locations);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [roleAssigned, selectedRole]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRoleSelect = (role: SelfSelectableRole) => {
    setSelectedRole(role);
    if (role === "manager") {
      form.setValue("team", "");
    } else {
      form.setValue("location", "");
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!effectiveRole || !auth.currentUser) {
      setError("Please select your role before continuing.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const displayName = `${values.firstName} ${values.lastName}`.trim();
    const params = new URLSearchParams();
    params.set("displayName", displayName);
    params.set("phone", values.phone);
    params.set("birthday", new Date(values.birthday).toISOString());
    if (!roleAssigned) {
      params.set("role", effectiveRole);
    }
    if (effectiveRole === "manager" && values.location) {
      params.set("location", values.location);
    }
    if (effectiveRole === "sales" && values.team) {
      params.set("team", values.team);
    }

    try {
      if (photoFile) {
        const downloadURL = await uploadOnboardingAvatar(photoFile);
        params.set("photoURL", downloadURL);
      } else if (photoPreview && !photoPreview.startsWith("blob:")) {
        params.set("photoURL", photoPreview);
      }

      const query = params.toString();
      router.push(
        requiresPasswordChange
          ? `/onboarding/password?${query}`
          : `/onboarding/complete-setup?${query}`,
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to upload your photo. Please try again.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  const firstName = useWatch({ control: form.control, name: "firstName" });
  const lastName = useWatch({ control: form.control, name: "lastName" });
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`;

  if (loading) {
    return (
      <OnboardingShell
        step={1}
        requiresPasswordChange={requiresPasswordChange}
        title="Step 1: Complete Your Profile"
        description="Loading your account..."
      >
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={1}
      requiresPasswordChange={requiresPasswordChange}
      title="Step 1: Complete Your Profile"
      description="Just a few more details to get your account ready."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-28 w-28 overflow-hidden rounded-full border-2 border-[var(--border)] bg-zinc-50"
          >
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Profile"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full items-center justify-center text-3xl font-semibold text-zinc-400">
                {initials || "?"}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
              <Upload className="h-6 w-6 text-white" />
            </span>
          </button>
          {photoPreview && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <Trash2 className="h-3 w-3" />
              Remove photo
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {roleAssigned && effectiveRole ? (
          <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-4">
            <div className="flex items-center gap-3">
              {effectiveRole === "admin" ? (
                <Shield className="h-5 w-5 text-[var(--primary)]" />
              ) : effectiveRole === "manager" ? (
                <Briefcase className="h-5 w-5 text-[var(--primary)]" />
              ) : (
                <User className="h-5 w-5 text-[var(--primary)]" />
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Assigned role
                </p>
                <p className="font-semibold text-foreground">
                  {roleLabel(effectiveRole)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              What is your role?
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => handleRoleSelect("manager")}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedRole === "manager"
                    ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="h-6 w-6 text-[var(--primary)]" />
                  <div>
                    <p className="font-semibold">Sales Manager</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      I manage a sales team.
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect("sales")}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedRole === "sales"
                    ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="h-6 w-6 text-[var(--primary)]" />
                  <div>
                    <p className="font-semibold">Sales Executive</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      I am part of a sales team.
                    </p>
                  </div>
                </div>
              </button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Administrator access must be assigned by your organization.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClassName}>First name</label>
            <input className={inputClassName} {...form.register("firstName")} />
            {form.formState.errors.firstName && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClassName}>Last name</label>
            <input className={inputClassName} {...form.register("lastName")} />
            {form.formState.errors.lastName && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClassName}>Mobile number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                className={`${inputClassName} pl-10`}
                placeholder="(0917) 123 4567"
                {...form.register("phone")}
              />
            </div>
            {form.formState.errors.phone && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClassName}>Date of birth</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="date"
                className={`${inputClassName} pl-10`}
                max={new Date().toISOString().slice(0, 10)}
                {...form.register("birthday")}
              />
            </div>
            {form.formState.errors.birthday && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.birthday.message}
              </p>
            )}
          </div>
        </div>

        {effectiveRole === "manager" && (
          <div>
            <label className={labelClassName}>Location</label>
            <input
              className={inputClassName}
              list="onboarding-locations"
              placeholder="Select or enter your location"
              {...form.register("location")}
            />
            <datalist id="onboarding-locations">
              {locations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
            {form.formState.errors.location && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.location.message}
              </p>
            )}
          </div>
        )}

        {effectiveRole === "sales" && (
          <div>
            <label className={labelClassName}>Team</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <select
                className={`${inputClassName} pl-10`}
                {...form.register("team")}
              >
                <option value="">Select your team</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.teamLabel}>
                    {manager.teamLabel}
                  </option>
                ))}
              </select>
            </div>
            {managers.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No managers found yet. Contact your administrator.
              </p>
            )}
            {form.formState.errors.team && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.team.message}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !effectiveRole}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-sm font-bold text-white transition hover:from-[var(--primary-dark)] hover:to-[#36a6a0] disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save and proceed
        </button>
      </form>
    </OnboardingShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <OnboardingProfileContent />
    </Suspense>
  );
}
