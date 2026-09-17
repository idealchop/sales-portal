import type {
  BreakdownGroup,
  BreakdownRow,
  ChartBusinessContext,
  ChartTimeSeries,
  DashboardAnalytics,
} from "@/lib/dashboard/analytics";
import type { DateRange } from "@/features/dashboard/lib/date-range";
import { formatDateRangeLabel } from "@/features/dashboard/lib/date-range";
import {
  aggregateDailyCounts,
  aggregateLoginDaily,
  aggregateTransactionDaily,
  aggregateUsageDaily,
  buildDailyBreakdownRows,
  buildLoginBreakdownRows,
  buildTransactionBreakdownRows,
  filterBusinessesInRange,
  sumDailyCounts,
  sumTransactionsInRange,
} from "@/features/dashboard/lib/filter-chart-series";
import { formatPhp } from "@/lib/format";
import {
  computeStarterPotentialLost,
  STARTER_POTENTIAL_COLOR,
} from "@/features/dashboard/lib/compute-starter-potential-lost";
import { withWorkspaceNames } from "@/features/dashboard/lib/with-workspace-names";
import { businessesForMrrInsights } from "@/features/dashboard/lib/with-latest-live-plans";

const FEATURE_LABELS: Record<string, string> = {
  addCustomer: "Add customer",
  addInventory: "Add inventory",
  addDelivery: "Add delivery",
  addWalkin: "Add walk-in",
  addExpense: "Add expense",
  addCollection: "Add collection",
  useAi: "Use AI",
  addPaymentAccount: "Add payment account",
  verifyEmail: "Verify email",
};

const GETTING_STARTED_FEATURES = [
  "addCustomer",
  "addInventory",
  "addDelivery",
  "addWalkin",
  "addExpense",
  "addCollection",
  "useAi",
  "addPaymentAccount",
  "verifyEmail",
] as const;

export type ChartInsightKind =
  | "acquisition-growth"
  | "owner-growth"
  | "workspace-growth"
  | "login-activity"
  | "transaction-volume"
  | "mrr-by-plan"
  | "feature-adoption"
  | "workspace-health"
  | "payment-status"
  | "device-mix"
  | "browser-mix"
  | "usage-goals"
  | "proposal-pipeline"
  | "customer-scale"
  | "plan-distribution"
  | "adoption-gaps"
  | "revenue-trend"
  | "login-sales-cadence"
  | "new-logo-pipeline";

export type ChartInsight = {
  id: string;
  title: string;
  subtitle: string;
  kind: ChartInsightKind;
  breakdown: BreakdownRow[];
  breakdownGroups?: BreakdownGroup[];
  chartData: unknown;
  seriesKey?: keyof ChartTimeSeries;
};

function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] || feature.replace(/([A-Z])/g, " $1").trim();
}

/** Merge owner signup + workspace daily series onto shared date/month axis. */
export function mergeOwnerWorkspaceSeries(
  owners: { month?: string; date?: string; count: number }[],
  workspaces: { month?: string; date?: string; count: number }[],
): { month?: string; date?: string; owners: number; workspaces: number }[] {
  const useMonth = Boolean(owners[0]?.month || workspaces[0]?.month);
  const map = new Map<string, { owners: number; workspaces: number }>();
  const order: string[] = [];

  function bump(key: string, field: "owners" | "workspaces", count: number) {
    if (!map.has(key)) {
      map.set(key, { owners: 0, workspaces: 0 });
      order.push(key);
    }
    map.get(key)![field] += count;
  }

  for (const row of owners) {
    const key = useMonth ? String(row.month || "") : String(row.date || "");
    if (!key) continue;
    bump(key, "owners", row.count);
  }
  for (const row of workspaces) {
    const key = useMonth ? String(row.month || "") : String(row.date || "");
    if (!key) continue;
    bump(key, "workspaces", row.count);
  }

  return order
    .map((key) => {
      const vals = map.get(key)!;
      return useMonth ?
          { month: key, owners: vals.owners, workspaces: vals.workspaces }
        : { date: key, owners: vals.owners, workspaces: vals.workspaces };
    })
    .sort((a, b) =>
      String(a.month || a.date || "").localeCompare(
        String(b.month || b.date || ""),
      ),
    );
}

function healthLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function computeFeatureAdoption(
  businesses: ChartBusinessContext[],
): { feature: string; rate: number; completed: number; total: number }[] {
  const totals = new Map<string, { completed: number; total: number }>();
  GETTING_STARTED_FEATURES.forEach((feature) => {
    totals.set(feature, { completed: 0, total: 0 });
  });

  businesses.forEach((biz) => {
    GETTING_STARTED_FEATURES.forEach((feature) => {
      const bucket = totals.get(feature)!;
      bucket.total += 1;
      if (biz.gettingStarted[feature]) bucket.completed += 1;
    });
  });

  return GETTING_STARTED_FEATURES.map((feature) => {
    const bucket = totals.get(feature)!;
    const rate =
      bucket.total > 0 ?
        Math.round((bucket.completed / bucket.total) * 100)
      : 0;
    return { feature, rate, completed: bucket.completed, total: bucket.total };
  }).sort((a, b) => b.rate - a.rate);
}

function isPayingPlanForMrr(biz: ChartBusinessContext): boolean {
  if (Number(biz.price) <= 0) return false;
  if (String(biz.subscriptionStatus || "active").toLowerCase() !== "active") {
    return false;
  }
  const key = `${biz.planCode || ""} ${biz.planName || ""}`.trim().toLowerCase();
  if (key.includes("starter") || key.includes("trial")) return false;
  if (String(biz.billingCycle || "").toLowerCase() === "trial") return false;
  return true;
}

function computeMrrByPlan(businesses: ChartBusinessContext[]) {
  const map = new Map<string, { mrr: number; workspaces: number }>();
  businesses.forEach((biz) => {
    if (!biz.planName || !isPayingPlanForMrr(biz)) return;
    const bucket = map.get(biz.planName) || { mrr: 0, workspaces: 0 };
    bucket.mrr += biz.price;
    bucket.workspaces += 1;
    map.set(biz.planName, bucket);
  });
  return [...map.entries()]
    .map(([plan, value]) => ({ plan, ...value }))
    .sort((a, b) => b.mrr - a.mrr);
}

/** Paying workspaces grouped by plan name for MRR breakdown lists. */
export function listPayingWorkspacesByPlan(
  businesses: ChartBusinessContext[],
): Array<{
  plan: string;
  mrr: number;
  workspaces: Array<{
    id: string;
    label: string;
    ownerEmail?: string;
    price: number;
    customers: number;
    transactionsLast30Days: number;
  }>;
}> {
  const map = new Map<
    string,
    {
      mrr: number;
      workspaces: Array<{
        id: string;
        label: string;
        ownerEmail?: string;
        price: number;
        customers: number;
        transactionsLast30Days: number;
      }>;
    }
  >();

  for (const biz of businesses) {
    if (!biz.planName || !isPayingPlanForMrr(biz)) continue;
    const bucket = map.get(biz.planName) || { mrr: 0, workspaces: [] };
    bucket.mrr += biz.price;
    bucket.workspaces.push({
      id: biz.id,
      label:
        biz.name?.trim() ||
        (biz.id ? `Workspace ${biz.id.slice(0, 8)}` : biz.planName),
      ownerEmail: biz.ownerEmail?.trim() || undefined,
      price: biz.price,
      customers: biz.customers,
      transactionsLast30Days: biz.transactionsLast30Days,
    });
    map.set(biz.planName, bucket);
  }

  return [...map.entries()]
    .map(([plan, value]) => ({
      plan,
      mrr: value.mrr,
      workspaces: value.workspaces.sort((a, b) => b.price - a.price),
    }))
    .sort((a, b) => b.mrr - a.mrr);
}

const TRIAL_SLICE_COLOR = "#EA580C";

function isTrialBusiness(biz: ChartBusinessContext): boolean {
  const cycle = String(biz.billingCycle || "").toLowerCase();
  const plan = String(biz.planName || "").toLowerCase();
  return cycle === "trial" || plan.includes("trial");
}

