import { Response } from "express";
import { logger } from "firebase-functions";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import {
  setPlatformAlertContactStatus,
  type PlatformAlertContactStatus,
} from "../services/platform-alert-contacts-service";
import { sendOutreachEmail } from "../services/outreach/send-outreach-email";
import type { OutreachTemplateKind } from "../services/outreach/outreach-templates";

const VALID_STATUSES = new Set<PlatformAlertContactStatus>([
  "need_contact",
  "contacted",
]);

const VALID_KINDS = new Set<OutreachTemplateKind>([
  "new_user_registration",
  "demo_inquiry",
  "generic",
]);

function resolveOutreachKind(raw: unknown): OutreachTemplateKind {
  const kind = String(raw || "").trim() as OutreachTemplateKind;
  if (VALID_KINDS.has(kind)) return kind;
  return "generic";
}

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
    let outreach:
      | {
          sent: boolean;
          skipped: boolean;
          messageId?: string;
          subject: string;
        }
      | undefined;

    if (status === "contacted") {
      const toEmail = String(req.body?.toEmail || "").trim();
      if (!toEmail) {
        res.status(400).json({
          error: "Recipient email is required to send outreach via Brevo.",
        });
        return;
      }

      try {
        outreach = await sendOutreachEmail({
          toEmail,
          kind: resolveOutreachKind(req.body?.kind),
          personalization: {
            recipientName: req.body?.recipientName,
            businessName: req.body?.businessName,
            subtitle: req.body?.subtitle,
          },
          actorUid: uid,
        });
      } catch (error) {
        logger.error("Failed to send platform alert outreach via Brevo", {
          alertId,
          error,
        });
        res.status(502).json({
          error: "Failed to send outreach email via Brevo. Alert was not marked contacted.",
        });
        return;
      }
    }

    const data = await setPlatformAlertContactStatus({
      alertId,
      status,
      actorUid: uid,
    });
    res.json({ data: { ...data, outreach } });
  } catch {
    res.status(500).json({ error: "Failed to update alert contact status." });
  }
}
