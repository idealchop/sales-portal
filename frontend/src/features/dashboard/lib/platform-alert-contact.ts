import { apiClient } from "@/lib/api-client";
import type { PlatformAlertContactStatus } from "@/lib/dashboard/analytics";

export async function updatePlatformAlertContactStatus(
  alertId: string,
  status: PlatformAlertContactStatus,
): Promise<{ alertId: string; status: PlatformAlertContactStatus }> {
  const json = await apiClient.patch<{
    data: { alertId: string; status: PlatformAlertContactStatus };
  }>(`/dashboard/platform-alerts/${encodeURIComponent(alertId)}/contact`, {
    status,
  });
  return json.data;
}
