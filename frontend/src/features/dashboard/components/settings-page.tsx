"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { roleLabel } from "@/lib/auth-status";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export function SettingsPage() {
  const { loading, status } = useAuthGuard("dashboard");
  const { profile } = useSalesProfile();

  if (loading || !status) {
    return (
      <div className="h-40 animate-pulse rounded-xl bg-zinc-200" />
    );
  }

  const displayName =
    profile?.displayName || status.displayName || status.email || "User";
  const role = status.role || profile?.role;
  const email = status.email || profile?.email || "—";
  const phone = profile?.phone || status.userProfile?.phone || "—";
  const team = profile?.team || "—";
  const location = profile?.location || "—";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Your Sales Portal profile. Contact an admin to change role or access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Read-only view of your account in Sales Portal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" value={displayName} />
          <Field label="Email" value={email} />
          <Field label="Role" value={role ? roleLabel(role) : "—"} />
          <Field label="Phone" value={phone} />
          {role === "sales" ?
            <Field label="Team" value={team} />
          : null}
          {role === "manager" ?
            <Field label="Location" value={location} />
          : null}
        </CardContent>
      </Card>
    </div>
  );
}
