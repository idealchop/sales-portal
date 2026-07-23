import { apiClient } from "@/lib/api-client";

export async function recordInactiveOwnerContact(
  businessId: string,
): Promise<{ businessId: string; contactedAt: string }> {
  const json = await apiClient.patch<{
    data: { businessId: string; contactedAt: string };
  }>(`/dashboard/inactive-owners/${encodeURIComponent(businessId)}/contact`, {});
  return json.data;
}
