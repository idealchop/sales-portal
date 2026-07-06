"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import type { BusinessMapLocation, DashboardAnalytics } from "@/lib/dashboard/analytics";
import { enrichMapLocations } from "@/lib/dashboard/enrich-map-locations";
import { DASHBOARD_APPS } from "@/features/dashboard/config/dashboard-apps";

const BusinessLocationsMap = dynamic(
  () =>
    import("@/features/dashboard/components/business-locations-map").then(
      (mod) => mod.BusinessLocationsMap,
    ),
  { loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-zinc-200" /> },
);

function withAppLabels(locations: BusinessMapLocation[]): BusinessMapLocation[] {
  return locations.map((location) => ({
    ...location,
    appId: "smartrefill",
    appLabel: "SmartRefill",
  }));
}

export function CombinedAppsMapSection({
  data,
  onRefresh,
  isRefreshing,
}: {
  data: DashboardAnalytics;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const locations = useMemo(
    () =>
      withAppLabels(
        enrichMapLocations(
          data.businessLocations,
          data.growthSalesMetrics.activeOwners,
        ),
      ),
    [data.businessLocations, data.growthSalesMetrics.activeOwners],
  );

  return (
    <DashboardSection
      id="platform-map"
      title="Map"
      count={locations.length}
    >
      <div className="mb-2 flex flex-wrap gap-2">
        {DASHBOARD_APPS.filter((app) => app.id !== "platform").map((app) => (
          <Badge key={app.id} className={app.accentClass}>
            {app.shortLabel}
            {app.id === "smartrefill" ? ` ${locations.length}` : ""}
          </Badge>
        ))}
      </div>
      <BusinessLocationsMap
        locations={locations}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />
    </DashboardSection>
  );
}
