export const OFFER_PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "grow", label: "Grow" },
  { value: "scale", label: "Scale" },
  { value: "enterprise", label: "Enterprise" },
] as const;

export const ADDON_PRESETS = [
  {
    code: "EXT_RIDER",
    name: "Extra rider",
    description: "Add one more rider seat on top of the plan.",
    price: "299",
    unit: "1",
    billingModel: "recurring" as const,
    billingInterval: "monthly" as const,
    featureKey: "rider_slot",
    extendsPlanLimitation: "staff_rider",
    applicablePlanCodes: "grow, scale",
    maxUnitsPerBusiness: "5",
    trialEligible: false,
    sortOrder: "10",
  },
  {
    code: "EXT_AI_BOOST",
    name: "AI operations boost",
    description: "Give the station more River AI credits each month.",
    price: "450",
    unit: "1",
    billingModel: "recurring" as const,
    billingInterval: "monthly" as const,
    featureKey: "ai_tools",
    extendsPlanLimitation: "ai_tools",
    applicablePlanCodes: "grow, scale",
    maxUnitsPerBusiness: "3",
    trialEligible: false,
    sortOrder: "20",
  },
  {
    code: "EXT_BUSINESS",
    name: "Additional business",
    description: "Let the owner add another station under the same account.",
    price: "990",
    unit: "1",
    billingModel: "recurring" as const,
    billingInterval: "monthly" as const,
    featureKey: "extra_business",
    extendsPlanLimitation: "extra_business",
    applicablePlanCodes: "grow, scale, enterprise",
    maxUnitsPerBusiness: "10",
    trialEligible: false,
    sortOrder: "30",
  },
] as const;

export const ADDON_UNLOCK_OPTIONS = [
  {
    id: "rider_slot",
    label: "Extra rider seat",
    featureKey: "rider_slot",
    extendsPlanLimitation: "staff_rider",
  },
  {
    id: "ai_tools",
    label: "More River AI credits",
    featureKey: "ai_tools",
    extendsPlanLimitation: "ai_tools",
  },
  {
    id: "extra_business",
    label: "Another station",
    featureKey: "extra_business",
    extendsPlanLimitation: "extra_business",
  },
  {
    id: "custom",
    label: "Something else",
    featureKey: "",
    extendsPlanLimitation: "",
  },
] as const;

export function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toggleCommaValue(current: string, token: string, enabled: boolean): string {
  const normalized = token.trim().toLowerCase();
  const next = new Set(parseCommaList(current).map((item) => item.toLowerCase()));
  if (enabled) next.add(normalized);
  else next.delete(normalized);
  return [...next].join(", ");
}

export function commaListHas(current: string, token: string): boolean {
  return parseCommaList(current).some((item) => item.toLowerCase() === token.toLowerCase());
}

export function formatPhpAmount(amount: number | null): string {
  if (amount === null) return "—";
  if (amount === 0) return "₱0";
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function formatAddonPriceLine(data: Record<string, unknown>): string {
  const price = Number(data.price);
  if (!Number.isFinite(price)) return "—";
  const interval = data.billingModel === "one_time" ? "one-time" : data.billingInterval === "yearly" ? "/ yr" : "/ mo";
  if (data.billingModel === "one_time") {
    return `${formatPhpAmount(price)} one-time`;
  }
  return `${formatPhpAmount(price)} ${interval}`;
}

export function formatAddonPlansLine(data: Record<string, unknown>): string {
  const codes = Array.isArray(data.applicablePlanCodes) ?
      data.applicablePlanCodes.map((item) => String(item).trim()).filter(Boolean)
    : parseCommaList(String(data.applicablePlanCodes || ""));
  if (codes.length === 0) return "All plans";
  return codes
    .map((code) => {
      const match = OFFER_PLAN_OPTIONS.find((option) => option.value === code.toLowerCase() || (code.toLowerCase() === "pro" && option.value === "grow"));
      return match?.label ?? code;
    })
    .join(", ");
}

export function formatVoucherOfferLine(data: Record<string, unknown>): string {
  const kind = String(data.kind || "voucher");
  if (kind === "affiliate") {
    const value = Number(data.commissionValue);
    if (!Number.isFinite(value)) return "Partner commission";
    return data.commissionType === "fixed_per_conversion" ?
        `${formatPhpAmount(value)} per signup`
      : `${value}% commission`;
  }
  const value = Number(data.discountValue);
  if (!Number.isFinite(value)) return "—";
  if (data.discountType === "fixed_amount") return `${formatPhpAmount(value)} off`;
  if (data.discountType === "free_trial_days") return `${value} extra trial days`;
  return `${value}% off`;
}

export function addonUnlockId(featureKey: string, extendsPlanLimitation: string): string {
  const match = ADDON_UNLOCK_OPTIONS.find(
    (option) =>
      option.id !== "custom" &&
      (option.featureKey === featureKey || option.extendsPlanLimitation === extendsPlanLimitation),
  );
  return match?.id ?? "custom";
}
