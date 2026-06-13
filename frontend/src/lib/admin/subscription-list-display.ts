import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type SubscriptionPaymentBadge = {
  label: string;
  className: string;
};

export type ParsedSubscriptionListRow = {
  planTitle: string;
  reference: string;
  dateLabel: string;
  priceLabel: string;
  paymentBadge: SubscriptionPaymentBadge;
};

function subscriptionTimestampMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const seconds = Number((value as { _seconds?: number })._seconds);
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  }
  return 0;
}

function subscriptionCreatedMs(doc: UserFirestoreDocumentRow): number {
  return subscriptionTimestampMs(doc.data.createdAt);
}

function formatSubscriptionListDate(value: unknown): string {
  const ms = subscriptionTimestampMs(value);
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function getSubscriptionPaymentBadge(
  paymentStatus: unknown,
  status: unknown,
): SubscriptionPaymentBadge {
  const payment = String(paymentStatus || "").toLowerCase();
  const planStatus = String(status || "").toLowerCase();

  if (
    payment === "verified" ||
    payment === "approved" ||
    payment === "paid"
  ) {
    return {
      label: "Paid",
      className: "border-none bg-emerald-100 text-emerald-700",
    };
  }

  if (
    payment === "pending_verification" ||
    payment === "pending" ||
    planStatus === "pending"
  ) {
    return {
      label: "Verifying",
      className: "border-none bg-orange-100 text-orange-700",
    };
  }

  if (payment === "failed" || planStatus === "failed") {
    return {
      label: "Failed",
      className: "border-none bg-red-100 text-red-700",
    };
  }

  if (planStatus === "active") {
    return {
      label: "Active",
      className: "border-none bg-blue-100 text-blue-700",
    };
  }

  const fallback = String(paymentStatus || status || "Unknown")
    .replaceAll("_", " ")
    .trim();
  return {
    label: fallback || "Unknown",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
  };
}

export function parseSubscriptionListRow(
  doc: UserFirestoreDocumentRow,
): ParsedSubscriptionListRow {
  const data = doc.data;
  const planName = String(data.planName || data.planCode || "Plan");
  const dates =
    data.dates && typeof data.dates === "object" ?
      (data.dates as Record<string, unknown>)
    : {};
  const dateValue = dates.activatedAt || dates.activatesAt || data.createdAt;
  const price = Number(data.price || 0);
  const billingCycle =
    typeof data.billingCycle === "string" ? data.billingCycle : undefined;

  return {
    planTitle: `${planName} Plan Subscription`,
    reference: String(data.paymentReference || doc.documentId).toUpperCase(),
    dateLabel: formatSubscriptionListDate(dateValue),
    priceLabel:
      billingCycle === "trial" || price <= 0 ?
        "₱0"
      : `₱${price.toLocaleString("en-PH")}`,
    paymentBadge: getSubscriptionPaymentBadge(data.paymentStatus, data.status),
  };
}

export function sortSubscriptionDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort(
    (a, b) => subscriptionCreatedMs(b) - subscriptionCreatedMs(a),
  );
}

export function subscriptionLatestDocumentId(
  documents: UserFirestoreDocumentRow[],
): string | undefined {
  return sortSubscriptionDocuments(documents)[0]?.documentId;
}
