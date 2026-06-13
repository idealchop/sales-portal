"use client";

import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Fingerprint,
  Mail,
  Phone,
  Shield,
  Sparkles,
  User,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CopyableUserId } from "@/features/admin/components/copyable-user-id";
import {
  dataManagementStaffRoleLabel,
  dataManagementStatusLabel,
  formatActiveSubscriptionTitle,
  formatMemberBreakdown,
  type DataManagementLinkRow,
  type DataManagementLinkStatus,
} from "@/lib/admin/data-management";
import {
  extractAppAccess,
  extractDocumentFields,
  extractRootProfileFields,
  formatAppAccessSummary,
  formatProfileScalar,
  formatProfileTimestamp,
  splitUserDocuments,
  type AppAccessProfileEntry,
  type ProfileField,
} from "@/lib/admin/user-profile-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { formatSubscriptionPeriod } from "@/lib/dashboard/subscription-labels";
import { cn } from "@/lib/utils";

type RoleTab = "owners" | "staff";

const STATUS_STYLES: Record<DataManagementLinkStatus, string> = {
  linked: "border-emerald-200/80 bg-emerald-50/80 text-emerald-800",
  no_business: "border-amber-200/80 bg-amber-50/80 text-amber-800",
  no_user: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

const FIELD_ICON_MAP: Record<string, LucideIcon> = {
  displayName: User,
  fullName: User,
  email: Mail,
  phone: Phone,
  birthday: Calendar,
  onboardingComplete: CheckCircle2,
  uid: Fingerprint,
  createdAt: Clock,
  updatedAt: Clock,
};

function fieldIcon(key: string): LucideIcon {
  return FIELD_ICON_MAP[key] ?? User;
}

function ProfileFormField({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100/80 text-zinc-500">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="text-[13px] font-medium text-zinc-600">{label}</span>
      </div>
      <div className="rounded-lg bg-white px-3.5 py-2.5 text-sm leading-relaxed text-zinc-900 ring-1 ring-zinc-200/70">
        {children}
      </div>
    </div>
  );
}

function ProfileFieldContent({ field }: { field: ProfileField }) {
  if (field.kind === "boolean" && field.key === "onboardingComplete") {
    const active = field.value === true;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
          active ?
            "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
          : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/60",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            active ? "bg-emerald-500" : "bg-zinc-400",
          )}
        />
        {active ? "Complete" : "Pending"}
      </span>
    );
  }

  if (field.kind === "boolean") {
    return <span className="text-zinc-700">{field.value === true ? "Yes" : "No"}</span>;
  }

  const formatted =
    field.kind === "timestamp" ?
      formatProfileTimestamp(field.value)
    : formatProfileScalar(field.value);

  return formatted ?
      <span className="break-words text-zinc-800">{formatted}</span>
    : <span className="text-zinc-400">Not set</span>;
}

