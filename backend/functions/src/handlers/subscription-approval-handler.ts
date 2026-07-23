import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { approveSubscriptionPayment } from "../services/approve-subscription-payment";
import { generateSubscriptionOfficialReceipt } from "../services/generate-subscription-official-receipt";
import { generateSubscriptionStatement } from "../services/generate-subscription-statement";
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

/** GET Official Receipt PDF for a paid subscription period. */
export const getSubscriptionOfficialReceipt = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { businessId, subscriptionId } = req.params;
  if (!businessId || !subscriptionId) {
    res.status(400).json({ error: "Missing business or subscription id." });
    return;
  }

  try {
    const { buffer, filename } = await generateSubscriptionOfficialReceipt({
      businessId,
      subscriptionId,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OR_FAILED";
    logger.warn("Subscription OR PDF failed", {
      businessId,
      subscriptionId,
      message,
    });

    if (message === "BUSINESS_NOT_FOUND") {
      res.status(404).json({ error: "Business not found." });
      return;
    }
    if (message === "SUBSCRIPTION_NOT_FOUND") {
      res.status(404).json({ error: "Subscription not found." });
      return;
    }
    if (message === "SUBSCRIPTION_NOT_ELIGIBLE_FOR_OR") {
      res.status(400).json({
        error:
          "Official Receipt is only available for paid subscriptions (not free trial, Starter, or pending payment).",
      });
      return;
    }

    res.status(500).json({ error: "Could not generate Official Receipt." });
  }
};

/** GET Statement of Account PDF for all subscription payments on a business. */
export const getSubscriptionStatement = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { businessId } = req.params;
  if (!businessId) {
    res.status(400).json({ error: "Missing business id." });
    return;
  }

  try {
    const { buffer, filename } = await generateSubscriptionStatement({
      businessId,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SOA_FAILED";
    logger.warn("Subscription statement PDF failed", {
      businessId,
      message,
    });

    if (message === "BUSINESS_NOT_FOUND") {
      res.status(404).json({ error: "Business not found." });
      return;
    }
    if (message === "NO_SUBSCRIPTION_PAYMENTS") {
      res.status(400).json({
        error:
          "No paid subscription periods found for a statement of account.",
      });
      return;
    }

    res.status(500).json({ error: "Could not generate statement of account." });
  }
};
