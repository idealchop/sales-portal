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

export function isTrialBillingCycle(billingCycle?: string): boolean {
  return billingCycle === "trial";
}

function isTrialPlan(subscription: { billingCycle?: string }): boolean {
  return isTrialBillingCycle(subscription.billingCycle);
}

export function formatBillingCycleLabel(billingCycle?: string): string | undefined {
  if (!billingCycle) return undefined;
  if (billingCycle === "trial") return "Free Trial";
  return billingCycle.replaceAll("_", " ");
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(value: Date): Date {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function formatTrialDaysRemaining(
  expiresAt?: string,
  referenceDate: Date = new Date(),
): string | null {
  if (!expiresAt) return null;

  const expiresDay = startOfLocalDay(new Date(expiresAt));
  const today = startOfLocalDay(referenceDate);
  const daysLeft = Math.round(
    (expiresDay.getTime() - today.getTime()) / MS_PER_DAY,
  );

  if (daysLeft < 0) return "Trial ended";
  if (daysLeft === 0) return "Last day of trial";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
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
