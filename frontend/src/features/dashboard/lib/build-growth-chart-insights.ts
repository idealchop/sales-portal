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

function computeMrrByPlan(businesses: ChartBusinessContext[]) {
  const map = new Map<string, { mrr: number; workspaces: number }>();
  businesses.forEach((biz) => {
    if (!biz.planName || biz.price <= 0) return;
    const bucket = map.get(biz.planName) || { mrr: 0, workspaces: 0 };
    bucket.mrr += biz.price;
    bucket.workspaces += 1;
    map.set(biz.planName, bucket);
  });
  return [...map.entries()]
    .map(([plan, value]) => ({ plan, ...value }))
    .sort((a, b) => b.mrr - a.mrr);
}

function buildMrrChartPayload(businesses: ChartBusinessContext[]) {
  const mrrByPlan = computeMrrByPlan(businesses);
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
      name: "Starter potential lost (~)",
      mrr: starterPotential.total,
      count: starterPotential.workspaceCount,
      color: STARTER_POTENTIAL_COLOR,
      isPotential: true,
    });
  }

  const subtitleParts = [
    `${formatPhp(actualMrr)} MRR`,
    starterPotential.total > 0 ?
      `~${formatPhp(starterPotential.total)} starter upside`
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
  const { mrrByPlan, starterPotential } = buildMrrChartPayload(businesses);

  const groups: BreakdownGroup[] = [
    {
      title: `Revenue mix · ${rangeLabel}`,
      rows: mrrByPlan.map((row) => ({
        label: row.plan,
        value: formatPhp(row.mrr),
        detail: `${row.workspaces} workspaces`,
      })),
    },
  ];

  if (starterPotential.total > 0) {
    groups.push({
      title: "Starter potential lost (~)",
      rows: [
        {
          label: "Total approx. upside",
          value: formatPhp(starterPotential.total),
          detail: `${starterPotential.workspaceCount} Starter ws vs ${starterPotential.targetPlanLabel} (${formatPhp(starterPotential.targetPrice)})`,
        },
        {
          label: "Upsell-ready Starter",
          value: `${starterPotential.upsellCount}`,
          detail: "20+ customers or 30+ tx / 30d",
        },
        ...starterPotential.rows.slice(0, 10).map((row) => ({
          label: row.label,
          value: formatPhp(row.potentialLost),
          detail: `${formatPhp(row.currentMrr)} now · ${row.customers} cust · ${row.transactionsLast30Days} tx/30d${row.isUpsellReady ? " · upsell ready" : ""}`,
        })),
      ],
    });
  }

  return {
    breakdown: [
      ...mrrByPlan.map((row) => ({
        label: row.plan,
        value: formatPhp(row.mrr),
        detail: `${row.workspaces} workspaces`,
      })),
      ...(starterPotential.total > 0 ?
        [{
          label: "Starter potential lost (~)",
          value: formatPhp(starterPotential.total),
          detail: `${starterPotential.workspaceCount} workspaces · vs ${starterPotential.targetPlanLabel}`,
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
  const businesses = filterBusinessesInRange(chartBusinessContext, range);
  const rangeLabel = formatDateRangeLabel(range);

  switch (insight.kind) {
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
        breakdown: data.planDistribution.map((row) => ({
          label: row.name,
          value: `${row.count}`,
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
  const businesses = filterBusinessesInRange(chartBusinessContext, globalRange);

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
  const revenueSeries = aggregateTransactionDaily(
    chartTimeSeries.transactionsDaily,
    globalRange,
  ).map((row) => ({ date: row.date, amount: row.amount }));
  const revenueTotal = revenueSeries.reduce((sum, row) => sum + row.amount, 0);
  const planRows = data.planDistribution.filter((row) => row.count > 0);

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
      id: "owner-signups",
      title: "Owner acquisition",
      subtitle: `${ownerTotal} new owners · ${rangeLabel}`,
      kind: "owner-growth",
      seriesKey: "ownerSignupsDaily",
      chartData: aggregateDailyCounts(
        chartTimeSeries.ownerSignupsDaily,
        globalRange,
      ),
      breakdown: buildDailyBreakdownRows(
        chartTimeSeries.ownerSignupsDaily,
        globalRange,
      ),
    },
    {
      id: "workspace-growth",
      title: "Workspace expansion",
      subtitle: `${workspaceTotal} new workspaces · ${rangeLabel}`,
      kind: "workspace-growth",
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
      title: "MRR mix",
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
      title: "Plan mix",
      subtitle: `${planRows.reduce((s, r) => s + r.count, 0)} workspaces · ${rangeLabel}`,
      kind: "plan-distribution",
      chartData: planRows.map((row) => ({
        name: row.name,
        count: row.count,
      })),
      breakdown: planRows.map((row) => ({
        label: row.name,
        value: `${row.count}`,
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
