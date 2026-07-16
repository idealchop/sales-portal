import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import {
  setPlatformAlertContactStatus,
  type PlatformAlertContactStatus,
} from "../services/platform-alert-contacts-service";

const VALID_STATUSES = new Set<PlatformAlertContactStatus>([
  "need_contact",
  "contacted",
]);

export async function patchPlatformAlertContactHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const alertId = String(req.params.alertId || "").trim();
  if (!alertId) {
    res.status(400).json({ error: "Alert id is required." });
    return;
  }

  const status = req.body?.status;
  if (!VALID_STATUSES.has(status)) {
    res.status(400).json({ error: "Invalid contact status." });
    return;
  }

  try {
    const data = await setPlatformAlertContactStatus({
      alertId,
      status,
      actorUid: uid,
    });
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Failed to update alert contact status." });
  }
}
