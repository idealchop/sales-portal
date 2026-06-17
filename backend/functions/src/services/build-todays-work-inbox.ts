import type { AiSalesInsightsResult } from "./generate-ai-sales-insights";
import type { SalesAction } from "./compute-sales-insights";
import type { PersonalSalesSummary } from "./build-personal-sales-summary";

export type TodaysWorkItem = {
  id: string;
  source: "sales_action" | "ai_insight" | "approval" | "proposal";
  priority: "high" | "medium" | "low";
  title: string;
  subtitle: string;
  email?: string;
  href?: string;
};

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function dedupeKey(title: string, subtitle: string): string {
  return `${title.toLowerCase()}::${subtitle.toLowerCase()}`;
}

export function buildTodaysWorkInbox(input: {
  salesActions: SalesAction[];
  aiSalesInsights: AiSalesInsightsResult;
  personalSales: PersonalSalesSummary;
  pendingApprovalCount: number;
}): TodaysWorkItem[] {
  const seen = new Set<string>();
  const items: TodaysWorkItem[] = [];

  function push(item: TodaysWorkItem) {
    const key = dedupeKey(item.title, item.subtitle);
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  }

  for (const action of input.salesActions) {
    push({
      id: `action-${action.id}`,
      source: "sales_action",
      priority: action.priority,
      title: action.businessName,
      subtitle: action.headline,
      email: action.ownerEmail,
    });
  }

  for (const insight of input.aiSalesInsights.priorityActions) {
    push({
      id: `ai-${insight.businessName}-${insight.recommendedAction}`,
      source: "ai_insight",
      priority: insight.priority,
      title: insight.businessName,
      subtitle: insight.recommendedAction,
    });
  }

  if (input.pendingApprovalCount > 0) {
    push({
      id: "approvals-pending",
      source: "approval",
      priority: "high",
      title: "Subscription approvals",
      subtitle: `${input.pendingApprovalCount} payment${input.pendingApprovalCount === 1 ? "" : "s"} need review`,
      href: "/dashboard#subscription-approvals",
    });
  }

  if (input.personalSales.draftsNeedingAction > 0) {
    push({
      id: "proposal-drafts",
      source: "proposal",
      priority: "medium",
      title: "Finish draft proposals",
      subtitle: `${input.personalSales.draftsNeedingAction} draft${input.personalSales.draftsNeedingAction === 1 ? "" : "s"} ready to send`,
      href: "/dashboard/proposals",
    });
  }

  if (input.personalSales.sentAwaitingResponse > 0) {
    push({
      id: "proposal-sent",
      source: "proposal",
      priority: "medium",
      title: "Follow up on sent proposals",
      subtitle: `${input.personalSales.sentAwaitingResponse} awaiting client response`,
      href: "/dashboard/proposals",
    });
  }

  return items
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    .slice(0, 16);
}
