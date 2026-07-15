import { db, FieldValue } from "../config/firebase-admin";

export async function approveSubscriptionPayment(input: {
  businessId: string;
  subscriptionId: string;
}): Promise<{ success: true }> {
  const { businessId, subscriptionId } = input;
  const ref = db
    .collection("businesses")
    .doc(businessId)
    .collection("subscriptions")
    .doc(subscriptionId);

  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("SUBSCRIPTION_NOT_FOUND");
  }

  const data = snap.data() ?? {};
  const status = String(data.status || "");
  const paymentStatus = String(data.paymentStatus || "");

  if (["superseded", "expired", "cancelled", "canceled"].includes(status)) {
    throw new Error("SUBSCRIPTION_NOT_APPROVABLE");
  }

  const pendingPayment =
    paymentStatus === "pending_verification" || paymentStatus === "pending";
  if (!pendingPayment && status !== "pending") {
    throw new Error("SUBSCRIPTION_NOT_PENDING");
  }

  await ref.update({
    status: "approved",
    paymentStatus: "verified",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}
