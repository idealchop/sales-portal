import {
  normalizeDashboardAnalytics,
  type DashboardAnalytics,
} from "@/lib/dashboard/analytics";

const STORAGE_KEY = "sales-portal:dashboard-analytics:v2";
const FRESH_TTL_MS = 60_000;
const STALE_TTL_MS = 5 * 60_000;

type StoredEntry = {
  data: DashboardAnalytics;
  computedAt: string;
  fetchedAt: number;
};

export type ClientDashboardCache = {
  data: DashboardAnalytics;
  computedAt: string;
  isFresh: boolean;
  isStale: boolean;
};

function readStorage(): StoredEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredEntry;
  } catch {
    return null;
  }
}

function writeStorage(entry: StoredEntry): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore quota errors — memory-only fallback still works.
  }
}

let memoryEntry: StoredEntry | null = null;

export function readDashboardAnalyticsCache(): ClientDashboardCache | null {
  const entry = memoryEntry ?? readStorage();
  if (!entry) return null;

  const ageMs = Date.now() - entry.fetchedAt;
  if (ageMs > STALE_TTL_MS) return null;

  return {
    data: normalizeDashboardAnalytics(entry.data),
    computedAt: entry.computedAt,
    isFresh: ageMs <= FRESH_TTL_MS,
    isStale: ageMs > FRESH_TTL_MS,
  };
}

export function writeDashboardAnalyticsCache(
  data: DashboardAnalytics,
  computedAt?: string,
): void {
  const entry: StoredEntry = {
    data,
    computedAt: computedAt ?? new Date().toISOString(),
    fetchedAt: Date.now(),
  };
  memoryEntry = entry;
  writeStorage(entry);
}

export function clearDashboardAnalyticsCache(): void {
  memoryEntry = null;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
