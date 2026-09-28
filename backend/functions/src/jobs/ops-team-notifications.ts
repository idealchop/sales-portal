import { logger } from "firebase-functions";
import {
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import { db } from "../config/firebase-admin";
import { deliverOpsNotification } from "../services/ops-notifications/deliver-ops-notification";
import {
  buildOnboardingNotice,
  buildRegistrationNotice,
  buildSubscriptionReviewNotice,
  enteredSubscriptionReview,
  isNewSmartrefillRegistration,
  isOnboardingJustCompleted,
} from "../services/ops-notifications/ops-notify-events";

const TRIGGER = {
  region: "asia-southeast1" as const,
  database: "riverdb",
  secrets: ["SMARTREFILL_BREVO_API_KEY"],
};

function snapshotData(
  snap: { exists: boolean; data: () => Record<string, unknown> | undefined } | undefined,
): Record<string, unknown> | undefined {
  if (!snap?.exists) return undefined;
  return snap.data();
}

/** Email support when a Smart Refill account is created. */
export const opsNotifyNewUser = onDocumentWritten(
  { ...TRIGGER, document: "users/{userId}" },
  async (event) => {
    const before = snapshotData(event.data?.before);
    const after = snapshotData(event.data?.after);
    if (!isNewSmartrefillRegistration(before, after) || !after) return;
    const email = buildRegistrationNotice(event.params.userId, after);
    await deliverOpsNotification(email);
  },
);

/** Email support when a station finishes onboarding. */
export const opsNotifyOnboarding = onDocumentWritten(
  { ...TRIGGER, document: "businesses/{businessId}" },
  async (event) => {
    const before = snapshotData(event.data?.before);
    const after = snapshotData(event.data?.after);
    const businessId = event.params.businessId;
    if (!isOnboardingJustCompleted(before, after, businessId) || !after) return;
    await deliverOpsNotification(buildOnboardingNotice(businessId, after));
  },
);

/** Email support when a subscription enters payment review. */
export const opsNotifySubscriptionReview = onDocumentWritten(
  {
    ...TRIGGER,
    document: "businesses/{businessId}/subscriptions/{subscriptionId}",
  },
  async (event) => {
    const before = snapshotData(event.data?.before);
    const after = snapshotData(event.data?.after);
    if (!enteredSubscriptionReview(before, after) || !after) return;

    const businessId = event.params.businessId;
    const businessSnap = await db.collection("businesses").doc(businessId).get();
    const business = businessSnap.data() ?? {};
    if (business.authAccountTag === "test" || businessId === "demo_smartrefill_clone") {
      return;
    }
    const businessName =
      String(business.name || business.businessName || businessId).trim();
    const ownerEmail =
      typeof business.email === "string" ? business.email.trim() : undefined;

    try {
      await deliverOpsNotification(
        buildSubscriptionReviewNotice({
          businessId,
          subscriptionId: event.params.subscriptionId,
          businessName,
          ownerEmail,
          subscription: after,
        }),
      );
    } catch (error) {
      logger.error("Subscription review notification failed", {
        businessId,
        subscriptionId: event.params.subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
);
