import type {
  DashboardForecasts,
  DashboardForecastItem,
} from "@/lib/dashboard/analytics";
import type { DashboardAppId } from "@/features/dashboard/config/dashboard-apps";

export function forecastsForApp(
  forecasts: DashboardForecasts | undefined,
  appId: DashboardAppId,
): DashboardForecastItem[] {
  if (!forecasts) return [];
  if (appId === "platform") return forecasts.platform;
  if (appId === "smartrefill") return forecasts.smartrefill;
  if (appId === "sales-portal") return forecasts.salesPortal;
  return [];
}
