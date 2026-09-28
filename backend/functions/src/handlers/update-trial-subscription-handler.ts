import { Response } from "express";
import { logger } from "firebase-functions";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import {
  extendLiveSubscription,
  updateLiveTrialSubscription,
} from "../services/update-trial-subscription";

const EDITOR_ROLES = new Set(["admin", "manager"]);

export const patchTrialSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const role = req.user?.role;
  if (!role || !EDITOR_ROLES.has(role)) {
    res.status(403).json({ error: "Only managers and admins can change a live trial." });
    return;
  }

  const { businessId, subscriptionId } = req.params;
  const intent = String(req.body?.intent || "overwrite");
  const planCode = String(req.body?.planCode || "");
  const expiresAt = String(req.body?.expiresAt || "");
  const note = String(req.body?.note || "");
  if (!businessId || !subscriptionId || !expiresAt) {
    res.status(400).json({ error: "Station, subscription, and end date are required." });
    return;
  }
  if (intent !== "extend" && (!planCode || !note.trim())) {
    res.status(400).json({
      error: "Plan, end date, and a note explaining the change are required.",
    });
    return;
  }

  try {
    if (intent === "extend") {
      const extended = await extendLiveSubscription({
        businessId,
        subscriptionId,
        expiresAt,
        actorUid: req.user?.uid || "",
      });
      res.json(extended);
      return;
    }

    const result = await updateLiveTrialSubscription({
      businessId,
      subscriptionId,
      planCode,
      expiresAt,
      note,
      actorUid: req.user?.uid || "",
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "TRIAL_UPDATE_FAILED";
    logger.warn("Trial subscription update failed", {
      businessId,
      subscriptionId,
      message,
    });

    if (message === "SUBSCRIPTION_NOT_FOUND") {
      res.status(404).json({ error: "Trial not found." });
      return;
    }
    if (message === "SUBSCRIPTION_NOT_EDITABLE") {
      res.status(400).json({ error: "This subscription can no longer be changed." });
      return;
    }
    if (message === "NOTE_REQUIRED") {
      res.status(400).json({
        error: "Add a note explaining why this subscription changed.",
      });
      return;
    }
    if (message === "PLAN_NOT_ALLOWED" || message === "PLAN_NOT_FOUND") {
      res.status(400).json({ error: "That plan cannot replace this subscription." });
      return;
    }
    if (message === "INVALID_EXPIRY") {
      res.status(400).json({ error: "Enter a valid trial end date." });
      return;
    }
    if (message === "EXPIRY_IN_PAST") {
      res.status(400).json({ error: "The trial end date has to be today or later." });
      return;
    }

    res.status(500).json({ error: "Could not update this trial." });
  }
};
