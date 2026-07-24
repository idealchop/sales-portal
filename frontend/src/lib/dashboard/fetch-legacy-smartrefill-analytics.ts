import { apiClient } from "@/lib/api-client";
import type {
  LegacySmartRefillAnalytics,
  LegacySmartRefillAnalyticsFetchResult,
  LegacySmartRefillStationDetail,
} from "@/lib/dashboard/legacy-smartrefill-analytics";

type AnalyticsResponse = {
  data: LegacySmartRefillAnalytics;
  meta?: { computedAt?: string };
};

type StationDetailResponse = {
  data: LegacySmartRefillStationDetail;
};

export async function fetchLegacySmartRefillAnalytics(options?: {
  refresh?: boolean;
}): Promise<LegacySmartRefillAnalyticsFetchResult> {
  const query = options?.refresh ? "?refresh=1" : "";
  const response = await apiClient.get<AnalyticsResponse>(
    `/dashboard/smartrefill-old/analytics${query}`,
  );
  return {
    data: response.data,
    computedAt: response.meta?.computedAt ?? new Date().toISOString(),
  };
}

export async function fetchLegacySmartRefillStationDetail(input: {
  stationId: string;
  offset?: number;
  limit?: number;
}): Promise<LegacySmartRefillStationDetail> {
  const params = new URLSearchParams();
  if (input.offset != null) params.set("offset", String(input.offset));
  if (input.limit != null) params.set("limit", String(input.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get<StationDetailResponse>(
    `/dashboard/smartrefill-old/stations/${encodeURIComponent(input.stationId)}${query}`,
  );
  return response.data;
}

export async function ignoreLegacySmartRefillStation(
  stationId: string,
): Promise<void> {
  await apiClient.post(
    `/dashboard/smartrefill-old/stations/${encodeURIComponent(stationId)}/ignore`,
  );
}

export async function contactLegacySmartRefillStation(
  stationId: string,
  options?: {
    toEmail?: string | null;
    recipientName?: string | null;
    businessName?: string | null;
  },
): Promise<{
  stationId: string;
  triageStatus: "contacted";
  outreach?: {
    sent: boolean;
    skipped: boolean;
    messageId?: string;
    subject: string;
    brevoTag: string;
  };
}> {
  const json = await apiClient.post<{
    data: {
      stationId: string;
      triageStatus: "contacted";
      outreach?: {
        sent: boolean;
        skipped: boolean;
        messageId?: string;
        subject: string;
        brevoTag: string;
      };
    };
  }>(`/dashboard/smartrefill-old/stations/${encodeURIComponent(stationId)}/contact`, {
    toEmail: options?.toEmail,
    recipientName: options?.recipientName,
    businessName: options?.businessName,
  });
  return json.data;
}

export async function restoreLegacySmartRefillStation(
  stationId: string,
): Promise<void> {
  await apiClient.post(
    `/dashboard/smartrefill-old/stations/${encodeURIComponent(stationId)}/restore`,
  );
}

export async function deleteLegacySmartRefillStation(
  stationId: string,
): Promise<void> {
  await apiClient.delete(
    `/dashboard/smartrefill-old/stations/${encodeURIComponent(stationId)}`,
  );
}

export async function bulkDeleteLegacySmartRefillStations(
  stationIds: string[],
): Promise<{
  deletedIds: string[];
  missingIds: string[];
  failed: Array<{ stationId: string; error: string }>;
}> {
  const json = await apiClient.post<{
    data: {
      deletedIds: string[];
      missingIds: string[];
      failed: Array<{ stationId: string; error: string }>;
    };
  }>("/dashboard/smartrefill-old/stations/bulk-delete", { stationIds });
  return json.data;
}

export async function bulkIgnoreLegacySmartRefillStations(
  stationIds: string[],
): Promise<{
  updatedIds: string[];
  failed: Array<{ stationId: string; error: string }>;
}> {
  const json = await apiClient.post<{
    data: {
      updatedIds: string[];
      failed: Array<{ stationId: string; error: string }>;
    };
  }>("/dashboard/smartrefill-old/stations/bulk-ignore", { stationIds });
  return json.data;
}

export async function bulkContactLegacySmartRefillStations(
  stationIds: string[],
): Promise<{
  updatedIds: string[];
  failed: Array<{ stationId: string; error: string }>;
}> {
  const json = await apiClient.post<{
    data: {
      updatedIds: string[];
      failed: Array<{ stationId: string; error: string }>;
    };
  }>("/dashboard/smartrefill-old/stations/bulk-contact", { stationIds });
  return json.data;
}