function planMixLabel(biz: ChartBusinessContext): string | null {
  const name = biz.planName?.trim();
  if (!name) return null;
  if (isTrialBusiness(biz) && !name.toLowerCase().includes("trial")) {
    return `${name} · Trial`;
  }
  return name;
}

/** Plan mix with trial plans labeled and colored separately. */
export function computePlanMixWithTrials(
  businesses: ChartBusinessContext[],
): { name: string; count: number; color?: string }[] {
  const map = new Map<string, { count: number; isTrial: boolean }>();
  for (const biz of businesses) {
    if (String(biz.subscriptionStatus || "").toLowerCase() !== "active") {
      continue;
    }
    const label = planMixLabel(biz);
    if (!label) continue;
    const isTrial = isTrialBusiness(biz);
    const prev = map.get(label) || { count: 0, isTrial };
    prev.count += 1;
    prev.isTrial = prev.isTrial || isTrial;
    map.set(label, prev);
  }
  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      count: value.count,
      color: value.isTrial ? TRIAL_SLICE_COLOR : undefined,
    }))
    .sort((a, b) => {
      if (Boolean(a.color) !== Boolean(b.color)) return a.color ? -1 : 1;
      return b.count - a.count;
    });
}

function buildMrrChartPayload(businesses: ChartBusinessContext[]) {
  const paying = businesses.filter(isPayingPlanForMrr);
  const mrrByPlan = computeMrrByPlan(paying);
  const starterPotential = computeStarterPotentialLost(businesses);
  const actualMrr = mrrByPlan.reduce((sum, row) => sum + row.mrr, 0);

  const chartData: Array<{
    name: string;
    mrr: number;
    count: number;
    color?: string;
    isPotential?: boolean;
  }> = mrrByPlan.map((row) => ({
    name: row.plan,
    mrr: row.mrr,
    count: row.workspaces,
  }));

  if (starterPotential.total > 0) {
    chartData.push({
      name: `If Starters → ${starterPotential.targetPlanLabel}`,
      mrr: starterPotential.total,
      count: starterPotential.workspaceCount,
      color: STARTER_POTENTIAL_COLOR,
      isPotential: true,
    });
  }

  const subtitleParts = [
    `${formatPhp(actualMrr)} MRR`,
    starterPotential.total > 0 ?
      `~${formatPhp(starterPotential.total)} if Starters upgrade`
    : null,
    `${businesses.length} workspaces`,
  ].filter(Boolean);

  return {
    mrrByPlan,
    starterPotential,
    chartData,
    subtitleParts,
  };
}

