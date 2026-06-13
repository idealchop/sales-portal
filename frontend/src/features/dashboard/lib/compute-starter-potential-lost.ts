import type { ChartBusinessContext } from "@/lib/dashboard/analytics";

export type StarterPotentialLostRow = {
  id: string;
  label: string;
  currentMrr: number;
  targetMrr: number;
  potentialLost: number;
  customers: number;
  transactionsLast30Days: number;
  isUpsellReady: boolean;
};

export type StarterPotentialLostSummary = {
  total: number;
  targetPlanLabel: string;
  targetPrice: number;
  workspaceCount: number;
  upsellCount: number;
  rows: StarterPotentialLostRow[];
};

const STARTER_POTENTIAL_COLOR = "#F59E0B";

function planKey(biz: ChartBusinessContext): string {
  return `${biz.planCode || ""} ${biz.planName || ""}`.trim().toLowerCase();
}

export function isStarterPlan(biz: ChartBusinessContext): boolean {
  return planKey(biz).includes("starter");
}

function isScalePlan(biz: ChartBusinessContext): boolean {
  return planKey(biz).includes("scale");
}

function isGrowthPlan(biz: ChartBusinessContext): boolean {
  return planKey(biz).includes("growth");
}

export function isStarterUpsellReady(biz: ChartBusinessContext): boolean {
  if (!isStarterPlan(biz)) return false;
  return biz.customers >= 20 || biz.transactionsLast30Days >= 30;
}

function averagePositivePrices(prices: number[]): number {
  const valid = prices.filter((price) => price > 0);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((sum, price) => sum + price, 0) / valid.length);
}

export function resolveStarterUpsellTarget(
  businesses: ChartBusinessContext[],
): { price: number; label: string } {
  const scalePrices = businesses
    .filter(isScalePlan)
    .map((biz) => biz.price);
  const scaleAvg = averagePositivePrices(scalePrices);
  if (scaleAvg > 0) {
    return { price: scaleAvg, label: "Scale avg" };
  }

  const growthPrices = businesses
    .filter(isGrowthPlan)
    .map((biz) => biz.price);
  const growthAvg = averagePositivePrices(growthPrices);
  if (growthAvg > 0) {
    return { price: growthAvg, label: "Growth avg" };
  }

  const paid = businesses.map((biz) => biz.price).filter((price) => price > 0);
  if (paid.length > 0) {
    return { price: Math.max(...paid), label: "Top plan" };
  }

  return { price: 0, label: "Scale avg" };
}

export function computeStarterPotentialLost(
  businesses: ChartBusinessContext[],
): StarterPotentialLostSummary {
  const { price: targetPrice, label: targetPlanLabel } =
    resolveStarterUpsellTarget(businesses);

  const rows = businesses
    .filter(isStarterPlan)
    .map((biz) => {
      const potentialLost = Math.max(0, targetPrice - biz.price);
      return {
        id: biz.id,
        label: biz.planName || "Starter",
        currentMrr: biz.price,
        targetMrr: targetPrice,
        potentialLost,
        customers: biz.customers,
        transactionsLast30Days: biz.transactionsLast30Days,
        isUpsellReady: isStarterUpsellReady(biz),
      };
    })
    .filter((row) => row.potentialLost > 0)
    .sort((a, b) => b.potentialLost - a.potentialLost);

  return {
    total: rows.reduce((sum, row) => sum + row.potentialLost, 0),
    targetPlanLabel,
    targetPrice,
    workspaceCount: rows.length,
    upsellCount: rows.filter((row) => row.isUpsellReady).length,
    rows,
  };
}

export { STARTER_POTENTIAL_COLOR };
