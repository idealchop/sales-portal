import { Response } from "express";
import { logger } from "firebase-functions";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { setInactiveOwnerContactedAt } from "../services/inactive-owner-contacts-service";
import { sendOutreachEmail } from "../services/outreach/send-outreach-email";

export async function patchInactiveOwnerContactHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const businessId = String(req.params.businessId || "").trim();
  if (!businessId) {
    res.status(400).json({ error: "Business id is required." });
    return;
  }

  const toEmail = String(req.body?.toEmail || "").trim();
  if (!toEmail) {
    res.status(400).json({
      error: "Owner email is required to send outreach via Brevo.",
    });
    return;
  }

  try {
    let outreach;
    try {
      outreach = await sendOutreachEmail({
        toEmail,
        kind: "inactive_owner",
        personalization: {
          recipientName: req.body?.recipientName,
          businessName: req.body?.businessName,
        },
        actorUid: uid,
      });
    } catch (error) {
      logger.error("Failed to send inactive-owner outreach via Brevo", {
        businessId,
        error,
      });
      res.status(502).json({
        error: "Failed to send outreach email via Brevo. Contact was not recorded.",
      });
      return;
    }

    const data = await setInactiveOwnerContactedAt({
      businessId,
      actorUid: uid,
    });
    res.json({ data: { ...data, outreach } });
  } catch {
    res.status(500).json({ error: "Failed to record inactive owner contact." });
  }
}
