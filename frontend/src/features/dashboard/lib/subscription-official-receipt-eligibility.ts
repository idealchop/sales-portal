import type { OwnerSubscription } from "@/lib/dashboard/analytics";

/**
 * True when sales portal may generate an Official Receipt PDF for this row
 * (paid period — not trial, Starter, or pending/failed payment).
 */
export function subscriptionEligibleForOfficialReceipt(
  subscription: Pick<
    OwnerSubscription,
    "billingCycle" | "planCode" | "planName" | "price" | "paymentStatus" | "status"
  >,
): boolean {
  const billingCycle = String(subscription.billingCycle ?? "").toLowerCase();
  if (billingCycle === "trial") return false;

  const planCode = String(subscription.planCode ?? "").toLowerCase();
  const planName = String(subscription.planName ?? "").toLowerCase();
  if (planCode === "starter" || planName === "starter") return false;

  const price = Number(subscription.price);
  if (!Number.isFinite(price) || price <= 0) return false;

  const paymentStatus = String(subscription.paymentStatus ?? "").toLowerCase();
  if (
    paymentStatus === "failed" ||
    paymentStatus === "pending_verification" ||
    paymentStatus === "pending"
  ) {
    return false;
  }
  if (paymentStatus === "verified" || paymentStatus === "approved") return true;

  const status = String(subscription.status ?? "").toLowerCase();
  return status === "approved" || status === "active" || status === "expired";
}

/**
 * True when history has at least one paid period for a statement of account.
 */
export function subscriptionHistoryHasStatementPayments(
  history: Array<Pick<OwnerSubscription, "billingCycle" | "price">>,
): boolean {
  return history.some((sub) => {
    if (String(sub.billingCycle ?? "").toLowerCase() === "trial") return false;
    const price = Number(sub.price);
    return Number.isFinite(price) && price > 0;
  });
}
