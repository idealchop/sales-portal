"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Maximize2, Minimize2, RefreshCw, X } from "lucide-react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BusinessMapLocation } from "@/lib/dashboard/analytics";
import {
  WORKSPACE_HEALTH_LABELS,
} from "@/lib/dashboard/workspace-health";
import {
  createMapMarkerIcon,
  isOwnerInactive,
  MAP_MARKER_LEGEND,
  resolveMapMarkerStyle,
} from "@/lib/dashboard/map-marker-style";
import "leaflet/dist/leaflet.css";

function FitMapBounds({ locations }: { locations: BusinessMapLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;
    if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(
      locations.map((location) => [location.lat, location.lng]),
    );
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14 });
  }, [locations, map]);

  return null;
}

function MapClickDismiss({ onDismiss }: { onDismiss: () => void }) {
  useMapEvents({
    click: () => onDismiss(),
  });
  return null;
}

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-100 bg-zinc-50/80 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Legend
      </span>
      {MAP_MARKER_LEGEND.map((entry) => (
        <div key={entry.tier} className="flex items-center gap-2">
          <span
            className="inline-flex h-4 w-4 shrink-0 rounded-full ring-2 ring-white"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span className="text-xs text-zinc-600">{entry.label}</span>
        </div>
      ))}
    </div>
  );
}

function LocationAside({
  location,
  onClose,
}: {
  location: BusinessMapLocation;
  onClose: () => void;
}) {
  const markerStyle = resolveMapMarkerStyle(location);
  const inactive = isOwnerInactive(location.lastActiveDay);

  function handleHowAreYou() {
    if (!location.ownerEmail) return;
    const subject = encodeURIComponent("How are you?");
    const body = encodeURIComponent(
      `Hi ${location.name},\n\nHow are things going with SmartRefill? Let us know if you need any help.\n`,
    );
    window.location.href = `mailto:${location.ownerEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <aside className="absolute bottom-3 left-3 z-[1000] w-[min(100%,280px)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: markerStyle.color }}
            />
            <p className="truncate font-semibold text-foreground">
              {location.name}
            </p>
            {location.appLabel ?
              <Badge className="mt-1 bg-teal-50 text-teal-800">
                {location.appLabel}
              </Badge>
            : null}
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {markerStyle.label}
            {inactive ? " · No login in 7+ days" : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-3 text-sm">
        {location.address && (
          <p className="text-xs leading-relaxed text-zinc-600">
            {location.address}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <dt className="text-zinc-500">Plan</dt>
          <dd className="font-medium text-foreground">
            {location.planName || "—"}
          </dd>
          <dt className="text-zinc-500">Customers</dt>
          <dd className="font-medium text-foreground">
            {location.customers?.toLocaleString() ?? "—"}
          </dd>
          <dt className="text-zinc-500">Tx / 30d</dt>
          <dd className="font-medium text-foreground">
            {location.transactionsLast30Days ?? "—"}
          </dd>
          <dt className="text-zinc-500">Health</dt>
          <dd className="font-medium text-foreground">
            {location.healthTier ?
              WORKSPACE_HEALTH_LABELS[location.healthTier]
            : "—"}
          </dd>
          <dt className="text-zinc-500">Last active</dt>
          <dd className="font-medium text-foreground">
            {location.lastActiveDay || "—"}
          </dd>
          {location.communityDispatchEnabled ?
            <>
              <dt className="text-zinc-500">Community</dt>
              <dd className="font-medium text-foreground">
                {location.communityPublicName || "Enrolled"}
                {(location.pendingCommunityOffers ?? 0) > 0 ?
                  ` · ${location.pendingCommunityOffers} pending offer${location.pendingCommunityOffers === 1 ? "" : "s"}`
                : ""}
              </dd>
            </>
          : null}
        </dl>

        {location.ownerEmail && (
          <p className="truncate text-xs text-zinc-500">{location.ownerEmail}</p>
        )}

        <p className="text-xs text-zinc-400">
          {location.onboardingComplete ? "Onboarded" : "Setup in progress"}
        </p>

        <Button
          size="sm"
          className="h-9 w-full"
          disabled={!location.ownerEmail}
          onClick={handleHowAreYou}
        >
          How are you?
        </Button>
      </div>
    </aside>
  );
}

export function BusinessLocationsMap({
  locations,
  onRefresh,
  isRefreshing = false,
}: {
  locations: BusinessMapLocation[];
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<BusinessMapLocation | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!shellRef.current) return;
    if (document.fullscreenElement === shellRef.current) {
      await document.exitFullscreen();
      return;
    }
    await shellRef.current.requestFullscreen();
  }, []);

  const handleRefresh = useCallback(() => {
    void onRefresh?.();
  }, [onRefresh]);

  const displayedLocation =
    selected ?
      locations.find((location) => location.id === selected.id) ?? null
    : null;

  if (locations.length === 0) {
    return (
      <div className="flex h-[min(68vh,560px)] min-h-[420px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-zinc-50 text-sm text-[var(--muted-foreground)]">
        No workspace locations with coordinates yet.
      </div>
    );
  }

  const center: [number, number] = [
    locations.reduce((sum, item) => sum + item.lat, 0) / locations.length,
    locations.reduce((sum, item) => sum + item.lng, 0) / locations.length,
  ];

  return (
    <div
      ref={shellRef}
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-inner [&_.leaflet-container]:z-0"
    >
      <div className="relative">
        <MapContainer
          center={
            locations.length === 1 ?
              [locations[0].lat, locations[0].lng]
            : center
          }
          zoom={locations.length === 1 ? 13 : 8}
          className="h-[min(68vh,560px)] min-h-[420px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMapBounds locations={locations} />
          <MapClickDismiss onDismiss={() => setSelected(null)} />
          {locations.map((location) => (
            <Marker
              key={location.id}
              position={[location.lat, location.lng]}
              icon={createMapMarkerIcon(location)}
              eventHandlers={{
                click: (event) => {
                  L.DomEvent.stopPropagation(event.originalEvent);
                  setSelected(location);
                },
              }}
            />
          ))}
        </MapContainer>

        <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex flex-col gap-1.5">
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="pointer-events-auto h-9 w-9 bg-white p-0 shadow-md"
              aria-label="Refresh map"
              disabled={isRefreshing}
              onClick={handleRefresh}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pointer-events-auto h-9 w-9 bg-white p-0 shadow-md"
            aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ?
              <Minimize2 className="h-4 w-4" />
            : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {displayedLocation && (
          <LocationAside
            location={displayedLocation}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      <MapLegend />
    </div>
  );
}
