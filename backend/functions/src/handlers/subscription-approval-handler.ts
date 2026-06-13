import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { approveSubscriptionPayment } from "../services/approve-subscription-payment";
import { logger } from "firebase-functions";

const APPROVER_ROLES = new Set(["admin", "manager"]);

export const postApproveSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const role = req.user?.role;
  if (!role || !APPROVER_ROLES.has(role)) {
    res.status(403).json({ error: "Only managers and admins can approve payments." });
    return;
  }

  const { businessId, subscriptionId } = req.params;
  if (!businessId || !subscriptionId) {
    res.status(400).json({ error: "Missing business or subscription id." });
    return;
  }

  try {
    const result = await approveSubscriptionPayment({ businessId, subscriptionId });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed.";
    logger.warn("Subscription approval failed", {
      businessId,
      subscriptionId,
      message,
    });

    if (message === "SUBSCRIPTION_NOT_FOUND") {
      res.status(404).json({ error: "Subscription not found." });
      return;
    }
    if (message === "SUBSCRIPTION_NOT_PENDING") {
      res.status(400).json({ error: "This subscription is not waiting for approval." });
      return;
    }
    if (message === "SUBSCRIPTION_NOT_APPROVABLE") {
      res.status(400).json({ error: "This subscription can no longer be approved." });
      return;
    }

    res.status(500).json({ error: "Could not approve subscription." });
  }
};
