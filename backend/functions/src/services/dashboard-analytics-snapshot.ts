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
