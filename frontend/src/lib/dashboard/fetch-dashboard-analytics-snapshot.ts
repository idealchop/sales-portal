import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase/firestore";
import {
  normalizeDashboardAnalytics,
  type DashboardAnalytics,
} from "@/lib/dashboard/analytics";

export const DASHBOARD_ANALYTICS_SNAPSHOT_PATH = [
  "sales_portal_dashboard_analytics",
  "platform",
] as const;

export type DashboardAnalyticsSnapshotResult = {
  data: DashboardAnalytics;
  computedAt: string;
};

export function parseDashboardAnalyticsSnapshot(
  raw: Record<string, unknown> | undefined,
): DashboardAnalyticsSnapshotResult | null {
  if (!raw?.data || typeof raw.data !== "object") return null;

  const computedAt =
    typeof raw.computedAt === "string" ? raw.computedAt : null;
  if (!computedAt) return null;

  return {
    data: normalizeDashboardAnalytics(
      raw.data as Parameters<typeof normalizeDashboardAnalytics>[0],
    ),
    computedAt,
  };
}

export async function fetchDashboardAnalyticsSnapshot(): Promise<DashboardAnalyticsSnapshotResult | null> {
  const ref = doc(
    firestore,
    DASHBOARD_ANALYTICS_SNAPSHOT_PATH[0],
    DASHBOARD_ANALYTICS_SNAPSHOT_PATH[1],
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return parseDashboardAnalyticsSnapshot(snap.data());
}
