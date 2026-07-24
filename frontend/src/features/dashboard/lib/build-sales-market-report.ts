import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { computeStarterPotentialLost } from "@/features/dashboard/lib/compute-starter-potential-lost";
import {
  dayKey,
  isDateInRange,
  resolveGlobalDateRange,
  type DateRange,
  type DateRangeFilterState,
} from "@/features/dashboard/lib/date-range";
import { formatPhp } from "@/lib/format";

export type MarketTrend = "up" | "down" | "neutral";

export type MarketPositionMetric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  trend: MarketTrend;
  idealLabel: string;
  comparisonLabel: string;
};

export type PlanMixTone = "win" | "mid" | "risk";

export type PlanMixRow = {
  plan: string;
  workspaces: number;
  mrr: number;
  sharePercent: number;
  tone: PlanMixTone;
};

export type SalesMarketReport = {
  marketPosition: MarketPositionMetric[];
  planMix: PlanMixRow[];
  proactive: MarketPositionMetric[];
  payingSharePercent: number;
  healthySharePercent: number;
  expansionPotentialPhp: number;
  projectedWinsPhp: number;
  rangeLabel: string;
};

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function inclusiveDays(range: DateRange): number {
  const ms = range.end.getTime() - range.start.getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)) + 1);
}

function shiftRangeBack(range: DateRange, days: number): DateRange {
  const start = new Date(range.start);
  const end = new Date(range.end);
  start.setDate(start.getDate() - days);
  end.setDate(end.getDate() - days);
  return { start, end };
}

function sumDailyCounts(
  rows: Array<{ date: string; count: number }>,
  range: DateRange,
): number {
  return rows
    .filter((row) => isDateInRange(row.date, range))
    .reduce((sum, row) => sum + row.count, 0);
}

function sumDailyTx(
  rows: Array<{ date: string; count: number }>,
  range: DateRange,
): number {
  return rows
    .filter((row) => isDateInRange(row.date, range))
    .reduce((sum, row) => sum + row.count, 0);
}

/** Sales ideals scaled to the active global date filter. */
export function resolveMarketIdeals(periodDays: number) {
  const monthFactor = periodDays / 30;
  return {
    payingSharePercent: 40,
    healthySharePercent: 50,
    onboardedSharePercent: 90,
    /** Target new stations in this window. */
    newLogos: Math.max(1, Math.round(15 * monthFactor)),
    /** Target transactions in this window (~2 tx / station / day, capped). */
    tractionPerStationPerDay: 1.5,
    /** Target est. MRR per station if paying-share ideal is hit at avg paid ARPU. */
    mrrPerPayingStation: 1500,
  };
}

export function trendVsIdeal(
  actual: number,
  ideal: number,
  higherIsBetter = true,
): MarketTrend {
  if (ideal <= 0) return "neutral";
  const ratio = actual / ideal;
  if (higherIsBetter) {
    if (ratio >= 1.05) return "up";
    if (ratio >= 0.9) return "neutral";
    return "down";
  }
  if (ratio <= 0.95) return "up";
  if (ratio <= 1.1) return "neutral";
  return "down";
}

/** Prefer period-over-period when prior window has signal; else fall back to ideal. */
export function resolveTrend(input: {
  actual: number;
  ideal: number;
  prior?: number | null;
  higherIsBetter?: boolean;
}): MarketTrend {
  const higherIsBetter = input.higherIsBetter !== false;
  if (input.prior != null && input.prior > 0) {
    const ratio = input.actual / input.prior;
    if (higherIsBetter) {
      if (ratio >= 1.05) return "up";
      if (ratio >= 0.95) return "neutral";
      return "down";
    }
    if (ratio <= 0.95) return "up";
    if (ratio <= 1.05) return "neutral";
    return "down";
  }
  return trendVsIdeal(input.actual, input.ideal, higherIsBetter);
}

function formatPtsDelta(actual: number, ideal: number): string {
  const delta = Math.round(actual - ideal);
  if (delta === 0) return "on ideal";
  return `${delta > 0 ? "+" : ""}${delta} pts vs ideal ${ideal}%`;
}

function formatCountDelta(actual: number, ideal: number, unit: string): string {
  const delta = Math.round(actual - ideal);
  if (delta === 0) return `on ideal ${ideal.toLocaleString()} ${unit}`;
  return `${delta > 0 ? "+" : ""}${delta.toLocaleString()} vs ideal ${ideal.toLocaleString()} ${unit}`;
}

