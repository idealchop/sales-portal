const LIVE_API_URL =
  "https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/salesPortalApi";

export function getSalesPortalApiUrl(): string {
  const devUrl = process.env.NEXT_PUBLIC_SALES_PORTAL_API_URL_DEV?.trim();
  const prodUrl = process.env.NEXT_PUBLIC_SALES_PORTAL_API_URL?.trim();
  const isDev = process.env.NEXT_PUBLIC_DEV === "true";

  if (isDev) {
    return devUrl || prodUrl || LIVE_API_URL;
  }
  return prodUrl || LIVE_API_URL;
}

export function getSmartrefillApiUrl(): string {
  const devUrl = process.env.NEXT_PUBLIC_SMARTREFILL_API_URL_DEV?.trim();
  const prodUrl = process.env.NEXT_PUBLIC_SMARTREFILL_API_URL?.trim();
  const isDev = process.env.NEXT_PUBLIC_DEV === "true";

  if (isDev) {
    return (
      devUrl ||
      prodUrl ||
      "https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/smartrefillV3Api"
    );
  }
  return (
    prodUrl ||
    "https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/smartrefillV3Api"
  );
}
