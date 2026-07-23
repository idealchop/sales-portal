import { db } from "../config/firebase-admin";
import {
  buildSubscriptionOfficialReceiptPdf,
  formatBusinessAddressForPdf,
} from "./subscription-official-receipt-pdf";
import { subscriptionRowEligibleForOfficialReceipt } from "../utils/subscription-official-receipt-eligibility";
import { formatSubscriptionReceiptDate } from "../utils/subscription-receipt-date";

export async function generateSubscriptionOfficialReceipt(input: {
  businessId: string;
  subscriptionId: string;
}): Promise<{ buffer: Buffer; filename: string }> {
  const { businessId, subscriptionId } = input;

  const [businessSnap, subSnap] = await Promise.all([
    db.collection("businesses").doc(businessId).get(),
    db
      .collection("businesses")
      .doc(businessId)
      .collection("subscriptions")
      .doc(subscriptionId)
      .get(),
  ]);

  if (!businessSnap.exists) {
    throw new Error("BUSINESS_NOT_FOUND");
  }
  if (!subSnap.exists) {
    throw new Error("SUBSCRIPTION_NOT_FOUND");
  }

  const biz = (businessSnap.data() ?? {}) as Record<string, unknown>;
  const sub = (subSnap.data() ?? {}) as Record<string, unknown>;

  if (!subscriptionRowEligibleForOfficialReceipt(sub)) {
    throw new Error("SUBSCRIPTION_NOT_ELIGIBLE_FOR_OR");
  }

  const ownerId = String(biz.ownerId || "");
  let ownerDisplayName = "";
  let ownerEmail = "";
  if (ownerId) {
    const uSnap = await db.collection("users").doc(ownerId).get();
    if (uSnap.exists) {
      const u = (uSnap.data() ?? {}) as Record<string, unknown>;
      ownerDisplayName = String(u.displayName || u.name || "");
      ownerEmail = String(u.email || "");
    }
  }

  const dates = (sub.dates || {}) as Record<string, unknown>;
  const priceNum =
    typeof sub.price === "number" ? sub.price : Number(sub.price);

  const buffer = await buildSubscriptionOfficialReceiptPdf({
    businessName: String(biz.name || biz.businessName || ""),
    businessEmail: String(biz.email || ""),
    businessPhone: String(biz.phone || ""),
    businessAddress: formatBusinessAddressForPdf(biz),
    ownerDisplayName,
    ownerEmail,
    subscriptionId,
    planName: String(sub.planName || ""),
    planCode: String(sub.planCode || ""),
    billingCycle: String(sub.billingCycle || ""),
    price: Number.isFinite(priceNum) ? priceNum : 0,
    paymentMethod: String(sub.paymentMethod || ""),
    paymentReference: String(sub.paymentReference || ""),
    paymentStatus: String(sub.paymentStatus || sub.status || ""),
    voucherCode: String(sub.voucherCode || ""),
    periodStart: formatSubscriptionReceiptDate(
      dates.activatedAt ?? sub.activatedAt,
    ),
    periodEnd: formatSubscriptionReceiptDate(
      dates.expiresAt ?? sub.expiresAt,
    ),
    renewalDate: formatSubscriptionReceiptDate(
      dates.renewalAt ?? sub.renewalAt,
    ),
  });

  return {
    buffer,
    filename: `SmartRefill-OR-${subscriptionId}.pdf`,
  };
}
