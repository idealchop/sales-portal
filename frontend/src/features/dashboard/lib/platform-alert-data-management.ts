import {
  businessInfoPath,
  dataManagementPath,
} from "@/lib/admin/data-management-url-state";
import type { PlatformAlert } from "@/lib/dashboard/analytics";

/** Resolve Admin → Data management deep link for an alert (business page or search). */
export function resolvePlatformAlertDataManagementPath(
  item: PlatformAlert,
  returnTo: string,
): string | null {
  if (item.businessId) {
    return businessInfoPath(item.businessId, returnTo, item.userId);
  }

  const query = (item.email || item.title || "").trim();
  if (!query) return null;

  return dataManagementPath({
    tab: "owners",
    q: query,
    status: "all",
    staffRole: "all",
    subscription: "all",
    sortBy: "lastSignIn",
    sortOrder: "desc",
    page: 1,
    pageSize: 10,
  });
}
