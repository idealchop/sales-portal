"use client";

import { useState } from "react";
import { Building2, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NewJoinersSummary } from "@/lib/dashboard/analytics";
import type { SalesPortalRole } from "@/lib/auth-status";

type JoinerView = "salesReps" | "businesses" | "platformUsers";

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
}: {
  newJoiners?: NewJoinersSummary | null;
  role?: SalesPortalRole | null;
}) {
  const salesReps = newJoiners?.salesReps ?? [];
  const businesses = newJoiners?.businesses ?? [];
  const platformUsers = newJoiners?.platformUsers ?? [];

  const showSalesReps = role === "admin" || role === "manager";
  const defaultView: JoinerView =
    showSalesReps ? "salesReps" : "businesses";
  const [view, setView] = useState<JoinerView>(defaultView);

  const counts = {
    salesReps: salesReps.length,
    businesses: businesses.length,
    platformUsers: platformUsers.length,
  };

  const total = counts.salesReps + counts.businesses + counts.platformUsers;
  if (total === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          New joiners
        </CardTitle>
        <CardDescription>
          Recent sales reps, SmartRefill workspaces, and platform users.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
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
      </CardHeader>
      <CardContent className="space-y-3">
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
                <Badge
                  className={
                    rep.onboardingComplete ?
                      "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                  }
                >
                  {rep.onboardingComplete ? "Onboarded" : "Setup pending"}
                </Badge>
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
                <Badge>{user.role}</Badge>
              </div>
            ))

        : null}

        {role === "admin" ?
          <p className="text-xs text-[var(--muted-foreground)]">
            To block a user, open{" "}
            <a href="/admin/permissions" className="text-teal-700 underline">
              Admin → Permissions
            </a>{" "}
            and mark their app access as revoked.
          </p>
        : null}
      </CardContent>
    </Card>
  );
}