function AppAccessCard({ entry }: { entry: AppAccessProfileEntry }) {
  return (
    <div className="group rounded-xl bg-white p-4 ring-1 ring-zinc-200/70 transition hover:ring-zinc-300/80">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-700 ring-1 ring-teal-100/80">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold tracking-tight text-zinc-900">
              {entry.appName}
            </p>
            {entry.role && (
              <p className="mt-0.5 text-sm capitalize text-zinc-500">
                {entry.role}
              </p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
            entry.accessRevoked ?
              "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60"
            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
          )}
        >
          {entry.accessRevoked ? "Revoked" : "Active"}
        </span>
      </div>
      <p className="mt-3 border-t border-zinc-100 pt-3 text-xs leading-relaxed text-zinc-500">
        {formatAppAccessSummary(entry)}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-1.5 h-8 w-0.5 shrink-0 rounded-full bg-teal-500/70" />
      <div>
        <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900">
          {title}
        </h4>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function SidebarCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200/70">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500">
          <Icon className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-semibold tracking-tight text-zinc-900">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

export function UserProfileCollectionView({
  documents,
  isLoading,
  error,
  displayName,
  profilePhoto,
  profileEmail,
  uid,
  row,
  tab,
  onPhotoClick,
}: {
  documents: UserFirestoreDocumentRow[];
  isLoading: boolean;
  error: string | null;
  displayName: string;
  profilePhoto?: string;
  profileEmail?: string;
  uid: string;
  row: DataManagementLinkRow;
  tab: RoleTab;
  onPhotoClick?: () => void;
}) {
  const { root, otherSubdocuments } = splitUserDocuments(documents);
  const rootFields = root ?
    extractRootProfileFields(root.data).filter(
      (field) =>
        field.key !== "photoURL" &&
        field.key !== "uid" &&
        field.key !== "onboardingComplete",
    )
  : [];
  const appAccess = root ? extractAppAccess(root.data) : [];

  const primaryFields = rootFields.filter((field) =>
    ["displayName", "fullName", "email", "phone", "birthday"].includes(
      field.key,
    ),
  );
  const metaFields = rootFields.filter(
    (field) => !primaryFields.some((primary) => primary.key === field.key),
  );

  if (isLoading && documents.length === 0) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-2xl bg-zinc-50/50 p-6 ring-1 ring-zinc-200/60">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-white" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
      <div className="rounded-2xl bg-zinc-50/40 p-6 ring-1 ring-zinc-200/60">
        <div className="space-y-10">
          {primaryFields.length > 0 && (
            <section>
              <SectionHeader
                title="Account information"
                description="Personal details stored on this user record"
              />
              <div className="grid gap-5 sm:grid-cols-2">
                {primaryFields.map((field) => (
                  <ProfileFormField
                    key={field.key}
                    label={field.label}
                    icon={fieldIcon(field.key)}
                    className={field.key === "email" ? "sm:col-span-2" : undefined}
                  >
                    <ProfileFieldContent field={field} />
                  </ProfileFormField>
                ))}
              </div>
            </section>
          )}

          {appAccess.length > 0 && (
            <section>
              <SectionHeader
                title="Application access"
                description="Products and roles assigned to this account"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {appAccess.map((entry, index) => (
                  <AppAccessCard key={`${entry.appId}-${index}`} entry={entry} />
                ))}
              </div>
            </section>
          )}

          {metaFields.length > 0 && (
            <section>
              <SectionHeader title="Record details" />
              <div className="grid gap-5 sm:grid-cols-2">
                {metaFields.map((field) => (
                  <ProfileFormField
                    key={field.key}
                    label={field.label}
                    icon={fieldIcon(field.key)}
                  >
                    <ProfileFieldContent field={field} />
                  </ProfileFormField>
                ))}
              </div>
            </section>
          )}

          {otherSubdocuments.map((doc) => {
            const fields = extractDocumentFields(doc.data);
            if (fields.length === 0) return null;
            return (
              <section key={doc.path}>
                <SectionHeader
                  title={doc.collectionId}
                  description={doc.documentId}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  {fields.map((field) => (
                    <ProfileFormField
                      key={`${doc.path}-${field.key}`}
                      label={field.label}
                      icon={fieldIcon(field.key)}
                    >
                      <ProfileFieldContent field={field} />
                    </ProfileFormField>
                  ))}
                </div>
              </section>
            );
          })}

          {!root && otherSubdocuments.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-800">
                No profile data yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Firestore documents for this user will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-0">
        <div className="relative rounded-2xl bg-white ring-1 ring-zinc-200/70">
          <div className="relative h-20 overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-teal-800">
            <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
            <div className="absolute -right-6 top-0 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
          </div>
          <div className="relative z-10 -mt-11 flex justify-center px-5">
            {profilePhoto ?
              <button
                type="button"
                onClick={onPhotoClick}
                className="h-[88px] w-[88px] overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)] ring-1 ring-zinc-200/80 transition hover:shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
                aria-label={`View ${displayName} photo`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profilePhoto}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              </button>
            : <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-[3px] border-white bg-zinc-100 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-zinc-200/80">
                <UserRound className="h-9 w-9 text-zinc-400" />
              </div>
            }
          </div>
          <div className="px-5 pb-5 pt-3">
            <div className="text-center">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-900">
                {displayName}
              </h3>
              {profileEmail && (
                <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{profileEmail}</span>
                </p>
              )}
              <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
                {tab === "staff" && row.staffRole && (
                  <Badge className="border-zinc-200 bg-zinc-50 font-normal text-zinc-700">
                    {dataManagementStaffRoleLabel(row.staffRole)}
                  </Badge>
                )}
                <Badge
                  className={cn("font-normal", STATUS_STYLES[row.status])}
                >
                  {dataManagementStatusLabel(row.status)}
                </Badge>
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-zinc-50 px-3 py-3 ring-1 ring-zinc-200/50">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                User ID
              </p>
              <div className="mt-1.5">
                <CopyableUserId uid={uid} label="" copyLabel="user ID" muted />
              </div>
            </div>
          </div>
        </div>

        <SidebarCard title="Workspace" icon={Building2}>
          {row.businessName ?
            <div className="space-y-2.5">
              <p className="font-medium leading-snug text-zinc-900">
                {row.businessName}
              </p>
              {row.businessId && (
                <CopyableUserId
                  uid={row.businessId}
                  label=""
                  copyLabel="business ID"
                  muted
                />
              )}
              {tab === "staff" && row.ownerDisplayName && (
                <p className="text-sm text-zinc-500">
                  Owner · {row.ownerDisplayName}
                </p>
              )}
              {tab === "owners" && (
                <p className="flex items-center gap-1.5 text-sm text-zinc-500">
                  <Users className="h-3.5 w-3.5" />
                  {formatMemberBreakdown(row.memberBreakdown) ??
                    "0 admins · 0 riders"}
                </p>
              )}
            </div>
          : <p className="text-sm text-zinc-500">No linked workspace</p>}
        </SidebarCard>

        {tab === "owners" && (
          <SidebarCard title="Subscription" icon={CreditCard}>
            {row.activeSubscription ?
              <div className="space-y-1">
                <p className="font-medium leading-snug text-zinc-900">
                  {formatActiveSubscriptionTitle(row.activeSubscription)}
                </p>
                <p className="text-sm text-zinc-500">
                  {formatSubscriptionPeriod(row.activeSubscription)}
                </p>
              </div>
            : <p className="text-sm text-zinc-500">No active plan</p>}
          </SidebarCard>
        )}
      </aside>
    </div>
  );
}
