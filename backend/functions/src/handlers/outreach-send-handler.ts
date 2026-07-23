import { Response } from "express";
import { logger } from "firebase-functions";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { sendOutreachEmail } from "../services/outreach/send-outreach-email";
import type { OutreachTemplateKind } from "../services/outreach/outreach-templates";

const VALID_KINDS = new Set<OutreachTemplateKind>([
  "new_user_registration",
  "demo_inquiry",
  "inactive_owner",
  "generic",
]);

function resolveOutreachKind(raw: unknown): OutreachTemplateKind {
  const kind = String(raw || "").trim() as OutreachTemplateKind;
  if (VALID_KINDS.has(kind)) return kind;
  return "generic";
}

/** Send transactional outreach via Brevo without updating contact cooldown docs. */
export async function postOutreachSendHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const toEmail = String(req.body?.toEmail || "").trim();
  if (!toEmail) {
    res.status(400).json({
      error: "Recipient email is required to send outreach via Brevo.",
    });
    return;
  }

  try {
    const outreach = await sendOutreachEmail({
      toEmail,
      kind: resolveOutreachKind(req.body?.kind),
      personalization: {
        recipientName: req.body?.recipientName,
        businessName: req.body?.businessName,
        subtitle: req.body?.subtitle,
      },
      actorUid: uid,
    });
    res.json({ data: { outreach } });
  } catch (error) {
    logger.error("Failed to send dashboard outreach via Brevo", { error });
    res.status(502).json({
      error: "Failed to send outreach email via Brevo.",
    });
  }
}
