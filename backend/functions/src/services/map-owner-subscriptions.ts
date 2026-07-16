import type { Timestamp } from "firebase-admin/firestore";

export type OwnerSubscriptionTimeline = "past" | "current" | "future";

export type OwnerSubscription = {
  id: string;
  planName: string;
  planCode?: string;
  status: string;
  billingCycle?: string;
  price: number;
  paymentStatus?: string;
  paymentReference?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  attachmentUrl?: string;
  timeline: OwnerSubscriptionTimeline;
  createdAt?: string;
  activatedAt?: string;
  activatesAt?: string;
  expiresAt?: string;
  cancelledAt?: string;
  cancelAtPeriodEnd: boolean;
  changeType?: string;
  downgradeReasonCode?: string;
  downgradeReasonDetail?: string;
  needsApproval: boolean;
  isDowngrade: boolean;
  isCancellation: boolean;
};

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    return undefined;
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const seconds = Number((value as { _seconds?: number })._seconds);
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toISOString();
    }
  }
  if (typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return undefined;
}

function isPastStatus(status: string): boolean {
  return ["superseded", "expired", "cancelled", "canceled"].includes(status);
}

function isExpiredByDate(
  row: { expiresAt?: string; status: string },
  now: number,
): boolean {
  if (!row.expiresAt) return false;
  const expiresMs = new Date(row.expiresAt).getTime();
  if (Number.isNaN(expiresMs) || expiresMs >= now) return false;
  return row.status !== "grace_period";
}

function needsApprovalRow(data: Record<string, unknown>): boolean {
  const status = String(data.status || "");
  const paymentStatus = String(data.paymentStatus || "");
  if (isPastStatus(status)) return false;
  return (
    paymentStatus === "pending_verification" ||
    paymentStatus === "pending" ||
    status === "pending"
  );
}

type SubscriptionSortRow = OwnerSubscription & {
  _activatesMs: number;
  _createdMs: number;
};

function withoutSortFields(
  row: SubscriptionSortRow,
): Omit<SubscriptionSortRow, "_activatesMs" | "_createdMs"> {
  const copy = { ...row };
  delete (copy as Partial<SubscriptionSortRow>)._activatesMs;
  delete (copy as Partial<SubscriptionSortRow>)._createdMs;
  return copy;
}

export function mapOwnerSubscriptions(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
): OwnerSubscription[] {
  const now = Date.now();
  const rows = docs.map((doc) => {
    const data = doc.data();
    const status = String(data.status || "unknown");
    const metadata =
      data.metadata && typeof data.metadata === "object" ?
        (data.metadata as Record<string, unknown>) :
        {};
    const dates =
      data.dates && typeof data.dates === "object" ?
        (data.dates as Record<string, unknown>) :
        {};
    const activatesAt = toIso(dates.activatesAt);
    const activatesMs = activatesAt ? new Date(activatesAt).getTime() : 0;
    const cancelAtPeriodEnd = data.cancelAtPeriodEnd === true;

    return {
      id: doc.id,
      planName: String(data.planName || data.planCode || "Plan"),
      planCode: typeof data.planCode === "string" ? data.planCode : undefined,
      status,
      billingCycle:
        typeof data.billingCycle === "string" ? data.billingCycle : undefined,
      price: Number(data.price || 0),
      paymentStatus:
        typeof data.paymentStatus === "string" ? data.paymentStatus : undefined,
      paymentReference:
        typeof data.paymentReference === "string" ?
          data.paymentReference :
          undefined,
      paymentMethod:
        typeof data.paymentMethod === "string" ? data.paymentMethod : undefined,
      receiptUrl:
        typeof data.receiptUrl === "string" ? data.receiptUrl : undefined,
      attachmentUrl:
        typeof data.attachmentUrl === "string" ? data.attachmentUrl : undefined,
      timeline: "past" as OwnerSubscriptionTimeline,
      createdAt: toIso(data.createdAt),
      activatedAt: toIso(dates.activatedAt),
      activatesAt,
      expiresAt: toIso(dates.expiresAt),
      cancelledAt: toIso(dates.cancelledAt),
      cancelAtPeriodEnd,
      changeType:
        typeof metadata.changeType === "string" ? metadata.changeType : undefined,
      downgradeReasonCode:
        typeof metadata.downgradeReasonCode === "string" ?
          metadata.downgradeReasonCode :
          undefined,
      downgradeReasonDetail:
        typeof metadata.downgradeReasonDetail === "string" ?
          metadata.downgradeReasonDetail :
          undefined,
      needsApproval: needsApprovalRow(data),
      isDowngrade: metadata.changeType === "downgrade",
      isCancellation:
        cancelAtPeriodEnd || status === "cancelled" || status === "canceled",
      _activatesMs: activatesMs,
      _createdMs: data.createdAt ? new Date(toIso(data.createdAt) || 0).getTime() : 0,
    };
  });

  rows.sort((a, b) => b._createdMs - a._createdMs);

  let currentId: string | undefined;
  const futureCandidate = rows.find(
    (row) =>
      row.status === "scheduled" ||
      (row._activatesMs > now && !isPastStatus(row.status)),
  );
  const currentCandidate = rows.find(
    (row) =>
      !isPastStatus(row.status) &&
      row.status !== "scheduled" &&
      !(row._activatesMs > now) &&
      !isExpiredByDate(row, now),
  );
  if (currentCandidate) currentId = currentCandidate.id;
  else if (futureCandidate) currentId = futureCandidate.id;

  return rows.map((row) => {
    const activatesMs = row._activatesMs;
    const subscription = withoutSortFields(row);
    let timeline: OwnerSubscriptionTimeline = "past";

    if (isExpiredByDate(subscription, now) || isPastStatus(subscription.status)) {
      timeline = "past";
    } else if (subscription.id === currentId && subscription.status !== "scheduled") {
      timeline = "current";
    } else if (
      subscription.status === "scheduled" ||
      (activatesMs > now && !isPastStatus(subscription.status))
    ) {
      timeline = "future";
    } else if (!isPastStatus(subscription.status) && subscription.id === currentId) {
      timeline = "current";
    } else if (!isPastStatus(subscription.status) && subscription.needsApproval) {
      timeline = subscription.status === "scheduled" ? "future" : "current";
    }

    return { ...subscription, timeline };
  });
}
