"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ActiveOwner, BusinessMapLocation } from "@/lib/dashboard/analytics";
import { enrichMapLocations } from "@/lib/dashboard/enrich-map-locations";

const BusinessLocationsMap = dynamic(
  () =>
    import("./business-locations-map").then((mod) => mod.BusinessLocationsMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[min(68vh,560px)] min-h-[420px] animate-pulse rounded-xl bg-zinc-100" />
    ),
  },
);

export function BusinessLocationsMapLoader({
  locations,
  owners = [],
  onRefresh,
  isRefreshing = false,
}: {
  locations: BusinessMapLocation[];
  owners?: ActiveOwner[];
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
}) {
  const enrichedLocations = useMemo(
    () => enrichMapLocations(locations, owners),
    [locations, owners],
  );

  return (
    <BusinessLocationsMap
      locations={enrichedLocations}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
    />
  );
}
