import type { Request } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { logger } from "firebase-functions";
import { db, FieldValue } from "../../config/firebase-admin";

const API_ACCESS_THROTTLE_MS = 15 * 60 * 1000;
const CACHED_SESSION_AUTH_AGE_SEC = 3600;
const lastApiAccessWriteAt = new Map<string, number>();

export function utcCalendarDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function isExplicitLoginPost(req: Request): boolean {
  if (req.method !== "POST") return false;
  const path = (req.originalUrl || req.url || req.path || "").split("?")[0];
  return path.endsWith("/auth/login");
}

function shouldThrottleApiAccess(uid: string): boolean {
  const last = lastApiAccessWriteAt.get(uid) ?? 0;
  if (Date.now() - last < API_ACCESS_THROTTLE_MS) return true;
  lastApiAccessWriteAt.set(uid, Date.now());
  return false;
}

export async function writeUserLoginEvent(input: {
  uid: string;
  email?: string;
  decoded?: DecodedIdToken | null;
  req: Request;
  kind: "explicit_login" | "cached_api_access" | "routine_api_access";
  provider?: string;
  appId?: string;
}): Promise<boolean> {
  const { uid, email, decoded, req, kind, provider, appId } = input;
  const nowSec = Math.floor(Date.now() / 1000);
  const authTimeSec = decoded?.auth_time ?? null;
  const iatSec = decoded?.iat ?? null;
  const authAgeSec =
    authTimeSec != null ? Math.max(0, nowSec - authTimeSec) : null;

  const dayKey = utcCalendarDayKey();
  const loginEventRef = db
    .collection("users")
    .doc(uid)
    .collection("login_events")
    .doc(dayKey);

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(loginEventRef);
    if (existing.exists) {
      return false;
    }

    tx.set(loginEventRef, {
      calendarDayUtc: dayKey,
      timestamp: FieldValue.serverTimestamp(),
      kind,
      path: req.path || req.url || "",
      originalUrl: req.originalUrl || "",
      method: req.method,
      userAgent: String(req.headers["user-agent"] || "unknown"),
      ip: req.ip || req.socket?.remoteAddress || "unknown",
      provider: provider || decoded?.firebase?.sign_in_provider || "unknown",
      appId: appId || "sales-portal",
      email: email || decoded?.email || null,
      authTimeSec,
      tokenIssuedAtSec: iatSec,
      authAgeSec,
      tokenExpiresAtSec: decoded?.exp ?? null,
    });
    return true;
  });
}

export function scheduleApiSessionAccessRecord(
  decoded: DecodedIdToken,
  req: Request,
): void {
  if (!decoded?.uid) return;
  if (isExplicitLoginPost(req)) return;
  if (shouldThrottleApiAccess(decoded.uid)) return;

  const nowSec = Math.floor(Date.now() / 1000);
  const authTimeSec = decoded.auth_time;
  const authAgeSec =
    authTimeSec != null ? Math.max(0, nowSec - authTimeSec) : 0;
  const kind: "cached_api_access" | "routine_api_access" =
    authAgeSec > CACHED_SESSION_AUTH_AGE_SEC ?
      "cached_api_access" :
      "routine_api_access";

  void writeUserLoginEvent({
    uid: decoded.uid,
    email: decoded.email,
    decoded,
    req,
    kind,
    provider: decoded.firebase?.sign_in_provider,
    appId: "sales-portal",
  }).catch((err) => {
    logger.error("Failed to record API session access", {
      uid: decoded.uid,
      err,
    });
  });
}
