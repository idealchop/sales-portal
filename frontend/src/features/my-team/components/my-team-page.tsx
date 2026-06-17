"use client";

import { AlertCircle, TrendingUp, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSalesTeam } from "@/hooks/use-sales-team";
import { formatPhp } from "@/lib/format";

function coachingCue(member: {
  proposalsCount: number;
  pendingCommissions: number;
  commissionsTotal: number;
}): string | null {
  if (member.proposalsCount === 0) {
    return "No proposals yet — schedule a pipeline review.";
  }
  if (member.pendingCommissions > 0 && member.commissionsTotal === 0) {
    return "Pending commissions with no closed wins — check proposal quality.";
  }
  if (member.proposalsCount >= 3 && member.commissionsTotal === 0) {
    return "Active pipeline but no earnings — focus on closing sent deals.";
  }
  if (member.commissionsTotal > 0 && member.proposalsCount < 2) {
    return "Strong closer — encourage more top-of-funnel activity.";
  }
  return null;
}

export function MyTeamPage() {
  const { members, isLoading, error } = useSalesTeam();

  const teamTotals = members.reduce(
    (acc, member) => ({
      proposals: acc.proposals + member.proposalsCount,
      commissions: acc.commissions + member.commissionsTotal,
      pending: acc.pending + member.pendingCommissions,
    }),
    { proposals: 0, commissions: 0, pending: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Team</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Rep activity, earnings, and coaching cues for your territory.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team proposals</CardDescription>
            <CardTitle>{teamTotals.proposals}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total commissions</CardDescription>
            <CardTitle>{formatPhp(teamTotals.commissions)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending payout</CardDescription>
            <CardTitle>{formatPhp(teamTotals.pending)}</CardTitle>
          </CardHeader>
        </Card>
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
          : members.map((member) => {
              const cue = coachingCue(member);
              const activityScore = Math.min(
                100,
                member.proposalsCount * 20 + (member.commissionsTotal > 0 ? 40 : 0),
              );

              return (
                <div
                  key={member.id}
                  className="rounded-lg border border-[var(--border)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                        <span className="font-medium">{member.proposalsCount}</span>
                      </p>
                      <p>
                        <span className="text-[var(--muted-foreground)]">Earned:</span>{" "}
                        <span className="font-medium">
                          {formatPhp(member.commissionsTotal)}
                        </span>
                      </p>
                      <p>
                        <span className="text-[var(--muted-foreground)]">Pending:</span>{" "}
                        <span className="font-medium">
                          {formatPhp(member.pendingCommissions)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Activity score
                      </span>
                      <span>{activityScore}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-teal-500"
                        style={{ width: `${activityScore}%` }}
                      />
                    </div>
                  </div>

                  {cue ?
                    <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {cue}
                    </p>
                  : null}
                </div>
              );
            })
          }
        </CardContent>
      </Card>
    </div>
  );
}
