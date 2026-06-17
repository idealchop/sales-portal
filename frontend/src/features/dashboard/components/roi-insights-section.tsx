"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { formatPhp } from "@/lib/format";

function buildRoiRecommendations(data: DashboardAnalytics): string[] {
  const tips: string[] = [];
  const { salesInsights, proposalPipeline, personalSales, aiSalesInsights } =
    data;

  if (salesInsights.upgradeOpportunities > 0) {
    tips.push(
      `${salesInsights.upgradeOpportunities} upsell · Starter → paid`,
    );
  }
  if (salesInsights.atRiskWorkspaces > 0) {
    tips.push(
      `${salesInsights.atRiskWorkspaces} at-risk · re-engage`,
    );
  }
  const draftStatus = proposalPipeline.byStatus.find(
    (row) => row.status === "draft",
  );

  if (draftStatus && draftStatus.count > 0) {
    tips.push(
      `${draftStatus.count} drafts · ${formatPhp(draftStatus.value)}`,
    );
  }
  const winRate = personalSales?.winRate ?? proposalPipeline.winRate;
  if (winRate < 35) {
    tips.push(`Win rate ${winRate}% · below 35% target`);
  } else {
    tips.push(`Win rate ${winRate}% · scale templates`);
  }
  const topAi = aiSalesInsights.priorityActions[0]?.recommendedAction;
  if (topAi) {
    tips.push(topAi);
  }
  if (tips.length === 0) {
    tips.push("Stable · focus new workspaces");
  }
  return tips.slice(0, 5);
}

export function RoiInsightsSection({ data }: { data: DashboardAnalytics }) {
  const personal = data.personalSales;
  const pipeline = data.proposalPipeline;
  const recommendations = useMemo(() => buildRoiRecommendations(data), [data]);
  const sentCount =
    pipeline.byStatus.find((row) => row.status === "sent")?.count ?? 0;

  const projectedPipeline =
    personal?.pipelineValue ?? pipeline.pipelineValue;
  const projectedAccepted =
    ((personal?.winRate ?? pipeline.winRate) / 100) * projectedPipeline;

  return (
    <DashboardSection
      id="roi-insights"
      title="ROI"
      action={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/proposals">Proposals</Link>
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-violet-100 bg-gradient-to-br from-violet-50/80 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Projected wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatPhp(Math.round(projectedAccepted))}
            </p>
            <p className="mt-1 text-xs tabular-nums text-[var(--muted-foreground)]">
              {formatPhp(projectedPipeline)} × {personal?.winRate ?? pipeline.winRate}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-gradient-to-br from-teal-50/80 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-teal-700">
              MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatPhp(data.salesInsights.estimatedMrr)}
            </p>
            <p className="mt-1 text-xs tabular-nums text-[var(--muted-foreground)]">
              +{data.salesInsights.newWorkspacesThisMonth} workspaces MTD
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/80 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Accepted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatPhp(personal?.acceptedValue ?? pipeline.acceptedValue)}
            </p>
            <p className="mt-1 text-xs tabular-nums text-[var(--muted-foreground)]">
              {personal?.totalProposals ?? pipeline.totalProposals} proposals · {sentCount} sent
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide">
            Plays · {recommendations.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendations.map((tip, index) => (
            <div
              key={tip}
              className="flex gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
            >
              <Badge className="h-6 shrink-0 bg-zinc-100 text-zinc-700">
                {index + 1}
              </Badge>
              <p className="text-sm tabular-nums text-foreground">{tip}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardSection>
  );
}
