import { apiClient } from "@/lib/api-client";

export type CommunityDispatchRequestRow = {
  id: string;
  referenceId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  metaPsid: string;
  parsed?: {
    name?: string;
    qty?: number;
    delivery?: boolean;
    number?: string;
    location?: string;
    email?: string;
  };
  geocode?: { formattedAddress?: string };
  searchRadiusKm?: number;
  stationsFoundEver?: boolean;
  assignedBusinessId?: string;
  smartrefillSubmissionId?: string;
  submissionReferenceId?: string;
  routingNotes?: string;
};

export type CommunityDispatchOfferRow = {
  id: string;
  businessId: string;
  status: string;
  rank: number;
  expiresAt: string | null;
  declineReason?: string;
};

export type CommunityDispatchMetrics = {
  intakeToday: number;
  intakeLast7Days: number;
  openCount: number;
  acceptedCount: number;
  acceptRatePercent: number | null;
  avgAcceptMinutes: number | null;
  escalatedCount: number;
  topStations: Array<{ businessId: string; businessName: string; accepts: number }>;
};

export async function fetchCommunityDispatchRequests(params?: {
  status?: string;
  limit?: number;
}): Promise<CommunityDispatchRequestRow[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  const response = await apiClient.get<{ data: CommunityDispatchRequestRow[] }>(
    `/dashboard/community-dispatch/requests${query ? `?${query}` : ""}`,
  );
  return response.data;
}

export async function cancelCommunityDispatchRequest(
  requestId: string,
): Promise<void> {
  await apiClient.post(`/dashboard/community-dispatch/requests/${requestId}/cancel`);
}

export async function assignCommunityDispatchRequest(
  requestId: string,
  businessId: string,
): Promise<void> {
  await apiClient.post(
    `/dashboard/community-dispatch/requests/${requestId}/assign`,
    { businessId },
  );
}

export async function fetchCommunityDispatchRequestDetail(
  requestId: string,
): Promise<{
  request: CommunityDispatchRequestRow;
  offers: CommunityDispatchOfferRow[];
}> {
  const response = await apiClient.get<{
    data: {
      request: CommunityDispatchRequestRow;
      offers: CommunityDispatchOfferRow[];
    };
  }>(`/dashboard/community-dispatch/requests/${requestId}`);
  return response.data;
}
