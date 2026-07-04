import { FieldPath } from "firebase-admin/firestore";
import { db, FieldValue } from "../config/firebase-admin";
import type {
  PlatformAlert,
  PlatformAlertsSummary,
} from "./build-platform-alerts";

export type PlatformAlertContactStatus = "need_contact" | "contacted";

const COLLECTION = "platform_alert_contacts";
const FIRESTORE_IN_LIMIT = 30;

export async function getPlatformAlertContactStatuses(
  alertIds: string[],
): Promise<Map<string, PlatformAlertContactStatus>> {
  const statuses = new Map<string, PlatformAlertContactStatus>();
  if (alertIds.length === 0) return statuses;

  for (let index = 0; index < alertIds.length; index += FIRESTORE_IN_LIMIT) {
    const chunk = alertIds.slice(index, index + FIRESTORE_IN_LIMIT);
    const snap = await db
      .collection(COLLECTION)
      .where(FieldPath.documentId(), "in", chunk)
      .get();

    for (const doc of snap.docs) {
      const status = doc.data().status;
      if (status === "contacted" || status === "need_contact") {
        statuses.set(doc.id, status);
      }
    }
  }

  return statuses;
}

export function attachContactStatusToAlerts(
  summary: PlatformAlertsSummary,
  statuses: Map<string, PlatformAlertContactStatus>,
): PlatformAlertsSummary {
  return {
    ...summary,
    items: summary.items.map((item) => ({
      ...item,
      contactStatus: statuses.get(item.id) ?? "need_contact",
    })),
  };
}

export async function setPlatformAlertContactStatus(input: {
  alertId: string;
  status: PlatformAlertContactStatus;
  actorUid: string;
}): Promise<{ alertId: string; status: PlatformAlertContactStatus }> {
  await db.collection(COLLECTION).doc(input.alertId).set(
    {
      status: input.status,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: input.actorUid,
    },
    { merge: true },
  );

  return { alertId: input.alertId, status: input.status };
}

export type { PlatformAlert };
