import { apiClient } from "@/lib/api-client";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export async function bulkUpdateCustomerStatus(
  businessId: string,
  customerIds: string[],
  status: "active" | "inactive",
): Promise<UserFirestoreDocumentRow[]> {
  const response = await apiClient.patch<{
    data: { documents: UserFirestoreDocumentRow[] };
  }>(`/admin/businesses/${businessId}/customers/bulk-status`, {
    customerIds,
    status,
  });
  return response.data.documents;
}
