import type { ActiveOwner, OwnerSubscription } from "@/lib/dashboard/analytics";

export type SubscriptionApprovalItem = {
  businessId: string;
  businessName: string;
  ownerEmail?: string;
  subscription: OwnerSubscription;
};

export function buildSubscriptionApprovalQueue(
  owners: ActiveOwner[],
): SubscriptionApprovalItem[] {
  const items: SubscriptionApprovalItem[] = [];

  for (const owner of owners) {
    for (const subscription of owner.subscriptions ?? []) {
      if (!subscription.needsApproval) continue;
      items.push({
        businessId: owner.id,
        businessName: owner.businessName,
        ownerEmail: owner.ownerEmail,
        subscription,
      });
    }
  }

  return items.sort((a, b) =>
    String(b.subscription.createdAt ?? "").localeCompare(
      String(a.subscription.createdAt ?? ""),
    ),
  );
}
