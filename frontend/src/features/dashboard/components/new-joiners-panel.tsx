"use client";

import { useState } from "react";
import { Building2, ShieldOff, UserPlus, Users } from "lucide-react";
import { RevokeAccessDialog } from "@/features/admin/components/revoke-access-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiClient, ApiError } from "@/lib/api-client";
import type { NewJoinersSummary } from "@/lib/dashboard/analytics";
import type { SalesPortalRole } from "@/lib/auth-status";

type JoinerView = "salesReps" | "businesses" | "platformUsers";

type RevokeTarget = {
  uid: string;
  displayName: string;
  email?: string;
};

function formatJoinedAt(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NewJoinersPanel({
  newJoiners,
  role,
  onRevoked,
  embedded = false,
}: {
  newJoiners?: NewJoinersSummary | null;
  role?: SalesPortalRole | null;
  onRevoked?: () => void;
  embedded?: boolean;
}) {
  const salesReps = newJoiners?.salesReps ?? [];
  const businesses = newJoiners?.businesses ?? [];
  const platformUsers = newJoiners?.platformUsers ?? [];

  const showSalesReps = role === "admin" || role === "manager";
  const canRevoke = role === "admin";
  const defaultView: JoinerView =
    showSalesReps ? "salesReps" : "businesses";
  const [view, setView] = useState<JoinerView>(defaultView);
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const counts = {
    salesReps: salesReps.length,
    businesses: businesses.length,
    platformUsers: platformUsers.length,
  };

  const total = counts.salesReps + counts.businesses + counts.platformUsers;
  if (total === 0 && !embedded) return null;

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      await apiClient.post(`/admin/users/${revokeTarget.uid}/revoke-access`);
      setRevokeTarget(null);
      onRevoked?.();
    } catch (err) {
      setRevokeError(
        err instanceof ApiError ? err.message : "Could not revoke access.",
      );
    } finally {
      setRevoking(false);
    }
  }

  function revokeButton(target: RevokeTarget) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-amber-200 text-amber-800 hover:bg-amber-50"
        onClick={() => {
          setRevokeError(null);
          setRevokeTarget(target);
        }}
      >
        <ShieldOff className="mr-2 h-4 w-4" />
        Revoke
      </Button>
    );
  }

  const content = (
    <>
      <div className="flex flex-wrap gap-2">
        {showSalesReps ?
          <Button
            variant={view === "salesReps" ? "primary" : "outline"}
            size="sm"
            onClick={() => setView("salesReps")}
          >
            <Users className="mr-2 h-4 w-4" />
            Sales reps ({counts.salesReps})
          </Button>
        : null}
        <Button
          variant={view === "businesses" ? "primary" : "outline"}
          size="sm"
          onClick={() => setView("businesses")}
        >
          <Building2 className="mr-2 h-4 w-4" />
          Businesses ({counts.businesses})
        </Button>
        <Button
          variant={view === "platformUsers" ? "primary" : "outline"}
          size="sm"
          onClick={() => setView("platformUsers")}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Platform users ({counts.platformUsers})
        </Button>
      </div>

      <div className="space-y-3">
        {revokeError ?
          <p className="text-sm text-red-600">{revokeError}</p>
        : null}

        {total === 0 ?
          <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
            0 new joiners
          </p>
        : null}

        {view === "salesReps" && showSalesReps ?
            salesReps.length === 0 ?
              <p className="text-sm text-[var(--muted-foreground)]">
                No recent sales reps in your scope.
              </p>
            : salesReps.map((rep) => (
                <div
                  key={rep.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{rep.displayName}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {rep.email || rep.role || "Sales rep"}
                      {rep.team ? ` · ${rep.team}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Joined {formatJoinedAt(rep.joinedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        rep.onboardingComplete ?
                          "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                      }
                    >
                      {rep.onboardingComplete ? "Onboarded" : "Setup pending"}
                    </Badge>
                    {canRevoke ?
                      revokeButton({
                        uid: rep.id,
                        displayName: rep.displayName,
                        email: rep.email,
                      })
                    : null}
                  </div>
                </div>
              ))

          : null}

          {view === "businesses" ?
            businesses.length === 0 ?
              <p className="text-sm text-[var(--muted-foreground)]">
                No recent workspaces yet.
              </p>
            : businesses.map((business) => (
                <div
                  key={business.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{business.name}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {business.ownerEmail || "No owner email"}
                      {business.planName ? ` · ${business.planName}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Joined {formatJoinedAt(business.joinedAt)}
                    </p>
                  </div>
                  <Badge
                    className={
                      business.onboardingComplete ?
                        "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                    }
                  >
                    {business.onboardingComplete ? "Live" : "Onboarding"}
                  </Badge>
                </div>
              ))

          : null}

          {view === "platformUsers" ?
            platformUsers.length === 0 ?
              <p className="text-sm text-[var(--muted-foreground)]">
                No recent platform users yet.
              </p>
            : platformUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {user.displayName || user.email || user.id}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {user.email || "SmartRefill user"} · {user.role}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Joined {formatJoinedAt(user.joinedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{user.role}</Badge>
                    {canRevoke ?
                      revokeButton({
                        uid: user.id,
                        displayName: user.displayName || user.email || user.id,
                        email: user.email,
                      })
                    : null}
                  </div>
                </div>
              ))

          : null}
      </div>
    </>
  );

  return (
    <>
      {embedded ?
        <div className="space-y-3">{content}</div>
      : <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              New joiners
            </CardTitle>
            <CardDescription>
              Recent sales reps, SmartRefill workspaces, and platform users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">{content}</CardContent>
        </Card>
      }

      {revokeTarget ?
        <RevokeAccessDialog
          displayName={revokeTarget.displayName}
          email={revokeTarget.email}
          revoking={revoking}
          onClose={() => {
            if (!revoking) setRevokeTarget(null);
          }}
          onConfirm={() => void confirmRevoke()}
        />
      : null}
    </>
  );
}
