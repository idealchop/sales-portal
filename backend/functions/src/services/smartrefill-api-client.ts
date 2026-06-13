import { logger } from "firebase-functions";

function resolveSmartrefillApiBaseUrl(): string {
  if (process.env.SMARTREFILL_API_URL) {
    return process.env.SMARTREFILL_API_URL.replace(/\/$/, "");
  }
  if (process.env.FUNCTIONS_EMULATOR) {
    return "http://127.0.0.1:5001/aquaflow-management-suite/asia-southeast1/smartrefillV3Api";
  }
  return "https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/smartrefillV3Api";
}

export const SMARTREFILL_API_BASE_URL = resolveSmartrefillApiBaseUrl();

export async function proxyToSmartrefillApi(
  path: string,
  init: RequestInit & { idToken: string },
): Promise<Response> {
  const url = `${SMARTREFILL_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${init.idToken}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  logger.info("Proxying to SmartRefill API", { path, method: init.method ?? "GET" });

  return fetch(url, {
    ...init,
    headers,
  });
}
