/**
 * Whether a subscription may generate a paid Official Receipt PDF.
 * Excludes free trial, Starter (free tier), unpaid rows, and failed / pending payment.
 */
export function subscriptionRowEligibleForOfficialReceipt(
  sub: Record<string, unknown>,
): boolean {
  const billingCycle = String(sub.billingCycle ?? "").toLowerCase();
  if (billingCycle === "trial") return false;

  const planCode = String(sub.planCode ?? "").toLowerCase();
  if (planCode === "starter") return false;

  const priceRaw = sub.price;
  const price = typeof priceRaw === "number" ? priceRaw : Number(priceRaw);
  if (!Number.isFinite(price) || price <= 0) return false;

  const paymentStatus = String(sub.paymentStatus ?? "").toLowerCase();
  if (paymentStatus === "failed" || paymentStatus === "pending_verification") {
    return false;
  }
  if (paymentStatus === "pending") return false;
  if (paymentStatus === "verified" || paymentStatus === "approved") return true;

  const status = String(sub.status ?? "").toLowerCase();
  if (
    price > 0 &&
    (status === "approved" || status === "active" || status === "expired")
  ) {
    return true;
  }

  return false;
}
