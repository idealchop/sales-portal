import { logger } from "firebase-functions";

export type SalesFirestoreOpEvent = {
  operation: string;
  reads?: number;
  writes?: number;
  deletes?: number;
  extra?: Record<string, unknown>;
};

/** Structured Firestore cost breadcrumb (Sales Portal). No Firestore writes. */
export function trackSalesFirestoreOperation(event: SalesFirestoreOpEvent): void {
  const reads = Math.max(0, Math.floor(event.reads ?? 0));
  const writes = Math.max(0, Math.floor(event.writes ?? 0));
  const deletes = Math.max(0, Math.floor(event.deletes ?? 0));
  if (reads + writes + deletes === 0 && !event.extra) return;

  logger.info("firestore_op", {
    event: "firestore_op",
    app: "sales-portal",
    operation: event.operation,
    firestoreDatabaseId:
      process.env.SALES_PORTAL_FIRESTORE_DB?.trim() || "riverdb",
    gcpProject:
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      "aquaflow-management-suite",
    reads,
    writes,
    deletes,
    ...(event.extra || {}),
  });
}
