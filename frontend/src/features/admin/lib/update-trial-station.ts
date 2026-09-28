import { apiClient } from "@/lib/api-client";

export async function updateTrialStation(input: {
  businessId: string;
  subscriptionId: string;
  planCode: string;
  expiresAt: string;
  note: string;
}): Promise<{
  planCode: string;
  planName: string;
  expiresAt: string;
  billingCycle: string;
  price: number;
}> {
  return apiClient.patch(
    `/dashboard/subscriptions/${input.businessId}/${input.subscriptionId}/trial`,
    {
      intent: "overwrite",
      planCode: input.planCode,
      expiresAt: input.expiresAt,
      note: input.note,
    },
  );
}

export async function extendSubscription(input: {
  businessId: string;
  subscriptionId: string;
  expiresAt: string;
}): Promise<{ expiresAt: string }> {
  return apiClient.patch(
    `/dashboard/subscriptions/${input.businessId}/${input.subscriptionId}/trial`,
    {
      intent: "extend",
      expiresAt: input.expiresAt,
    },
  );
}
