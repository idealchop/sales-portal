"use client";

import type { ActiveOwner, BusinessMapLocation } from "@/lib/dashboard/analytics";
import { BusinessLocationsMapLoader } from "@/features/dashboard/components/business-locations-map-loader";
import { ActiveOwnersPanel } from "@/features/dashboard/components/active-owners-panel";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { DashboardAnalyticsRefresh } from "@/hooks/use-dashboard-analytics";
import { useMapLocations } from "@/hooks/use-map-locations";

export function WorkspaceMapOwnersSection({
  locations,
  owners,
  canApprove,
  onRefresh,
}: {
  locations: BusinessMapLocation[];
  owners: ActiveOwner[];
  canApprove: boolean;
  onRefresh?: DashboardAnalyticsRefresh;
}) {
  const {
    locations: mapLocations,
    owners: mapOwners,
    refreshMap,
    isRefreshing: isMapRefreshing,
    error: mapError,
  } = useMapLocations(locations, owners);

  const onboarded = mapLocations.filter((item) => item.onboardingComplete).length;
  const highHealth = mapLocations.filter((item) => item.healthTier === "high").length;

  return (
    <section className="space-y-3">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <Card className="overflow-hidden border-teal-100 shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-50 bg-gradient-to-r from-teal-50/80 to-white px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-teal-100 p-2 text-teal-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Map</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium tabular-nums text-teal-800 ring-1 ring-teal-100">
                  {mapLocations.length}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium tabular-nums text-zinc-700 ring-1 ring-zinc-100">
                  {onboarded}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium tabular-nums text-emerald-700 ring-1 ring-emerald-100">
                  {highHealth}
                </span>
              </div>
            </div>
            <div className="p-4 pt-3">
              {mapError && (
                <p className="mb-2 text-sm text-red-600">{mapError}</p>
              )}
              <BusinessLocationsMapLoader
                locations={mapLocations}
                owners={mapOwners}
                onRefresh={refreshMap}
                isRefreshing={isMapRefreshing}
              />
            </div>
          </CardContent>
        </Card>

        <ActiveOwnersPanel
          owners={owners}
          canApprove={canApprove}
          onRefresh={onRefresh}
        />
      </div>
    </section>
  );
}
