import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { markLeadEmailOpened } from "../services/leads-service";

type BrevoTransactionalWebhookBody = {
  event?: string;
  email?: string;
  "message-id"?: string;
  messageId?: string;
  ts_event?: number;
  date?: string;
  tags?: string[] | string;
};

function authorizeBrevoWebhook(req: Request): boolean {
  const expected = process.env.BREVO_WEBHOOK_TOKEN?.trim();
  if (!expected) {
    // Local / unset: allow (still only updates awaiting-reply leads).
    return true;
  }
  const header = String(req.header("x-brevo-token") || "").trim();
  const query = String(req.query.token || "").trim();
  return header === expected || query === expected;
}

function resolveMessageId(body: BrevoTransactionalWebhookBody): string {
  return String(body["message-id"] || body.messageId || "").trim();
}

function resolveOpenedAt(body: BrevoTransactionalWebhookBody): string {
  if (typeof body.ts_event === "number" && Number.isFinite(body.ts_event)) {
    return new Date(body.ts_event * 1000).toISOString();
  }
  if (body.date) {
    const parsed = Date.parse(body.date);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Brevo transactional webhook — listen for uniqueOpened / opened.
 * Configure in Brevo → Transactional → Settings → Webhook:
 *   POST https://<salesPortalApi>/webhooks/brevo/transactional?token=<BREVO_WEBHOOK_TOKEN>
 * Events: uniqueOpened (preferred), opened
 */
export async function postBrevoTransactionalWebhookHandler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!authorizeBrevoWebhook(req)) {
    res.status(401).json({ error: "Unauthorized webhook" });
    return;
  }

  const body = (req.body || {}) as BrevoTransactionalWebhookBody;
  const event = String(body.event || "").trim();
  const normalizedEvent = event.toLowerCase().replace(/_/g, "");

  // Ignore proxy opens (privacy prefetch). Prefer uniqueOpened; accept opened.
  if (
    normalizedEvent === "proxyopen" ||
    normalizedEvent === "uniqueproxyopen"
  ) {
    res.status(200).json({ data: { ignored: true, reason: "proxy_open" } });
    return;
  }

  if (
    normalizedEvent !== "uniqueopened" &&
    normalizedEvent !== "opened"
  ) {
    res.status(200).json({
      data: { ignored: true, reason: "unhandled_event", event },
    });
    return;
  }

  try {
    const result = await markLeadEmailOpened({
      messageId: resolveMessageId(body),
      email: body.email,
      openedAt: resolveOpenedAt(body),
    });
    logger.info("Brevo open webhook processed", {
      event: body.event,
      email: body.email,
      messageId: resolveMessageId(body),
      ...result,
    });
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error("Brevo open webhook failed", { error });
    res.status(500).json({ error: "Failed to process Brevo webhook" });
  }
}
