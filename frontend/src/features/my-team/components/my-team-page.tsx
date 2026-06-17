"use client";

import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSalesTeam } from "@/hooks/use-sales-team";
import { formatPhp } from "@/lib/format";

export function MyTeamPage() {
  const { members, isLoading, error } = useSalesTeam();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Team</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Performance summary for sales executives in your territory.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team members
          </CardTitle>
          <CardDescription>
            {members.length} rep{members.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ?
            <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
          : error ?
            <p className="text-sm text-red-600">{error}</p>
          : members.length === 0 ?
            <p className="text-sm text-[var(--muted-foreground)]">
              No team members found for your scope.
            </p>
          : members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {member.displayName}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {member.email || member.team || "Sales executive"}
                  </p>
                </div>
                <div className="grid gap-1 text-right text-sm">
                  <p>
                    <span className="text-[var(--muted-foreground)]">Proposals:</span>{" "}
                    <span className="font-medium text-foreground">
                      {member.proposalsCount}
                    </span>
                  </p>
                  <p>
                    <span className="text-[var(--muted-foreground)]">Commissions:</span>{" "}
                    <span className="font-medium text-foreground">
                      {formatPhp(member.commissionsTotal)}
                    </span>
                  </p>
                  <p>
                    <span className="text-[var(--muted-foreground)]">Pending:</span>{" "}
                    <span className="font-medium text-foreground">
                      {formatPhp(member.pendingCommissions)}
                    </span>
                  </p>
                </div>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
