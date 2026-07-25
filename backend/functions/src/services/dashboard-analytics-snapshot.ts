import { db, FieldValue } from "../config/firebase-admin";
import { logger } from "firebase-functions";
import type { DashboardAnalytics } from "./dashboard-analytics-service";

export const DASHBOARD_ANALYTICS_SNAPSHOT_COLLECTION =
  "sales_portal_dashboard_analytics";
export const DASHBOARD_ANALYTICS_SNAPSHOT_DOC_ID = "platform";

export type DashboardAnalyticsSnapshot = {
  data: DashboardAnalytics;
  computedAt: string;
  updatedAt?: FirebaseFirestore.Timestamp;
};

function snapshotRef() {
  return db
    .collection(DASHBOARD_ANALYTICS_SNAPSHOT_COLLECTION)
    .doc(DASHBOARD_ANALYTICS_SNAPSHOT_DOC_ID);
}

export async function readDashboardAnalyticsSnapshot(): Promise<DashboardAnalyticsSnapshot | null> {
  const snap = await snapshotRef().get();
  if (!snap.exists) return null;

  const raw = snap.data();
  if (!raw || typeof raw !== "object" || !raw.data) return null;

  const computedAt =
    typeof raw.computedAt === "string" ? raw.computedAt : null;
  if (!computedAt) return null;

  return {
    data: raw.data as DashboardAnalytics,
    computedAt,
    updatedAt: raw.updatedAt,
  };
}

export async function writeDashboardAnalyticsSnapshot(
  data: DashboardAnalytics,
  computedAt = new Date().toISOString(),
): Promise<void> {
  try {
    await snapshotRef().set({
      data,
      computedAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.warn("Failed to persist dashboard analytics snapshot", { error });
  }
}

/** Remove a contacted alert from the cached snapshot so clients update immediately. */
export async function removePlatformAlertFromDashboardSnapshot(
  alertId: string,
): Promise<void> {
  try {
    const current = await readDashboardAnalyticsSnapshot();
    if (!current?.data?.platformAlerts?.items) return;

    const items = current.data.platformAlerts.items.filter(
      (item) => item.id !== alertId,
    );
    if (items.length === current.data.platformAlerts.items.length) return;

    const counts = { ...current.data.platformAlerts.counts };
    for (const key of Object.keys(counts) as Array<keyof typeof counts>) {
      counts[key] = 0;
    }
    for (const item of items) {
      counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    }

    const computedAt = new Date().toISOString();
    await snapshotRef().set({
      data: {
        ...current.data,
        platformAlerts: { items, counts },
      },
      computedAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.warn("Failed to patch dashboard analytics snapshot after alert contact", {
      alertId,
      error,
    });
  }
}
