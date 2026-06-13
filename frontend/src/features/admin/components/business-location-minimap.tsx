"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { BusinessMapLocation } from "@/lib/dashboard/analytics";
import {
  createMapMarkerIcon,
  resolveMapMarkerStyle,
} from "@/lib/dashboard/map-marker-style";
import "leaflet/dist/leaflet.css";

function CenterMap({ location }: { location: BusinessMapLocation }) {
  const map = useMap();

  useEffect(() => {
    map.setView([location.lat, location.lng], 14, { animate: false });
  }, [location, map]);

  return null;
}

export function BusinessLocationMinimap({
  location,
}: {
  location: BusinessMapLocation;
}) {
  const markerStyle = resolveMapMarkerStyle(location);

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-zinc-200/80 [&_.leaflet-container]:z-0">
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={14}
        className="h-44 w-full"
        scrollWheelZoom={false}
        dragging
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CenterMap location={location} />
        <Marker
          position={[location.lat, location.lng]}
          icon={createMapMarkerIcon(location)}
        />
      </MapContainer>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/80 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
            style={{ backgroundColor: markerStyle.color }}
            aria-hidden
          />
          <span className="truncate text-xs font-medium text-zinc-700">
            {markerStyle.label}
          </span>
        </div>
        {location.address && (
          <span className="truncate text-[11px] text-zinc-500">
            {location.address}
          </span>
        )}
      </div>
    </div>
  );
}
