import { apiClient } from "@/lib/api-client";
import type { ActiveOwner } from "@/lib/dashboard/analytics";

export async function approveSubscription(
  businessId: string,
  subscriptionId: string,
): Promise<void> {
  await apiClient.post(
    `/dashboard/subscriptions/${businessId}/${subscriptionId}/approve`,
  );
}

export function applyApprovedSubscription(
  owners: ActiveOwner[],
  businessId: string,
  subscriptionId: string,
): ActiveOwner[] {
  return owners.map((owner) => {
    if (owner.id !== businessId) return owner;

    const subscriptions = (owner.subscriptions ?? []).map((sub) =>
      sub.id === subscriptionId ?
        {
          ...sub,
          status: "approved",
          paymentStatus: "approved",
          needsApproval: false,
        }
      : sub,
    );

    return {
      ...owner,
      subscriptions,
      pendingApprovals: subscriptions.filter((sub) => sub.needsApproval).length,
      paymentStatus: "approved",
    };
  });
}
