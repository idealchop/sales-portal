import type { Timestamp } from "firebase-admin/firestore";

export type OwnerSubscriptionTimeline = "past" | "current" | "future";

export type OwnerAddonLineItem = {
  addonId?: string;
  code?: string;
  quantity?: number;
};

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
  addonLineItems?: OwnerAddonLineItem[];
  voucherCode?: string;
  affiliateCode?: string;
  affiliateDocId?: string;
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

export function extractAddonLineItems(
  sub: Record<string, unknown>,
): OwnerAddonLineItem[] {
  const top = sub.addonLineItems;
  const meta = sub.metadata;
  const nested =
    meta && typeof meta === "object" ?
      (meta as { addonLineItems?: unknown }).addonLineItems :
      undefined;
  const raw = Array.isArray(top) ? top : Array.isArray(nested) ? nested : [];

  const lines: OwnerAddonLineItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const addonId =
      typeof row.addonId === "string" && row.addonId.trim() ?
        row.addonId.trim() :
        undefined;
    const code =
      typeof row.code === "string" && row.code.trim() ?
        row.code.trim() :
        undefined;
    if (!addonId && !code) continue;
    const quantity = Number(row.quantity);
    lines.push({
      addonId,
      code,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : undefined,
    });
  }
  return lines;
}

function readTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

export function extractOfferAttribution(sub: Record<string, unknown>): {
  voucherCode?: string;
  affiliateCode?: string;
  affiliateDocId?: string;
} {
  const meta =
    sub.metadata && typeof sub.metadata === "object" ?
      (sub.metadata as Record<string, unknown>) :
      {};
  const voucherCode =
    readTrimmedString(sub.voucherCode) || readTrimmedString(meta.voucherCode);
  const affiliateCode =
    readTrimmedString(sub.affiliateCode) || readTrimmedString(meta.affiliateCode);
  const affiliateDocId =
    readTrimmedString(sub.affiliateDocId) ||
    readTrimmedString(meta.affiliateDocId);
  return {
    voucherCode,
    affiliateCode,
    affiliateDocId,
  };
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

function subscriptionActivityMs(sub: {
  activatedAt?: string;
  createdAt?: string;
  activatesAt?: string;
}): number {
  for (const value of [sub.activatedAt, sub.createdAt, sub.activatesAt]) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

/**
 * Latest plan the workspace is actually on now — includes Free / trial.
 * Prefer newest status=active (any price); do not keep an older paid Scale when
 * a newer Free row is already active.
 */
export function pickLatestCurrentPlanSubscription(
  subscriptions: OwnerSubscription[],
  now = Date.now(),
): OwnerSubscription | undefined {
  const pickNewest = (rows: OwnerSubscription[]) => {
    if (rows.length === 0) return undefined;
    return rows.reduce((latest, sub) =>
      subscriptionActivityMs(sub) > subscriptionActivityMs(latest) ? sub : latest,
    );
  };

  const activeNow = subscriptions.filter((sub) => {
    if (sub.status.toLowerCase() !== "active") return false;
    if (isPastStatus(sub.status)) return false;
    if (isExpiredByDate(sub, now)) return false;
    return true;
  });
  const fromActive = pickNewest(activeNow);
  if (fromActive) return fromActive;

  const current = subscriptions.find((sub) => sub.timeline === "current");
  if (current && !isExpiredByDate(current, now) && !isPastStatus(current.status)) {
    return current;
  }

  return pickNewest(
    subscriptions.filter(
      (sub) =>
        !isPastStatus(sub.status) &&
        sub.status.toLowerCase() !== "scheduled" &&
        !isExpiredByDate(sub, now),
    ),
  );
}

/**
 * Latest live paid plan (status=active, paid, not expired).
 * Prefer {@link pickLatestCurrentPlanSubscription} for “what plan are they on?” —
 * this helper is only for paid-revenue math when the current plan is already known paid.
 */
export function pickLatestLivePaidSubscription(
  subscriptions: OwnerSubscription[],
  now = Date.now(),
): OwnerSubscription | undefined {
  const current = pickLatestCurrentPlanSubscription(subscriptions, now);
  if (
    current &&
    current.status.toLowerCase() === "active" &&
    Number(current.price) > 0 &&
    String(current.billingCycle || "").toLowerCase() !== "trial"
  ) {
    return current;
  }
  return undefined;
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
    const addonLines = extractAddonLineItems(data);
    const offer = extractOfferAttribution(data);

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
      addonLineItems: addonLines.length > 0 ? addonLines : undefined,
      voucherCode: offer.voucherCode,
      affiliateCode: offer.affiliateCode,
      affiliateDocId: offer.affiliateDocId,
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
