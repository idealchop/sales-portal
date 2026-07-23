import { db } from "../config/firebase-admin";
import {
  buildSubscriptionStatementPdf,
  formatBusinessAddressForPdf,
  type StatementLineItem,
} from "./subscription-statement-of-account-pdf";
import { formatSubscriptionReceiptDate } from "../utils/subscription-receipt-date";

function subscriptionCreatedMs(data: Record<string, unknown>): number {
  const raw = data.createdAt;
  if (raw && typeof raw === "object" && "toDate" in raw) {
    try {
      const d = (raw as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.getTime();
    } catch {
      /* ignore */
    }
  }
  if (typeof raw === "string" || typeof raw === "number") {
    const ms = new Date(raw).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }
  return 0;
}

/** Include paid / payment periods (exclude free trial & zero-price free tiers). */
export function subscriptionRowForStatement(
  sub: Record<string, unknown>,
): boolean {
  const billingCycle = String(sub.billingCycle ?? "").toLowerCase();
  if (billingCycle === "trial") return false;

  const priceRaw = sub.price;
  const price = typeof priceRaw === "number" ? priceRaw : Number(priceRaw);
  if (!Number.isFinite(price) || price <= 0) return false;

  return true;
}

function mapLine(
  subscriptionId: string,
  sub: Record<string, unknown>,
): StatementLineItem {
  const dates = (sub.dates || {}) as Record<string, unknown>;
  const priceNum =
    typeof sub.price === "number" ? sub.price : Number(sub.price);

  return {
    subscriptionId,
    planName: String(sub.planName || ""),
    planCode: String(sub.planCode || ""),
    billingCycle: String(sub.billingCycle || ""),
    price: Number.isFinite(priceNum) ? priceNum : 0,
    paymentMethod: String(sub.paymentMethod || ""),
    paymentReference: String(sub.paymentReference || ""),
    paymentStatus: String(sub.paymentStatus || sub.status || ""),
    periodStart: formatSubscriptionReceiptDate(
      dates.activatedAt ?? sub.activatedAt,
    ),
    periodEnd: formatSubscriptionReceiptDate(
      dates.expiresAt ?? sub.expiresAt,
    ),
  };
}

export async function generateSubscriptionStatement(input: {
  businessId: string;
}): Promise<{ buffer: Buffer; filename: string }> {
  const { businessId } = input;

  const businessSnap = await db.collection("businesses").doc(businessId).get();
  if (!businessSnap.exists) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const biz = (businessSnap.data() ?? {}) as Record<string, unknown>;
  const subsSnap = await db
    .collection("businesses")
    .doc(businessId)
    .collection("subscriptions")
    .get();

  const rows = subsSnap.docs
    .map((doc) => ({
      id: doc.id,
      data: (doc.data() ?? {}) as Record<string, unknown>,
    }))
    .filter((row) => subscriptionRowForStatement(row.data))
    .sort(
      (a, b) =>
        subscriptionCreatedMs(b.data) - subscriptionCreatedMs(a.data),
    );

  if (rows.length === 0) {
    throw new Error("NO_SUBSCRIPTION_PAYMENTS");
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

  const generatedAtLabel = new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const buffer = await buildSubscriptionStatementPdf({
    businessName: String(biz.name || biz.businessName || ""),
    businessEmail: String(biz.email || ""),
    businessPhone: String(biz.phone || ""),
    businessAddress: formatBusinessAddressForPdf(biz),
    ownerDisplayName,
    ownerEmail,
    generatedAtLabel,
    lines: rows.map((row) => mapLine(row.id, row.data)),
  });

  return {
    buffer,
    filename: `SmartRefill-SOA-${businessId}.pdf`,
  };
}
