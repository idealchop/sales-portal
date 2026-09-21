import type {
  SalesHomeIntent,
  SalesHomeStationRow,
} from "@/features/dashboard/lib/build-sales-home-focus";

export const SALES_HOME_INTENT_LABELS: Record<SalesHomeIntent, string> = {
  hello: "Say hello",
  close_deal: "Stalled demo",
  referred: "Referred in",
  setup: "Finish setup",
  trial: "Trial ending",
  plan_risk: "Plan at risk",
  quiet: "Went quiet",
};

export type SalesHomeChanceBand = "Low" | "Mid" | "High";

export type SalesHomeFocusChart = {
  byIntent: Array<{
    intent: SalesHomeIntent;
    label: string;
    count: number;
    avgChance: number;
  }>;
  byChanceBand: Array<{
    band: SalesHomeChanceBand;
    count: number;
  }>;
  avgChance: number;
  total: number;
};

function chanceBand(percent: number): SalesHomeChanceBand {
  if (percent >= 50) return "High";
  if (percent >= 30) return "Mid";
  return "Low";
}

/**
 * Chart series for Win more / Keep them. Counts and chance only — no money.
 */
export function buildSalesHomeFocusChart(
  rows: SalesHomeStationRow[],
): SalesHomeFocusChart {
  const intentMap = new Map<
    SalesHomeIntent,
    { count: number; chanceSum: number }
  >();
  const bands: Record<SalesHomeChanceBand, number> = {
    Low: 0,
    Mid: 0,
    High: 0,
  };
  let chanceSum = 0;

  for (const row of rows) {
    const current = intentMap.get(row.intent) ?? { count: 0, chanceSum: 0 };
    current.count += 1;
    current.chanceSum += row.chance.percent;
    intentMap.set(row.intent, current);
    bands[chanceBand(row.chance.percent)] += 1;
    chanceSum += row.chance.percent;
  }

  const byIntent = [...intentMap.entries()]
    .map(([intent, value]) => ({
      intent,
      label: SALES_HOME_INTENT_LABELS[intent],
      count: value.count,
      avgChance: Math.round(value.chanceSum / value.count),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    byIntent,
    byChanceBand: (["Low", "Mid", "High"] as const).map((band) => ({
      band,
      count: bands[band],
    })),
    avgChance: rows.length ? Math.round(chanceSum / rows.length) : 0,
    total: rows.length,
  };
}
