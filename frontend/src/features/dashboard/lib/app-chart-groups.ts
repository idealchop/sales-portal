import type { ChartInsightKind } from "@/features/dashboard/lib/build-growth-chart-insights";
import type { DashboardAppId } from "@/features/dashboard/config/dashboard-apps";

/** Product usage, growth, and in-app behavior — SmartRefill only. */
const SMARTREFILL_CHART_KINDS: ChartInsightKind[] = [
  "customer-scale",
  "transaction-volume",
  "login-activity",
  "feature-adoption",
  "usage-goals",
  "device-mix",
  "browser-mix",
  "owner-growth",
  "workspace-growth",
];

/** Revenue, pipeline, and sales-oriented behavior signals — Sales Portal only. */
const SALES_PORTAL_CHART_KINDS: ChartInsightKind[] = [
  "proposal-pipeline",
  "mrr-by-plan",
  "revenue-trend",
  "payment-status",
  "workspace-health",
  "plan-distribution",
  "adoption-gaps",
  "login-sales-cadence",
  "new-logo-pipeline",
];

export const APP_CHART_KINDS: Record<DashboardAppId, ChartInsightKind[]> = {
  platform: [],
  smartrefill: SMARTREFILL_CHART_KINDS,
  "sales-portal": SALES_PORTAL_CHART_KINDS,
};

export function chartKindsForApp(appId: DashboardAppId): ChartInsightKind[] {
  return APP_CHART_KINDS[appId];
}