const PLAN_MIX_TIERS = [
  { key: "scale", label: "Scale", tone: "win" as const },
  { key: "grow", label: "Grow", tone: "win" as const },
  { key: "starter", label: "Starter", tone: "mid" as const },
  { key: "free", label: "Free / trial", tone: "risk" as const },
] as const;

/** Paid wins only — free trial / ₱0 / starter free must not inflate Scale/Grow. */
export function classifyPlanMixTier(input: {
  planName?: string | null;
  planCode?: string | null;
  price?: number | null;
  billingCycle?: string | null;
}): (typeof PLAN_MIX_TIERS)[number]["key"] {
  const key = `${input.planCode || ""} ${input.planName || ""}`
    .trim()
    .toLowerCase();
  const billingCycle = String(input.billingCycle || "").toLowerCase();
  const price =
    typeof input.price === "number" ? input.price : Number(input.price ?? NaN);
  const isTrial =
    billingCycle === "trial" ||
    key.includes("trial") ||
    key.includes("free");
  const isUnpaid = !Number.isFinite(price) || price <= 0;

  if (!key || isTrial || isUnpaid) return "free";
  if (key.includes("scale")) return "scale";
  if (key.includes("growth") || key.includes("grow")) return "grow";
  if (key.includes("starter")) return "starter";
  return "free";
}

/** Full installed-base mix — classify each station by paid price, not plan name alone. */
export function buildPlanMix(data: DashboardAnalytics): PlanMixRow[] {
  const counts: Record<(typeof PLAN_MIX_TIERS)[number]["key"], number> = {
    scale: 0,
    grow: 0,
    starter: 0,
    free: 0,
  };
  const mrrByTier: Record<(typeof PLAN_MIX_TIERS)[number]["key"], number> = {
    scale: 0,
    grow: 0,
    starter: 0,
    free: 0,
  };

  const contexts = (data.chartBusinessContext ?? []).filter(
    (biz) => biz.authAccountTag !== "test",
  );
  if (contexts.length > 0) {
    for (const biz of contexts) {
      const tier = classifyPlanMixTier({
        planName: biz.planName,
        planCode: biz.planCode,
        price: biz.price,
      });
      counts[tier] += 1;
      if (biz.price > 0) mrrByTier[tier] += biz.price;
    }
  } else {
    for (const row of data.salesInsights.mrrByPlan) {
      if (row.mrr <= 0) continue;
      const tier = classifyPlanMixTier({
        planName: row.plan,
        price: row.mrr / Math.max(row.workspaces, 1),
      });
      counts[tier] += row.workspaces;
      mrrByTier[tier] += row.mrr;
    }
    const paid = counts.scale + counts.grow + counts.starter;
    counts.free += Math.max(0, data.summary.totalBusinesses - paid);
  }

  const total =
    counts.scale + counts.grow + counts.starter + counts.free ||
    data.summary.totalBusinesses;

  return PLAN_MIX_TIERS.map((tier) => ({
    plan: tier.label,
    workspaces: counts[tier.key],
    mrr: mrrByTier[tier.key],
    sharePercent: pct(counts[tier.key], total),
    tone: tier.tone,
  }));
}

