"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AiSalesAccountInsight, AiSalesInsights } from "@/lib/dashboard/analytics";

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-zinc-100 text-zinc-700",
} as const;

type InsightTab = "priority" | "churn" | "growth" | "reengage";

const TAB_CONFIG: Array<{
  id: InsightTab;
  label: string;
  summaryKey: keyof AiSalesInsights;
  listKey: keyof AiSalesInsights;
}> = [
  {
    id: "priority",
    label: "Priority calls",
    summaryKey: "priorityActionsSummary",
    listKey: "priorityActions",
  },
  {
    id: "churn",
    label: "Churn risk",
    summaryKey: "revenueChurnRiskSummary",
    listKey: "revenueChurnRisk",
  },
  {
    id: "growth",
    label: "Growth",
    summaryKey: "growthOpportunitySummary",
    listKey: "growthOpportunities",
  },
  {
    id: "reengage",
    label: "Re-engage",
    summaryKey: "behavioralReengagementSummary",
    listKey: "behavioralReengagement",
  },
];

function InsightList({ items }: { items: AiSalesAccountInsight[] }) {
  const visible = items.slice(0, 6);
  if (visible.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        No accounts in this category right now.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((action) => (
        <div
          key={`${action.businessName}-${action.recommendedAction}`}
          className="rounded-lg border border-[var(--border)] p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">{action.businessName}</p>
            <Badge className={PRIORITY_STYLES[action.priority]}>
              {action.priority}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-foreground">{action.recommendedAction}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {action.reason}
          </p>
        </div>
      ))}
    </div>
  );
}

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

  const [tab, setTab] = useState<InsightTab>("priority");
  const active = TAB_CONFIG.find((item) => item.id === tab) ?? TAB_CONFIG[0];
  const summary = String(safeInsights[active.summaryKey] || "").trim();
  const list = safeInsights[active.listKey];
  const items = Array.isArray(list) ? list : [];

  const totalAccounts =
    safeInsights.priorityActions.length +
    safeInsights.revenueChurnRisk.length +
    safeInsights.growthOpportunities.length +
    safeInsights.behavioralReengagement.length;

  if (totalAccounts === 0 && !summary) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
            <Sparkles className="h-4 w-4 text-teal-600" />
            AI · {totalAccounts}
          </CardTitle>
          <Badge className="bg-zinc-100 text-zinc-700">
            {safeInsights.aiEnabled ? "Gemini" : "Rules"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {TAB_CONFIG.map((item) => {
            const count = Array.isArray(safeInsights[item.listKey]) ?
              (safeInsights[item.listKey] as AiSalesAccountInsight[]).length
            : 0;
            return (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={tab === item.id ? "primary" : "outline"}
                onClick={() => setTab(item.id)}
              >
                {item.label} ({count})
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <InsightList items={items} />
      </CardContent>
    </Card>
  );
}
