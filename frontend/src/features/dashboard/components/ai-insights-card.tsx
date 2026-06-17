"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AiSalesInsights } from "@/lib/dashboard/analytics";

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-zinc-100 text-zinc-700",
} as const;

export function AiInsightsCard({
  insights,
}: {
  insights?: AiSalesInsights | null;
}) {
  const safeInsights = insights ?? {
    revenueChurnRiskSummary: "",
    growthOpportunitySummary: "",
    behavioralReengagementSummary: "",
    priorityActionsSummary: "",
    revenueChurnRisk: [],
    growthOpportunities: [],
    behavioralReengagement: [],
    priorityActions: [],
    aiEnabled: false,
  };
  const actions = safeInsights.priorityActions.slice(0, 5);
  const summary =
    safeInsights.priorityActionsSummary ||
    safeInsights.growthOpportunitySummary ||
    "No AI insights available yet.";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-teal-600" />
            AI sales insights
          </CardTitle>
          <Badge variant="secondary">
            {safeInsights.aiEnabled ? "Gemini" : "Auto-ranked"}
          </Badge>
        </div>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length === 0 ?
          <p className="text-sm text-[var(--muted-foreground)]">
            No priority accounts flagged right now.
          </p>
        : actions.map((action) => (
            <div
              key={`${action.businessName}-${action.recommendedAction}`}
              className="rounded-lg border border-[var(--border)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">
                  {action.businessName}
                </p>
                <Badge className={PRIORITY_STYLES[action.priority]}>
                  {action.priority}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-foreground">
                {action.recommendedAction}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {action.reason}
              </p>
            </div>
          ))
        }
      </CardContent>
    </Card>
  );
}
