import type { BusinessSnapshot } from "./compute-sales-insights";
import { isFreeForeverPlan, isPaidStarterPlan } from "../utils/subscription-plan-codes";

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
  if (!isFreeForeverPlan(snapshot) && !isPaidStarterPlan(snapshot)) return false;
  return snapshot.customers >= 80 || snapshot.transactionsLast30Days >= 40;
}
