"use client";

import dynamic from "next/dynamic";
import type { BusinessMapLocation } from "@/lib/dashboard/analytics";

const BusinessLocationMinimap = dynamic(
  () =>
    import("./business-location-minimap").then(
      (mod) => mod.BusinessLocationMinimap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 animate-pulse rounded-lg bg-zinc-100 ring-1 ring-zinc-200/80" />
    ),
  },
);

export function BusinessLocationMinimapLoader({
  location,
}: {
  location: BusinessMapLocation;
}) {
  return <BusinessLocationMinimap location={location} />;
}