function buildMrrBreakdown(
  businesses: ChartBusinessContext[],
  rangeLabel: string,
) {
  const payingBusinesses = businesses.filter(isPayingPlanForMrr);
  const { mrrByPlan, starterPotential } = buildMrrChartPayload(businesses);
  const payingByPlan = listPayingWorkspacesByPlan(payingBusinesses);
  const targetLabel = starterPotential.targetPlanLabel;
  const targetPriceLabel = formatPhp(starterPotential.targetPrice);

  const groups: BreakdownGroup[] = payingByPlan.map((planGroup) => ({
    title: `${planGroup.plan} · ${formatPhp(planGroup.mrr)}/mo · ${rangeLabel}`,
    rows: [
      {
        label: `${planGroup.workspaces.length} paying workspace${planGroup.workspaces.length === 1 ? "" : "s"}`,
        value: `${formatPhp(planGroup.mrr)}/mo`,
        detail: "Listed below — each line is one station",
      },
      ...planGroup.workspaces.map((ws) => ({
        label: ws.label,
        value: `${formatPhp(ws.price)}/mo`,
        detail: [
          ws.ownerEmail,
          `${ws.customers} customers · ${ws.transactionsLast30Days} tx / 30d`,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    ],
  }));

  if (groups.length === 0) {
    groups.push({
      title: `What you earn now · ${rangeLabel}`,
      rows: [
        {
          label: "No paying workspaces",
          value: formatPhp(0),
          detail: "No active paid subscriptions in this period",
        },
      ],
    });
  }

  if (starterPotential.total > 0) {
    groups.push({
      title: `If Starters upgraded to ${targetLabel} (${targetPriceLabel}/mo)`,
      rows: [
        {
          label: "Extra MRR if all listed Starters upgraded",
          value: `~${formatPhp(starterPotential.total)}/mo`,
          detail: `${starterPotential.workspaceCount} Starter workspaces × ${targetLabel} list price ${targetPriceLabel}/mo`,
        },
        {
          label: "Ready to pitch now",
          value: `${starterPotential.upsellCount} of ${starterPotential.workspaceCount}`,
          detail: "20+ customers or 30+ transactions in the last 30 days",
        },
        ...starterPotential.rows.slice(0, 10).map((row) => ({
          label: row.label,
          value: `~${formatPhp(row.potentialLost)}/mo`,
          detail: [
            row.ownerEmail,
            `Pays ${formatPhp(row.currentMrr)}/mo now → ${targetLabel} ${targetPriceLabel}/mo`,
            `${row.customers} customers · ${row.transactionsLast30Days} tx / 30d`,
            row.isUpsellReady ? "Pitch-ready" : null,
          ]
            .filter(Boolean)
            .join(" · "),
        })),
      ],
    });
  }

  return {
    breakdown: [
      ...mrrByPlan.map((row) => ({
        label: row.plan,
        value: `${formatPhp(row.mrr)}/mo`,
        detail: `${row.workspaces} workspaces`,
      })),
      ...(starterPotential.total > 0 ?
        [{
          label: `If Starters → ${targetLabel}`,
          value: `~${formatPhp(starterPotential.total)}/mo`,
          detail: `${starterPotential.workspaceCount} Starters vs ${targetLabel} ${targetPriceLabel}/mo`,
        }]
      : []),
    ],
    breakdownGroups: groups,
  };
}

function computePaymentBreakdown(businesses: ChartBusinessContext[]) {
  const map = new Map<string, number>();
  businesses.forEach((biz) => {
    const status = biz.paymentStatus || "unknown";
    map.set(status, (map.get(status) || 0) + 1);
  });
  return [...map.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

function computeHealthBreakdown(businesses: ChartBusinessContext[]) {
  const map = new Map<string, number>([
    ["high", 0],
    ["medium", 0],
    ["low", 0],
  ]);
  businesses.forEach((biz) => {
    map.set(biz.healthTier, (map.get(biz.healthTier) || 0) + 1);
  });
  return [...map.entries()].map(([tier, count]) => ({ tier, count }));
}

function computeUsageGoals(businesses: ChartBusinessContext[]) {
  const map = new Map<string, number>();
  businesses.forEach((biz) => {
    biz.usageGoals.forEach((goal) => {
      map.set(goal, (map.get(goal) || 0) + 1);
    });
  });
  return [...map.entries()]
    .map(([goal, count]) => ({ goal, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildChartBreakdown(
  insight: ChartInsight,
  data: DashboardAnalytics,
  range: DateRange,
): { breakdown: BreakdownRow[]; breakdownGroups?: BreakdownGroup[] } {
  const { chartTimeSeries, chartBusinessContext } = data;
  const businesses = businessesForMrrInsights(
    data,
    withWorkspaceNames(
      filterBusinessesInRange(chartBusinessContext, range),
      data,
    ),
  );
  const rangeLabel = formatDateRangeLabel(range);

  switch (insight.kind) {
    case "acquisition-growth":
      return {
        breakdown: [
          ...buildDailyBreakdownRows(
            chartTimeSeries.ownerSignupsDaily,
            range,
            "New owners",
          ),
          ...buildDailyBreakdownRows(
            chartTimeSeries.workspacesDaily,
            range,
            "New workspaces",
          ),
        ],
        breakdownGroups: [
          {
            title: `Owner signups · ${rangeLabel}`,
            rows: buildDailyBreakdownRows(
              chartTimeSeries.ownerSignupsDaily,
              range,
            ),
          },
          {
            title: `New workspaces · ${rangeLabel}`,
            rows: buildDailyBreakdownRows(
              chartTimeSeries.workspacesDaily,
              range,
            ),
          },
        ],
      };
    case "owner-growth":
      return {
        breakdown: buildDailyBreakdownRows(
          chartTimeSeries.ownerSignupsDaily,
          range,
          "New owners",
        ),
        breakdownGroups: [
          {
            title: `Daily signups · ${rangeLabel}`,
            rows: buildDailyBreakdownRows(
              chartTimeSeries.ownerSignupsDaily,
              range,
            ),
          },
        ],
      };
    case "workspace-growth":
      return {
        breakdown: buildDailyBreakdownRows(
          chartTimeSeries.workspacesDaily,
          range,
          "New workspaces",
        ),
        breakdownGroups: [
          {
            title: `Daily workspaces · ${rangeLabel}`,
            rows: buildDailyBreakdownRows(
              chartTimeSeries.workspacesDaily,
              range,
            ),
          },
        ],
      };
    case "login-activity":
      return {
        breakdown: buildLoginBreakdownRows(chartTimeSeries.loginDaily, range),
        breakdownGroups: [
          {
            title: `Top days · ${rangeLabel}`,
            rows: buildLoginBreakdownRows(chartTimeSeries.loginDaily, range),
          },
          {
            title: "Device mix",
            rows: aggregateUsageDaily(
              chartTimeSeries.deviceSessionsDaily,
              range,
            ).map((row) => ({
              label: row.name,
              value: `${row.sessions}`,
            })),
          },
        ],
      };
    case "transaction-volume":
      return {
        breakdown: buildTransactionBreakdownRows(
          chartTimeSeries.transactionsDaily,
          range,
          formatPhp,
        ),
        breakdownGroups: [
          {
            title: `Daily volume · ${rangeLabel}`,
            rows: buildTransactionBreakdownRows(
              chartTimeSeries.transactionsDaily,
              range,
              formatPhp,
            ),
          },
        ],
      };
    case "device-mix":
      return {
        breakdown: aggregateUsageDaily(
          chartTimeSeries.deviceSessionsDaily,
          range,
        ).map((row) => ({
          label: row.name,
          value: `${row.sessions} sessions`,
        })),
      };
    case "browser-mix":
      return {
        breakdown: aggregateUsageDaily(
          chartTimeSeries.browserSessionsDaily,
          range,
        ).map((row) => ({
          label: row.name,
          value: `${row.sessions} sessions`,
        })),
      };
    case "mrr-by-plan":
      return buildMrrBreakdown(businesses, rangeLabel);
    case "feature-adoption": {
      const features = computeFeatureAdoption(businesses);
      return {
        breakdown: features.map((row) => ({
          label: featureLabel(row.feature),
          value: `${row.rate}%`,
          detail: `${row.completed}/${row.total}`,
        })),
      };
    }
    case "workspace-health": {
      const health = computeHealthBreakdown(businesses);
      return {
        breakdown: health.map((row) => ({
          label: healthLabel(row.tier),
          value: `${row.count}`,
        })),
      };
    }
    case "payment-status": {
      const payments = computePaymentBreakdown(businesses);
      return {
        breakdown: payments.map((row) => ({
          label: row.status.replaceAll("_", " "),
          value: `${row.count}`,
        })),
      };
    }
    case "usage-goals": {
      const goals = computeUsageGoals(businesses);
      return {
        breakdown: goals.map((row) => ({
          label: row.goal,
          value: `${row.count}`,
        })),
      };
    }
    case "proposal-pipeline":
      return {
        breakdown: data.proposalPipeline.byStatus.map((row) => ({
          label: row.status,
          value: formatPhp(row.value),
          detail: `${row.count} proposals`,
        })),
      };
    case "customer-scale":
      return {
        breakdown: data.topBusinessesByCustomers.map((row) => ({
          label: row.name,
          value: row.customers.toLocaleString(),
        })),
      };
    case "plan-distribution":
      return {
        breakdown: computePlanMixWithTrials(businesses).map((row) => ({
          label: row.name,
          value: `${row.count}`,
          detail: row.color ? "Free trial" : undefined,
        })),
      };
    case "adoption-gaps": {
      const gaps = computeFeatureAdoption(businesses)
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 10);
      return {
        breakdown: gaps.map((row) => ({
          label: featureLabel(row.feature),
          value: `${row.rate}%`,
          detail: `${row.completed}/${row.total} · upsell signal`,
        })),
      };
    }
    case "revenue-trend":
      return {
        breakdown: buildTransactionBreakdownRows(
          chartTimeSeries.transactionsDaily,
          range,
          formatPhp,
        ),
      };
    case "login-sales-cadence":
      return {
        breakdown: buildLoginBreakdownRows(chartTimeSeries.loginDaily, range),
      };
    case "new-logo-pipeline":
      return {
        breakdown: buildDailyBreakdownRows(
          chartTimeSeries.workspacesDaily,
          range,
          "New workspaces",
        ),
      };
    default:
      return { breakdown: insight.breakdown, breakdownGroups: insight.breakdownGroups };
  }
}

export function buildGrowthChartInsights(
  data: DashboardAnalytics,
  globalRange: DateRange,
): ChartInsight[] {
  const { summary, chartTimeSeries, chartBusinessContext } =
    data;
  const rangeLabel = formatDateRangeLabel(globalRange);
  const businesses = businessesForMrrInsights(
    data,
    withWorkspaceNames(
      filterBusinessesInRange(chartBusinessContext, globalRange),
      data,
    ),
  );

  const ownerTotal = sumDailyCounts(
    chartTimeSeries.ownerSignupsDaily,
    globalRange,
  );
  const workspaceTotal = sumDailyCounts(
    chartTimeSeries.workspacesDaily,
    globalRange,
  );
  const loginFiltered = aggregateLoginDaily(
    chartTimeSeries.loginDaily,
    globalRange,
  );
  const loginSessions = loginFiltered.reduce((sum, row) => sum + row.sessions, 0);
  const loginUsers = loginFiltered.reduce(
    (sum, row) => sum + row.uniqueUsers,
    0,
  );
  const txTotals = sumTransactionsInRange(
    chartTimeSeries.transactionsDaily,
    globalRange,
  );
  const mrrBreakdown = buildMrrBreakdown(businesses, rangeLabel);
  const mrrPayload = buildMrrChartPayload(businesses);
  const features = computeFeatureAdoption(businesses);
  const topFeature = features[0];
  const health = computeHealthBreakdown(businesses);
  const payments = computePaymentBreakdown(businesses);
  const usageGoals = computeUsageGoals(businesses);
  const deviceMix = aggregateUsageDaily(
    chartTimeSeries.deviceSessionsDaily,
    globalRange,
  );
  const browserMix = aggregateUsageDaily(
    chartTimeSeries.browserSessionsDaily,
    globalRange,
  );
  const customerScale = data.topBusinessesByCustomers.slice(0, 10);
  const customerTotal = customerScale.reduce((sum, row) => sum + row.customers, 0);
  const adoptionGaps = [...features].sort((a, b) => a.rate - b.rate).slice(0, 8);
  const lowestGap = adoptionGaps[0];
  const planMix = computePlanMixWithTrials(businesses);
  const revenueSeries = aggregateTransactionDaily(
    chartTimeSeries.transactionsDaily,
    globalRange,
  ).map((row) => ({
    date: "date" in row ? row.date : row.month,
    amount: row.amount,
  }));
  const revenueTotal = revenueSeries.reduce((sum, row) => sum + row.amount, 0);

  return [
    {
      id: "customer-scale",
      title: "Customer scale",
      subtitle: `${summary.totalCustomers.toLocaleString()} total · top ${customerScale.length} ws · ${rangeLabel}`,
      kind: "customer-scale",
      chartData: customerScale.map((row) => ({
        name: row.name,
        customers: row.customers,
      })),
      breakdown: customerScale.map((row) => ({
        label: row.name,
        value: row.customers.toLocaleString(),
        detail:
          customerTotal > 0 ?
            `${Math.round((row.customers / customerTotal) * 100)}% of top volume`
          : undefined,
      })),
    },
    {
      id: "acquisition-growth",
      title: "Owner acquisition & workspace expansion",
      subtitle: `${ownerTotal} new owners · ${workspaceTotal} new workspaces · ${rangeLabel}`,
      kind: "acquisition-growth",
      chartData: mergeOwnerWorkspaceSeries(
        aggregateDailyCounts(
          chartTimeSeries.ownerSignupsDaily,
          globalRange,
        ),
        aggregateDailyCounts(chartTimeSeries.workspacesDaily, globalRange),
      ),
      breakdown: [
        ...buildDailyBreakdownRows(
          chartTimeSeries.ownerSignupsDaily,
          globalRange,
          "New owners",
        ),
        ...buildDailyBreakdownRows(
          chartTimeSeries.workspacesDaily,
          globalRange,
          "New workspaces",
        ),
      ],
    },
    {
      id: "login-activity",
      title: "Daily active usage",
      subtitle: `${loginSessions.toLocaleString()} sessions · ${loginUsers} user-days · ${rangeLabel}`,
      kind: "login-activity",
      seriesKey: "loginDaily",
      chartData: loginFiltered,
      breakdown: buildLoginBreakdownRows(
        chartTimeSeries.loginDaily,
        globalRange,
      ),
    },
    {
      id: "transaction-volume",
      title: "Station throughput",
      subtitle: `${txTotals.count.toLocaleString()} tx · ${formatPhp(txTotals.amount)} GMV · ${rangeLabel}`,
      kind: "transaction-volume",
      seriesKey: "transactionsDaily",
      chartData: aggregateTransactionDaily(
        chartTimeSeries.transactionsDaily,
        globalRange,
      ),
      breakdown: buildTransactionBreakdownRows(
        chartTimeSeries.transactionsDaily,
        globalRange,
        formatPhp,
      ),
    },
    {
      id: "mrr-by-plan",
      title: "Subscription MRR by plan",
      subtitle: `${mrrPayload.subtitleParts.join(" · ")} · ${rangeLabel}`,
      kind: "mrr-by-plan",
      chartData: mrrPayload.chartData,
      breakdown: mrrBreakdown.breakdown,
      breakdownGroups: mrrBreakdown.breakdownGroups,
    },
    {
      id: "feature-adoption",
      title: "In-app feature usage",
      subtitle: topFeature ?
        `${featureLabel(topFeature.feature)} ${topFeature.rate}% · ${rangeLabel}`
      : `Getting-started checklist · ${rangeLabel}`,
      kind: "feature-adoption",
      chartData: features.map((row) => ({
        feature: featureLabel(row.feature),
        rate: row.rate,
      })),
      breakdown: features.map((row) => ({
        label: featureLabel(row.feature),
        value: `${row.rate}%`,
        detail: `${row.completed}/${row.total}`,
      })),
    },
    {
      id: "workspace-health",
      title: "Revenue at risk",
      subtitle: `${health.reduce((s, r) => s + r.count, 0)} workspaces · ${rangeLabel}`,
      kind: "workspace-health",
      chartData: health.map((row) => ({
        name: healthLabel(row.tier),
        count: row.count,
      })),
      breakdown: health.map((row) => ({
        label: healthLabel(row.tier),
        value: `${row.count}`,
      })),
    },
    {
      id: "payment-status",
      title: "Payment recovery",
      subtitle: `${payments.reduce((s, r) => s + r.count, 0)} subscriptions · ${rangeLabel}`,
      kind: "payment-status",
      chartData: payments.map((row) => ({
        name: row.status.replaceAll("_", " "),
        count: row.count,
      })),
      breakdown: payments.map((row) => ({
        label: row.status.replaceAll("_", " "),
        value: `${row.count}`,
      })),
    },
    {
      id: "device-mix",
      title: "Device mix",
      subtitle: `${deviceMix[0]?.name ?? summary.topDevice} leads · ${rangeLabel}`,
      kind: "device-mix",
      seriesKey: "deviceSessionsDaily",
      chartData: deviceMix,
      breakdown: deviceMix.map((row) => ({
        label: row.name,
        value: `${row.sessions} sessions`,
      })),
    },
    {
      id: "browser-mix",
      title: "Browser mix",
      subtitle: `${browserMix[0]?.name ?? summary.topBrowser} leads · ${rangeLabel}`,
      kind: "browser-mix",
      seriesKey: "browserSessionsDaily",
      chartData: browserMix,
      breakdown: browserMix.map((row) => ({
        label: row.name,
        value: `${row.sessions} sessions`,
      })),
    },
    {
      id: "usage-goals",
      title: "Owner usage intent",
      subtitle: `${usageGoals.length} goals tracked · ${rangeLabel}`,
      kind: "usage-goals",
      chartData: usageGoals.slice(0, 8),
      breakdown: usageGoals.map((row) => ({
        label: row.goal,
        value: `${row.count}`,
      })),
    },
    {
      id: "proposal-pipeline",
      title: "Proposal pipeline",
      subtitle: `${formatPhp(data.proposalPipeline.pipelineValue)} open · ${data.proposalPipeline.totalProposals} proposals`,
      kind: "proposal-pipeline",
      chartData: data.proposalPipeline.byStatus.map((row) => ({
        status: row.status,
        count: row.count,
        value: row.value,
      })),
      breakdown: data.proposalPipeline.byStatus.map((row) => ({
        label: row.status,
        value: formatPhp(row.value),
        detail: `${row.count} proposals`,
      })),
    },
    {
      id: "plan-distribution",
      title: "Subscriptions by plan",
      subtitle: `${planMix.reduce((s, r) => s + r.count, 0)} workspaces · ${rangeLabel}`,
      kind: "plan-distribution",
      chartData: planMix,
      breakdown: planMix.map((row) => ({
        label: row.name,
        value: `${row.count}`,
        detail: row.color ? "Free trial" : undefined,
      })),
    },
    {
      id: "adoption-gaps",
      title: "Adoption gaps (upsell)",
      subtitle: lowestGap ?
        `${featureLabel(lowestGap.feature)} ${lowestGap.rate}% lowest · ${rangeLabel}`
      : `Feature gaps · ${rangeLabel}`,
      kind: "adoption-gaps",
      chartData: adoptionGaps.map((row) => ({
        feature: featureLabel(row.feature),
        rate: row.rate,
      })),
      breakdown: adoptionGaps.map((row) => ({
        label: featureLabel(row.feature),
        value: `${row.rate}%`,
        detail: `${row.completed}/${row.total} completed`,
      })),
    },
    {
      id: "revenue-trend",
      title: "Station GMV trend",
      subtitle: `${formatPhp(revenueTotal)} in period · ${rangeLabel}`,
      kind: "revenue-trend",
      chartData: revenueSeries,
      breakdown: buildTransactionBreakdownRows(
        chartTimeSeries.transactionsDaily,
        globalRange,
        formatPhp,
      ),
    },
    {
      id: "login-sales-cadence",
      title: "Login cadence",
      subtitle: `${loginUsers} active user-days · outreach windows · ${rangeLabel}`,
      kind: "login-sales-cadence",
      seriesKey: "loginDaily",
      chartData: loginFiltered,
      breakdown: buildLoginBreakdownRows(
        chartTimeSeries.loginDaily,
        globalRange,
      ),
    },
    {
      id: "new-logo-pipeline",
      title: "New logo pipeline",
      subtitle: `${workspaceTotal} workspaces created · ${rangeLabel}`,
      kind: "new-logo-pipeline",
      seriesKey: "workspacesDaily",
      chartData: aggregateDailyCounts(
        chartTimeSeries.workspacesDaily,
        globalRange,
      ),
      breakdown: buildDailyBreakdownRows(
        chartTimeSeries.workspacesDaily,
        globalRange,
      ),
    },
  ];
}
