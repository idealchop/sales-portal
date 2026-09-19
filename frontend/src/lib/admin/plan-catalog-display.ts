import { normalizeSubscriptionPlanCode } from "@/lib/admin/subscription-plans-catalog";

export const REQUIRED_SELF_SERVE_PLAN_CODES = [
  "free",
  "starter",
  "grow",
  "scale",
] as const;

export type RequiredSelfServePlanCode =
  (typeof REQUIRED_SELF_SERVE_PLAN_CODES)[number];

export const PLAN_PRESET_OPTIONS = [
  { code: "free", label: "Free (₱0)", hint: "After trial, or stations that never subscribe" },
  { code: "starter", label: "Starter (₱399 / mo)", hint: "First paid plan" },
  { code: "grow", label: "Grow (₱950 / mo)", hint: "Growing stations" },
  { code: "scale", label: "Scale (₱1,650 / mo)", hint: "Full product, also used as the trial" },
  { code: "enterprise", label: "Enterprise (contact sales)", hint: "Hidden from self-serve checkout" },
] as const;

const PLAN_SORT_ORDER: Record<string, number> = {
  free: 0,
  starter: 10,
  grow: 20,
  pro: 20,
  scale: 30,
  enterprise: 90,
};

export function catalogPlanCode(data: Record<string, unknown>): string {
  return normalizeSubscriptionPlanCode(String(data.code || "").trim());
}

export function defaultPlanSortOrder(planCode: string): string {
  const code = normalizeSubscriptionPlanCode(planCode);
  const order = PLAN_SORT_ORDER[code];
  return order === undefined ? "100" : String(order);
}

export function monthlyPriceFromCatalog(data: Record<string, unknown>): number | null {
  const pricing =
    data.pricing && typeof data.pricing === "object" && !Array.isArray(data.pricing) ?
      (data.pricing as { monthly?: unknown })
    : null;
  const monthly = Number(pricing?.monthly);
  return Number.isFinite(monthly) ? monthly : null;
}

export function yearlyPriceFromCatalog(data: Record<string, unknown>): number | null {
  const pricing =
    data.pricing && typeof data.pricing === "object" && !Array.isArray(data.pricing) ?
      (data.pricing as { yearly?: unknown })
    : null;
  const yearly = Number(pricing?.yearly);
  return Number.isFinite(yearly) ? yearly : null;
}

export function formatPhpAmount(amount: number | null): string {
  if (amount === null) return "—";
  if (amount === 0) return "₱0";
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function formatPlanPriceLine(data: Record<string, unknown>): string {
  const monthly = monthlyPriceFromCatalog(data);
  const yearly = yearlyPriceFromCatalog(data);
  if (monthly === null) return "—";
  if (monthly === 0) return "₱0";
  if (yearly && yearly > 0) {
    return `${formatPhpAmount(monthly)} / mo · ${formatPhpAmount(yearly)} / yr`;
  }
  return `${formatPhpAmount(monthly)} / mo`;
}

export function planOnPricingPage(data: Record<string, unknown>): boolean {
  const caps =
    data.capabilities && typeof data.capabilities === "object" && !Array.isArray(data.capabilities) ?
      (data.capabilities as { showOnPricing?: unknown; selfServe?: unknown })
    : null;
  if (typeof caps?.showOnPricing === "boolean") return caps.showOnPricing;
  if (caps?.selfServe === false) return false;
  if (data.showOnPricing === false || data.selfServe === false) return false;
  return catalogPlanCode(data) !== "enterprise";
}

export function hasPendingCatalogDraft(data: Record<string, unknown>): boolean {
  return Boolean(data.draft && typeof data.draft === "object");
}

export function missingRequiredPlanCodes(
  documents: Array<{ data: Record<string, unknown> }>,
): RequiredSelfServePlanCode[] {
  const present = new Set(
    documents.map((doc) => catalogPlanCode(doc.data)).filter(Boolean),
  );
  return REQUIRED_SELF_SERVE_PLAN_CODES.filter((code) => !present.has(code));
}

export function sortCatalogPlanDocuments<
  T extends { data: Record<string, unknown>; documentId: string },
>(documents: T[]): T[] {
  return [...documents].sort((a, b) => {
    const aOrder = Number(a.data.sortOrder);
    const bOrder = Number(b.data.sortOrder);
    if (Number.isFinite(aOrder) && Number.isFinite(bOrder) && aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    const aPrice = monthlyPriceFromCatalog(a.data);
    const bPrice = monthlyPriceFromCatalog(b.data);
    if (aPrice !== null && bPrice !== null && aPrice !== bPrice) {
      return aPrice - bPrice;
    }
    const aName = String(a.data.name || a.documentId);
    const bName = String(b.data.name || b.documentId);
    return aName.localeCompare(bName, undefined, { sensitivity: "base" });
  });
}

export function planPresetLabel(code: string): string {
  const match = PLAN_PRESET_OPTIONS.find((option) => option.code === code);
  return match?.label ?? code;
}
