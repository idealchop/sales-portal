import L from "leaflet";
import type { BusinessMapLocation } from "@/lib/dashboard/analytics";

export type MapMarkerTier =
  | "scale"
  | "growth"
  | "starter"
  | "free-trial"
  | "inactive";

export type MapMarkerStyle = {
  tier: MapMarkerTier;
  color: string;
  label: string;
};

export const MAP_MARKER_LEGEND: MapMarkerStyle[] = [
  { tier: "scale", color: "#6B7F5E", label: "Scale" },
  { tier: "growth", color: "#059669", label: "Growth" },
  { tier: "starter", color: "#F59E0B", label: "Starter" },
  { tier: "free-trial", color: "#EA580C", label: "Free trial" },
  { tier: "inactive", color: "#9CA3AF", label: "Inactive 7d+" },
];

const MARKER_CACHE = new Map<string, L.DivIcon>();

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isOwnerInactive(
  lastActiveDay: string | undefined,
  now = new Date(),
): boolean {
  if (!lastActiveDay) return true;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  return lastActiveDay < dayKey(cutoff);
}

export function resolveMapMarkerTier(
  location: BusinessMapLocation,
): MapMarkerTier {
  if (isOwnerInactive(location.lastActiveDay)) return "inactive";

  const plan = `${location.planCode || ""} ${location.planName || ""}`
    .trim()
    .toLowerCase();

  if (plan.includes("scale")) return "scale";
  if (plan.includes("growth")) return "growth";
  if (plan.includes("trial") || plan.includes("free")) return "free-trial";
  if (plan.includes("starter")) return "starter";

  return "starter";
}

export function resolveMapMarkerStyle(
  location: BusinessMapLocation,
): MapMarkerStyle {
  const tier = resolveMapMarkerTier(location);
  return (
    MAP_MARKER_LEGEND.find((entry) => entry.tier === tier) ?? MAP_MARKER_LEGEND[2]
  );
}

function markerHtml(color: string): string {
  return `
    <div style="
      width: 36px;
      height: 36px;
      border-radius: 9999px;
      background: ${color};
      border: 2.5px solid #fff;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1V9.5" />
      </svg>
    </div>
  `;
}

export function createMapMarkerIcon(location: BusinessMapLocation): L.DivIcon {
  const { color } = resolveMapMarkerStyle(location);
  const cached = MARKER_CACHE.get(color);
  if (cached) return cached;

  const icon = L.divIcon({
    className: "sr-map-marker",
    html: markerHtml(color),
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
  MARKER_CACHE.set(color, icon);
  return icon;
}
