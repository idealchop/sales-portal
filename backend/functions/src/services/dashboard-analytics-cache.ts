import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase-admin";
import {
  fetchDashboardAnalytics,
  type DashboardAnalytics,
} from "./dashboard-analytics-service";
import { logger } from "firebase-functions";

const CACHE_DOC_PATH = "sales_portal_cache/dashboard_analytics";
const FIRESTORE_TTL_MS = 5 * 60 * 1000;
const MEMORY_TTL_MS = 60 * 1000;
const MAX_FIRESTORE_BYTES = 900_000;

export type DashboardAnalyticsCacheMeta = {
  cached: boolean;
  stale: boolean;
  computedAt: string;
};

type MemoryEntry = {
  data: DashboardAnalytics;
  computedAt: string;
  expiresAt: number;
};

type FirestoreCacheDoc = {
  data: DashboardAnalytics;
  computedAt: Timestamp;
  version: number;
};

let memoryEntry: MemoryEntry | null = null;
let refreshInFlight: Promise<DashboardAnalytics> | null = null;

function isFresh(computedAtMs: number, ttlMs: number): boolean {
  return Date.now() - computedAtMs < ttlMs;
}

async function readFirestoreCache(): Promise<{
  data: DashboardAnalytics;
  computedAtMs: number;
} | null> {
  try {
    const snap = await db.doc(CACHE_DOC_PATH).get();
    if (!snap.exists) return null;

    const payload = snap.data() as FirestoreCacheDoc;
    const computedAt = payload.computedAt?.toDate?.();
    if (!payload.data || !computedAt) return null;

    return {
      data: payload.data,
      computedAtMs: computedAt.getTime(),
    };
  } catch (error) {
    logger.warn("Failed to read dashboard analytics cache", { error });
    return null;
  }
}

async function writeFirestoreCache(
  data: DashboardAnalytics,
  computedAt: Date,
): Promise<void> {
  try {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_FIRESTORE_BYTES) {
      logger.warn("Dashboard analytics payload too large for Firestore cache", {
        bytes: serialized.length,
      });
      return;
    }

    await db.doc(CACHE_DOC_PATH).set({
      data,
      computedAt: Timestamp.fromDate(computedAt),
      version: 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.warn("Failed to write dashboard analytics cache", { error });
  }
}

function setMemoryCache(data: DashboardAnalytics, computedAt: Date): void {
  memoryEntry = {
    data,
    computedAt: computedAt.toISOString(),
    expiresAt: Date.now() + MEMORY_TTL_MS,
  };
}

async function computeAndPersist(): Promise<DashboardAnalytics> {
  const computedAt = new Date();
  const data = await fetchDashboardAnalytics();
  setMemoryCache(data, computedAt);
  await writeFirestoreCache(data, computedAt);
  return data;
}

function scheduleRefresh(): void {
  if (refreshInFlight) return;
  refreshInFlight = computeAndPersist()
    .catch((error) => {
      logger.error("Background dashboard analytics refresh failed", { error });
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });
}

export async function getDashboardAnalyticsCached(): Promise<{
  data: DashboardAnalytics;
  meta: DashboardAnalyticsCacheMeta;
}> {
  if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
    return {
      data: memoryEntry.data,
      meta: {
        cached: true,
        stale: false,
        computedAt: memoryEntry.computedAt,
      },
    };
  }

  const firestoreCache = await readFirestoreCache();
  if (
    firestoreCache &&
    isFresh(firestoreCache.computedAtMs, FIRESTORE_TTL_MS)
  ) {
    setMemoryCache(
      firestoreCache.data,
      new Date(firestoreCache.computedAtMs),
    );
    return {
      data: firestoreCache.data,
      meta: {
        cached: true,
        stale: false,
        computedAt: new Date(firestoreCache.computedAtMs).toISOString(),
      },
    };
  }

  if (firestoreCache) {
    scheduleRefresh();
    setMemoryCache(
      firestoreCache.data,
      new Date(firestoreCache.computedAtMs),
    );
    return {
      data: firestoreCache.data,
      meta: {
        cached: true,
        stale: true,
        computedAt: new Date(firestoreCache.computedAtMs).toISOString(),
      },
    };
  }

  if (!refreshInFlight) {
    refreshInFlight = computeAndPersist().finally(() => {
      refreshInFlight = null;
    });
  }

  const data = await refreshInFlight;
  return {
    data,
    meta: {
      cached: false,
      stale: false,
      computedAt: memoryEntry?.computedAt ?? new Date().toISOString(),
    },
  };
}
