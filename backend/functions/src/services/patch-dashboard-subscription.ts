export type DashboardSubscriptionEdit = {
  businessId: string;
  subscriptionId: string;
  planCode?: string;
  planName?: string;
  expiresAt?: string;
  billingCycle?: string;
  price?: number;
  paymentStatus?: string;
};

type JsonRecord = Record<string, unknown>;

function patchSubscription(
  subscription: JsonRecord,
  edit: DashboardSubscriptionEdit,
): JsonRecord {
  if (subscription.id !== edit.subscriptionId) return subscription;
  return {
    ...subscription,
    ...(edit.planCode !== undefined ? { planCode: edit.planCode } : {}),
    ...(edit.planName !== undefined ? { planName: edit.planName } : {}),
    ...(edit.expiresAt !== undefined ? { expiresAt: edit.expiresAt } : {}),
    ...(edit.billingCycle !== undefined ? { billingCycle: edit.billingCycle } : {}),
    ...(edit.price !== undefined ? { price: edit.price } : {}),
    ...(edit.paymentStatus !== undefined ? { paymentStatus: edit.paymentStatus } : {}),
    ...(edit.billingCycle && edit.billingCycle !== "trial" ? { changeType: "override" } : {}),
  };
}

function patchOwner(owner: JsonRecord, edit: DashboardSubscriptionEdit): JsonRecord {
  if (owner.id !== edit.businessId) return owner;
  const subscriptions = Array.isArray(owner.subscriptions) ?
    owner.subscriptions.map((subscription) =>
      subscription && typeof subscription === "object" ?
        patchSubscription(subscription as JsonRecord, edit)
      : subscription,
    )
  : owner.subscriptions;
  return {
    ...owner,
    ...(edit.planName !== undefined ? { planName: edit.planName } : {}),
    ...(edit.paymentStatus !== undefined ? { paymentStatus: edit.paymentStatus } : {}),
    ...(edit.price !== undefined ? { monthlyRevenue: edit.price } : {}),
    subscriptions,
  };
}

function patchOwners(value: unknown, edit: DashboardSubscriptionEdit): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((owner) =>
    owner && typeof owner === "object" ? patchOwner(owner as JsonRecord, edit) : owner,
  );
}

function patchLocation(location: JsonRecord, edit: DashboardSubscriptionEdit): JsonRecord {
  if (location.id !== edit.businessId) return location;
  return {
    ...location,
    ...(edit.planName !== undefined ? { planName: edit.planName } : {}),
    ...(edit.planCode !== undefined ? { planCode: edit.planCode } : {}),
    ...(edit.billingCycle !== undefined ? { billingCycle: edit.billingCycle } : {}),
  };
}

/** Apply one subscription edit onto the cached dashboard payload. */
export function applySubscriptionEditToAnalytics<T>(
  data: T,
  edit: DashboardSubscriptionEdit,
): T {
  if (!data || typeof data !== "object") return data;
  const root = data as JsonRecord;
  const metrics =
    root.growthSalesMetrics && typeof root.growthSalesMetrics === "object" ?
      (root.growthSalesMetrics as JsonRecord)
    : null;
  const locations = Array.isArray(root.businessLocations) ?
    root.businessLocations.map((location) =>
      location && typeof location === "object" ?
        patchLocation(location as JsonRecord, edit)
      : location,
    )
  : root.businessLocations;

  return {
    ...root,
    businessLocations: locations,
    growthSalesMetrics: metrics ?
      {
        ...metrics,
        activeOwners: patchOwners(metrics.activeOwners, edit),
        subscriptionOwners: patchOwners(metrics.subscriptionOwners, edit),
      }
    : root.growthSalesMetrics,
  } as T;
}
