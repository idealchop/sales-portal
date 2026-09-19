/** Canonical plan-code helpers. Free (₱0 forever) and Starter (paid) are distinct. */

export function normalizePlanCode(planCode: string | undefined | null): string {
  return String(planCode || "").toLowerCase().trim();
}

export function planKey(
  planCode?: string | null,
  planName?: string | null,
): string {
  return `${planCode || ""} ${planName || ""}`.trim().toLowerCase();
}

export function isTrialPlan(input: {
  billingCycle?: string | null;
  planCode?: string | null;
  planName?: string | null;
}): boolean {
  if (String(input.billingCycle || "").toLowerCase() === "trial") return true;
  const key = planKey(input.planCode, input.planName);
  return key.includes("trial");
}

export function isFreePlanCode(planCode?: string | null, planName?: string | null): boolean {
  const code = normalizePlanCode(planCode);
  if (code === "free") return true;
  const name = String(planName || "").toLowerCase().trim();
  return name === "free";
}

export function isStarterPlanCode(planCode?: string | null, planName?: string | null): boolean {
  const code = normalizePlanCode(planCode);
  if (code === "starter") return true;
  const name = String(planName || "").toLowerCase().trim();
  return name === "starter" || name.startsWith("starter ");
}

export function isGrowPlanCode(planCode?: string | null, planName?: string | null): boolean {
  const code = normalizePlanCode(planCode);
  if (code === "grow" || code === "pro" || code === "growth") return true;
  const key = planKey(planCode, planName);
  return key.includes("grow");
}

export function isScalePlanCode(planCode?: string | null, planName?: string | null): boolean {
  const code = normalizePlanCode(planCode);
  if (code === "scale" || code === "enterprise") return true;
  const key = planKey(planCode, planName);
  return key.includes("scale") || key.includes("enterprise");
}

/** Forever ₱0: Free plan, or legacy unpaid Starter. Not a paid Starter row. */
export function isFreeForeverPlan(input: {
  planCode?: string | null;
  planName?: string | null;
  price?: number | null;
  billingCycle?: string | null;
}): boolean {
  if (isTrialPlan(input)) return false;
  if (isFreePlanCode(input.planCode, input.planName)) return true;
  if (!isStarterPlanCode(input.planCode, input.planName)) return false;
  const price =
    typeof input.price === "number" ? input.price : Number(input.price ?? NaN);
  return !Number.isFinite(price) || price <= 0;
}

export function isPaidStarterPlan(input: {
  planCode?: string | null;
  planName?: string | null;
  price?: number | null;
  billingCycle?: string | null;
}): boolean {
  if (isTrialPlan(input) || isFreeForeverPlan(input)) return false;
  if (!isStarterPlanCode(input.planCode, input.planName)) return false;
  const price =
    typeof input.price === "number" ? input.price : Number(input.price ?? NaN);
  return Number.isFinite(price) && price > 0;
}