/** Report-ready market position + proactive sales stats from analytics. */
export function buildSalesMarketReport(
  data: DashboardAnalytics,
  filter: DateRangeFilterState = { preset: "this_month" },
  now = new Date(),
): SalesMarketReport {
  const summary = data.summary;
  const sales = data.salesInsights;
  const personal = data.personalSales;
  const pipeline = data.proposalPipeline;
  const feedback = data.appFeedback;
  const series = data.chartTimeSeries;

  const range = resolveGlobalDateRange(filter, now);
  const periodDays = inclusiveDays(range);
  const priorRange = shiftRangeBack(range, periodDays);
  const ideals = resolveMarketIdeals(periodDays);
  const rangeLabel =
    filter.preset === "custom" ?
      `${dayKey(range.start)} → ${dayKey(range.end)}`
    : filter.preset.split("_").join(" ");

  const totalStations = summary.totalBusinesses;
  const payingStations = sales.mrrByPlan.reduce(
    (sum, row) => sum + row.workspaces,
    0,
  );
  const healthTotal = sales.workspaceHealth.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const healthy =
    sales.workspaceHealth.find((row) => row.tier === "high")?.count ?? 0;
  const payingSharePercent = pct(payingStations, totalStations);
  const healthySharePercent = pct(healthy, healthTotal || totalStations);
  const onboardedSharePercent = pct(
    summary.onboardedBusinesses,
    totalStations,
  );
  const planMix = buildPlanMix(data);
  const starterCount =
    planMix.find((row) => row.plan === "Starter")?.workspaces ?? 0;
  const freeTrialCount =
    planMix.find((row) => row.plan === "Free / trial")?.workspaces ?? 0;

  const newLogosInRange = sumDailyCounts(series.workspacesDaily ?? [], range);
  const newLogosPrior = sumDailyCounts(series.workspacesDaily ?? [], priorRange);
  const newLogosActual =
    newLogosInRange > 0 ? newLogosInRange : sales.newWorkspacesThisMonth;

  const tractionInRange = sumDailyTx(series.transactionsDaily ?? [], range);
  const tractionPrior = sumDailyTx(series.transactionsDaily ?? [], priorRange);
  const tractionActual =
    tractionInRange > 0 ? tractionInRange : summary.transactionsLast30Days;
  const tractionIdeal = Math.round(
    totalStations * ideals.tractionPerStationPerDay * Math.min(periodDays, 30),
  );

  const idealPayingStations = Math.round(
    totalStations * (ideals.payingSharePercent / 100),
  );
  const mrrIdeal = idealPayingStations * ideals.mrrPerPayingStation;

  const starterPotential = computeStarterPotentialLost(
    (data.chartBusinessContext ?? []).filter(
      (biz) => biz.authAccountTag !== "test",
    ),
  );
  const pipelineValue = personal?.pipelineValue ?? pipeline.pipelineValue;
  const winRate = personal?.winRate ?? pipeline.winRate;
  const projectedWinsPhp = Math.round((winRate / 100) * pipelineValue);
  const sentCount =
    pipeline.byStatus.find((row) => row.status === "sent")?.count ?? 0;
  const draftCount =
    pipeline.byStatus.find((row) => row.status === "draft")?.count ?? 0;
  const clients = personal?.totalClients ?? pipeline.totalClients;
  const coveragePercent = pct(
    sentCount +
      (pipeline.byStatus.find((r) => r.status === "accepted")?.count ?? 0),
    Math.max(clients, 1),
  );

  const marketPosition: MarketPositionMetric[] = [
    {
      id: "stations",
      label: "Stations in market",
      value: totalStations.toLocaleString(),
      hint: `${summary.onboardedBusinesses.toLocaleString()} onboarded · ${summary.smartRefillUsers.toLocaleString()} users`,
      trend: trendVsIdeal(onboardedSharePercent, ideals.onboardedSharePercent),
      idealLabel: `Ideal ${ideals.onboardedSharePercent}% onboarded`,
      comparisonLabel: formatPtsDelta(
        onboardedSharePercent,
        ideals.onboardedSharePercent,
      ),
    },
    {
      id: "paying-share",
      label: "Paying share",
      value: `${payingSharePercent}%`,
      hint: `${payingStations} paying · ${starterCount} starter · ${freeTrialCount} free trial`,
      trend: trendVsIdeal(payingSharePercent, ideals.payingSharePercent),
      idealLabel: `Ideal ${ideals.payingSharePercent}% for ${rangeLabel}`,
      comparisonLabel: formatPtsDelta(
        payingSharePercent,
        ideals.payingSharePercent,
      ),
    },
    {
      id: "mrr",
      label: "Est. monthly revenue",
      value: formatPhp(sales.estimatedMrr),
      hint: `${sales.pendingPayments} pending payments`,
      trend: trendVsIdeal(sales.estimatedMrr, mrrIdeal),
      idealLabel: `Ideal ${formatPhp(mrrIdeal)}`,
      comparisonLabel: formatCountDelta(
        Math.round(sales.estimatedMrr),
        mrrIdeal,
        "MRR",
      ),
    },
    {
      id: "health",
      label: "Healthy stations",
      value: `${healthySharePercent}%`,
      hint: `${healthy.toLocaleString()} high · ${sales.atRiskWorkspaces} at-risk · ${sales.inactiveWorkspaces} quiet`,
      trend: trendVsIdeal(healthySharePercent, ideals.healthySharePercent),
      idealLabel: `Ideal ${ideals.healthySharePercent}% for ${rangeLabel}`,
      comparisonLabel: formatPtsDelta(
        healthySharePercent,
        ideals.healthySharePercent,
      ),
    },
    {
      id: "traction",
      label: "Product traction",
      value: tractionActual.toLocaleString(),
      hint: `${summary.totalCustomers.toLocaleString()} customers · ${summary.refillVolumeLast30Days.toLocaleString()} refill vol.`,
      trend: resolveTrend({
        actual: tractionActual,
        ideal: tractionIdeal,
        prior: tractionPrior > 0 ? tractionPrior : null,
      }),
      idealLabel: `Ideal ${tractionIdeal.toLocaleString()} txs (${rangeLabel})`,
      comparisonLabel:
        tractionPrior > 0 ?
          `${tractionActual >= tractionPrior ? "+" : ""}${tractionActual - tractionPrior} vs prior window`
        : formatCountDelta(tractionActual, tractionIdeal, "txs"),
    },
    {
      id: "growth",
      label: "New logos",
      value: `+${newLogosActual}`,
      hint: `+${sales.newSmartRefillUsersThisMonth} users · ${feedback.recommendRate != null ? `${Math.round(feedback.recommendRate)}% recommend` : "no NPS yet"}`,
      trend: resolveTrend({
        actual: newLogosActual,
        ideal: ideals.newLogos,
        prior: newLogosPrior > 0 ? newLogosPrior : null,
      }),
      idealLabel: `Ideal +${ideals.newLogos} (${rangeLabel})`,
      comparisonLabel:
        newLogosPrior > 0 ?
          `${newLogosActual >= newLogosPrior ? "+" : ""}${newLogosActual - newLogosPrior} vs prior window`
        : formatCountDelta(newLogosActual, ideals.newLogos, "logos"),
    },
  ];

  const proactive: MarketPositionMetric[] = [
    {
      id: "projected-wins",
      label: "Projected wins",
      value: formatPhp(projectedWinsPhp),
      hint: `${formatPhp(pipelineValue)} pipeline × ${winRate}% win rate`,
      trend: trendVsIdeal(winRate, 35),
      idealLabel: "Ideal win rate 35%+",
      comparisonLabel: formatPtsDelta(winRate, 35),
    },
    {
      id: "expansion",
      label: "Expansion upside",
      value: formatPhp(starterPotential.total),
      hint: `${starterPotential.upsellCount} upgrade-ready Starters → ${starterPotential.targetPlanLabel}`,
      trend:
        starterPotential.upsellCount > 0 ? "up"
        : starterPotential.total > 0 ? "neutral"
        : "down",
      idealLabel: "Convert upgrade-ready Starters",
      comparisonLabel: `${starterPotential.upsellCount} ready now`,
    },
    {
      id: "upgrade-ready",
      label: "Upgrade-ready stations",
      value: sales.upgradeOpportunities.toLocaleString(),
      hint: "High-usage Starter accounts to convert",
      trend: trendVsIdeal(sales.upgradeOpportunities, Math.max(3, ideals.newLogos)),
      idealLabel: `Work ≥${Math.max(3, ideals.newLogos)} this window`,
      comparisonLabel: formatCountDelta(
        sales.upgradeOpportunities,
        Math.max(3, ideals.newLogos),
        "accounts",
      ),
    },
    {
      id: "pipeline-coverage",
      label: "Proposal coverage",
      value: `${coveragePercent}%`,
      hint: `${sentCount} sent · ${draftCount} drafts · ${clients} clients`,
      trend: trendVsIdeal(coveragePercent, 60),
      idealLabel: "Ideal 60%+ coverage",
      comparisonLabel: formatPtsDelta(coveragePercent, 60),
    },
    {
      id: "closed-won",
      label: "Closed won",
      value: formatPhp(personal?.acceptedValue ?? pipeline.acceptedValue),
      hint: `${winRate}% win rate`,
      trend: trendVsIdeal(winRate, 35),
      idealLabel: "Ideal win rate 35%+",
      comparisonLabel: formatPtsDelta(winRate, 35),
    },
    {
      id: "commissions",
      label: "Commissions MTD",
      value: formatPhp(personal?.commissionsMtd ?? 0),
      hint: `${formatPhp(personal?.pendingCommissions ?? 0)} pending`,
      trend: trendVsIdeal(personal?.commissionsMtd ?? 0, Math.max(1, mrrIdeal * 0.05)),
      idealLabel: `Pace ~${formatPhp(Math.round(mrrIdeal * 0.05))} (${rangeLabel})`,
      comparisonLabel: formatCountDelta(
        Math.round(personal?.commissionsMtd ?? 0),
        Math.round(mrrIdeal * 0.05),
        "commissions",
      ),
    },
  ];

  return {
    marketPosition,
    planMix,
    proactive,
    payingSharePercent,
    healthySharePercent,
    expansionPotentialPhp: starterPotential.total,
    projectedWinsPhp,
    rangeLabel,
  };
}
