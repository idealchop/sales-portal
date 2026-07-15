/**
 * Presets for Private visibility on WRS Stories / webinar recordings.
 * Stored as `allowAllMembers` + `allowedPlanCodes` on training_videos.
 */
export type PrivateAudience = "all" | "paid" | "scale";

/** Grow (+ legacy Pro) and Scale — paid Smart Refill subscriptions. */
export const PRIVATE_AUDIENCE_PAID_PLAN_CODES = ["grow", "pro", "scale"] as const;

/** Scale-only gate. */
export const PRIVATE_AUDIENCE_SCALE_PLAN_CODES = ["scale"] as const;

export const PRIVATE_AUDIENCE_OPTIONS: {
  value: PrivateAudience;
  label: string;
  hint: string;
}[] = [
  {
    value: "all",
    label: "All",
    hint: "Every signed-in member",
  },
  {
    value: "paid",
    label: "Paid member",
    hint: "Grow or Scale subscription",
  },
  {
    value: "scale",
    label: "Scale member",
    hint: "Scale subscription only",
  },
];

export function privateAudienceAccess(audience: PrivateAudience): {
  allowAllMembers: boolean;
  allowedPlanCodes: string[];
} {
  if (audience === "all") {
    return { allowAllMembers: true, allowedPlanCodes: [] };
  }
  if (audience === "scale") {
    return {
      allowAllMembers: false,
      allowedPlanCodes: [...PRIVATE_AUDIENCE_SCALE_PLAN_CODES],
    };
  }
  return {
    allowAllMembers: false,
    allowedPlanCodes: [...PRIVATE_AUDIENCE_PAID_PLAN_CODES],
  };
}

function normalizePlanCode(code: string): string {
  return code.trim().toLowerCase();
}

function isGrowFamily(code: string): boolean {
  return code === "grow" || code === "pro";
}

function isScaleFamily(code: string): boolean {
  return code.includes("scale");
}

/**
 * Infer the closest CMS preset from stored private access fields.
 */
export function inferPrivateAudience(input: {
  allowAllMembers?: boolean | null;
  allowedPlanCodes?: string[] | null;
}): PrivateAudience {
  if (input.allowAllMembers === true) return "all";
  const plans = (input.allowedPlanCodes ?? [])
    .map((code) => normalizePlanCode(String(code)))
    .filter(Boolean);
  if (plans.length === 0) return "all";

  const onlyScale = plans.every((code) => isScaleFamily(code));
  if (onlyScale) return "scale";

  return "paid";
}

export function privateAudienceLabel(audience: PrivateAudience): string {
  return (
    PRIVATE_AUDIENCE_OPTIONS.find((option) => option.value === audience)
      ?.label ?? audience
  );
}

/** True when a member plan is allowed by a Private video's plan checklist. */
export function memberPlanAllowsPrivateVideo(input: {
  memberPlanCode: string | null | undefined;
  allowedPlanCodes: string[];
}): boolean {
  const member = normalizePlanCode(input.memberPlanCode ?? "");
  if (!member) return false;
  const allowed = input.allowedPlanCodes
    .map((code) => normalizePlanCode(String(code)))
    .filter(Boolean);
  if (allowed.length === 0) return true;

  for (const code of allowed) {
    if (code === member) return true;
    if (isGrowFamily(code) && isGrowFamily(member)) return true;
    if (isScaleFamily(code) && isScaleFamily(member)) return true;
  }
  return false;
}
