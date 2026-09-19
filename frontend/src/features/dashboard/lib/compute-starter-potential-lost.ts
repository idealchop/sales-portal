import type { ChartBusinessContext } from "@/lib/dashboard/analytics";
import { isFreeForeverPlan } from "@/lib/dashboard/subscription-plan-codes";

export type StarterPotentialLostRow = {
  id: string;
  label: string;
  ownerEmail?: string;
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

/** Official Scale monthly list price (PHP) — avoid averaging live invoices. */
export const SCALE_LIST_PRICE_PHP = 1650;

function planKey(biz: ChartBusinessContext): string {
  return `${biz.planCode || ""} ${biz.planName || ""}`.trim().toLowerCase();
}

export function isStarterPlan(biz: ChartBusinessContext): boolean {
  return isFreeForeverPlan(biz);
}

function isScalePlan(biz: ChartBusinessContext): boolean {
  return planKey(biz).includes("scale");
}

function isGrowthPlan(biz: ChartBusinessContext): boolean {
  return planKey(biz).includes("growth") || planKey(biz).includes("grow");
}

export function isStarterUpsellReady(biz: ChartBusinessContext): boolean {
  if (!isStarterPlan(biz)) return false;
  return biz.customers >= 80 || biz.transactionsLast30Days >= 40;
}

/** Most common positive price; ties prefer the lower (list-like) amount. */
export function mostCommonPositivePrice(prices: number[]): number {
  const valid = prices
    .filter((price) => Number.isFinite(price) && price > 0)
    .map((price) => Math.round(price));
  if (valid.length === 0) return 0;

  const counts = new Map<number, number>();
  for (const price of valid) {
    counts.set(price, (counts.get(price) || 0) + 1);
  }

  let bestPrice = valid[0];
  let bestCount = 0;
  for (const [price, count] of counts) {
    if (
      count > bestCount ||
      (count === bestCount && price < bestPrice)
    ) {
      bestPrice = price;
      bestCount = count;
    }
  }
  return bestPrice;
}

/**
 * Upsell target for Starter → Scale.
 * Always use Scale list price (₱1,650). Averaging live Scale invoices produced
 * confusing figures like ₱1,710 when seats had custom/prorated amounts.
 */
export function resolveStarterUpsellTarget(
  businesses: ChartBusinessContext[],
): { price: number; label: string } {
  const hasScale = businesses.some(
    (biz) => isScalePlan(biz) && biz.price > 0,
  );
  if (hasScale) {
    return { price: SCALE_LIST_PRICE_PHP, label: "Scale" };
  }

  const growthMode = mostCommonPositivePrice(
    businesses.filter(isGrowthPlan).map((biz) => biz.price),
  );
  if (growthMode > 0) {
    return { price: growthMode, label: "Grow" };
  }

  return { price: SCALE_LIST_PRICE_PHP, label: "Scale" };
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
        label:
          biz.name?.trim() ||
          (biz.id ? `Workspace ${biz.id.slice(0, 8)}` : "") ||
          biz.planName ||
          "Free workspace",
        ownerEmail: biz.ownerEmail?.trim() || undefined,
        currentMrr: biz.price,
        targetMrr: targetPrice,
        potentialLost,
        customers: biz.customers,
        transactionsLast30Days: biz.transactionsLast30Days,
        isUpsellReady: isStarterUpsellReady(biz),
      };
    })
    .filter((row) => row.potentialLost > 0)
    .sort((a, b) => {
      if (a.isUpsellReady !== b.isUpsellReady) return a.isUpsellReady ? -1 : 1;
      return b.potentialLost - a.potentialLost;
    });

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
