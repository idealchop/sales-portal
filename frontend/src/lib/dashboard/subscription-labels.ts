const DOWNGRADE_REASONS: Record<string, string> = {
  too_expensive: "Plan cost is too high",
  not_using_features: "Not using premium features",
  business_slowdown: "Station volume slowed down",
  switching_solution: "Switching to another solution",
  temporary_pause: "Seasonal / temporary pause",
  other: "Other",
};

export function formatDowngradeReason(
  code?: string,
  detail?: string,
): string {
  if (!code) return detail || "No reason recorded";
  const label = DOWNGRADE_REASONS[code] || code.replaceAll("_", " ");
  if (code === "other" && detail) return `${label}: ${detail}`;
  if (detail) return `${label} · ${detail}`;
  return label;
}

export function formatSubscriptionStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export function formatPaymentStatus(status?: string): string {
  if (!status) return "—";
  return status.replaceAll("_", " ");
}

function formatPeriodDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isStarterPlan(subscription: {
  planCode?: string;
  planName: string;
  billingCycle?: string;
}): boolean {
  if (subscription.billingCycle === "trial") return false;
  const code = (subscription.planCode || "").toLowerCase();
  const name = subscription.planName.toLowerCase();
  return code === "starter" || name === "starter";
}

function isTrialPlan(subscription: { billingCycle?: string }): boolean {
  return subscription.billingCycle === "trial";
}

export function formatSubscriptionPeriod(subscription: {
  planCode?: string;
  planName: string;
  billingCycle?: string;
  createdAt?: string;
  activatedAt?: string;
  activatesAt?: string;
  expiresAt?: string;
}): string {
  const start =
    subscription.activatesAt ||
    subscription.activatedAt ||
    subscription.createdAt;
  const startLabel = formatPeriodDate(start);

  if (isStarterPlan(subscription)) {
    return `${startLabel} – indefinite`;
  }

  if (isTrialPlan(subscription) || subscription.expiresAt) {
    const endLabel = formatPeriodDate(subscription.expiresAt);
    if (startLabel !== "—" && endLabel !== "—") {
      return `${startLabel} – ${endLabel}`;
    }
  }

  return startLabel;
}
