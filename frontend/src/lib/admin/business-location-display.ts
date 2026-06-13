import type { DataManagementActiveSubscription } from "@/lib/admin/data-management";
import type { BusinessMapLocation } from "@/lib/dashboard/analytics";

export type BusinessMapCoordinates = {
  lat: number;
  lng: number;
  address?: string;
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function parseBusinessMapCoordinates(
  data: Record<string, unknown>,
): BusinessMapCoordinates | null {
  const location = data.location;
  if (location && typeof location === "object" && !Array.isArray(location)) {
    const loc = location as Record<string, unknown>;
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return {
          lat,
          lng,
          address: readString(loc.address) || undefined,
        };
      }
    }
  }

  const rootLat = Number(data.lat);
  const rootLng = Number(data.lng);
  if (Number.isFinite(rootLat) && Number.isFinite(rootLng)) {
    if (rootLat >= -90 && rootLat <= 90 && rootLng >= -180 && rootLng <= 180) {
      const addressParts = [
        readString(data.address),
        readString(data.city),
        readString(data.province),
      ].filter(Boolean);
      return {
        lat: rootLat,
        lng: rootLng,
        address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
      };
    }
  }

  return null;
}

export function buildBusinessMapLocation(input: {
  businessId: string;
  name: string;
  data: Record<string, unknown>;
  activeSubscription?: DataManagementActiveSubscription;
}): BusinessMapLocation | null {
  const coords = parseBusinessMapCoordinates(input.data);
  if (!coords) return null;

  const today = new Date().toISOString().slice(0, 10);

  return {
    id: input.businessId,
    name: input.name,
    lat: coords.lat,
    lng: coords.lng,
    address: coords.address,
    onboardingComplete: input.data.onboardingComplete === true,
    planName: input.activeSubscription?.planName,
    planCode: input.activeSubscription?.planCode,
    lastActiveDay: today,
  };
}
