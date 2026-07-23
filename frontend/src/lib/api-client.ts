import { auth } from "./firebase/auth";
import { getAppCheckToken } from "./firebase/app-check";
import { getSalesPortalApiUrl } from "./bff-url";

const API_URL = getSalesPortalApiUrl();

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  const headers: Record<string, string> = {};

  const appCheckToken = await getAppCheckToken();
  if (appCheckToken) {
    headers["X-Firebase-AppCheck"] = appCheckToken;
  }

  if (!user) return headers;

  if (cachedToken && Date.now() < tokenExpiresAt - 10_000) {
    return { ...headers, Authorization: `Bearer ${cachedToken}` };
  }

  const token = await user.getIdToken();
  cachedToken = token;
  tokenExpiresAt = Date.now() + 50_000;
  return { ...headers, Authorization: `Bearer ${token}` };
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}

export const apiClient = {
  clearTokenCache() {
    cachedToken = null;
    tokenExpiresAt = 0;
  },

  async getBlob(path: string): Promise<Blob> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        body.error || res.statusText,
        body.code,
      );
    }
    return res.blob();
  },

  async get<T>(path: string): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        body.error || res.statusText,
        body.code,
      );
    }
    return res.json() as Promise<T>;
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        payload.error || res.statusText,
        payload.code,
      );
    }
    return res.json() as Promise<T>;
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        payload.error || res.statusText,
        payload.code,
      );
    }
    return res.json() as Promise<T>;
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        payload.error || res.statusText,
        payload.code,
      );
    }
    return res.json() as Promise<T>;
  },

  async delete<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: {
        ...headers,
        ...(body !== undefined ?
          { "Content-Type": "application/json" }
        : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        payload.error || res.statusText,
        payload.code,
      );
    }
    // 204 / empty body — common for DELETE handlers
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text.trim()) return undefined as T;
    return JSON.parse(text) as T;
  },
};
