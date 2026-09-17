import type { ChartInsightKind } from "@/features/dashboard/lib/build-growth-chart-insights";
import type { DashboardAppId } from "@/features/dashboard/config/dashboard-apps";

/** Product usage, growth, and in-app behavior — SmartRefill only. */
const SMARTREFILL_CHART_KINDS: ChartInsightKind[] = [
  "customer-scale",
  "acquisition-growth",
  "login-activity",
  "transaction-volume",
  "feature-adoption",
  "mrr-by-plan",
];

/** Revenue, pipeline, market mix, and sales reports — Sales Portal only. */
const SALES_PORTAL_CHART_KINDS: ChartInsightKind[] = [
  "mrr-by-plan",
  "revenue-trend",
  "proposal-pipeline",
  "workspace-health",
  "payment-status",
  "new-logo-pipeline",
  "adoption-gaps",
  "login-sales-cadence",
];

export const APP_CHART_KINDS: Record<DashboardAppId, ChartInsightKind[]> = {
  platform: [],
  smartrefill: SMARTREFILL_CHART_KINDS,
  "smartrefill-old": [],
  "sales-portal": SALES_PORTAL_CHART_KINDS,
};

export function chartKindsForApp(appId: DashboardAppId): ChartInsightKind[] {
  return APP_CHART_KINDS[appId];
}
