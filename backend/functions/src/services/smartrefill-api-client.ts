import { logger } from "firebase-functions";
import { resolveSmartrefillApiBaseUrl } from "../config/dev-tier";

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
