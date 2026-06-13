import type { BusinessSnapshot } from "./compute-sales-insights";

export function isPaymentPending(paymentStatus?: string): boolean {
  if (!paymentStatus) return false;
  const normalized = paymentStatus.toLowerCase();
  return (
    normalized.includes("pending") ||
    normalized === "unpaid" ||
    normalized === "overdue"
  );
}

export function classifyHealthForSnapshot(
  snapshot: BusinessSnapshot,
): "high" | "medium" | "low" {
  if (
    snapshot.gettingStartedCompleted >= 5 &&
    (snapshot.transactionsLast30Days >= 10 || snapshot.customers >= 50)
  ) {
    return "high";
  }
  if (
    snapshot.gettingStartedCompleted < 2 ||
    (snapshot.customers > 0 && snapshot.transactionsLast30Days === 0)
  ) {
    return "low";
  }
  return "medium";
}

export function isUpgradeOpportunity(snapshot: BusinessSnapshot): boolean {
  const plan = (snapshot.planName || snapshot.planCode || "").toLowerCase();
  if (!plan.includes("starter")) return false;
  return (
    snapshot.customers >= 20 || snapshot.transactionsLast30Days >= 30
  );
}
