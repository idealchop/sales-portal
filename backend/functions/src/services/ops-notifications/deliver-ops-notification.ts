import { logger } from "firebase-functions";
import { db, FieldValue } from "../../config/firebase-admin";
import { brevo, getBrevoApi } from "../../utils/brevo";
import {
  OPS_NOTIFY_CC,
  OPS_NOTIFY_TO,
  type OpsNotifyEmail,
} from "./ops-notify-events";

function isAlreadyExists(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: number | string }).code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

async function claimNotice(noticeId: string): Promise<boolean> {
  try {
    await db.collection("opsEmailNotices").doc(noticeId).create({
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    if (isAlreadyExists(error)) return false;
    throw error;
  }
}

async function releaseNotice(noticeId: string): Promise<void> {
  await db.collection("opsEmailNotices").doc(noticeId).delete().catch(() => undefined);
}

export async function deliverOpsNotification(
  email: OpsNotifyEmail,
): Promise<"sent" | "skipped" | "duplicate"> {
  const claimed = await claimNotice(email.noticeId);
  if (!claimed) return "duplicate";

  const api = getBrevoApi();
  if (!api) {
    await releaseNotice(email.noticeId);
    logger.info("Skipped ops notification (Brevo unavailable)", {
      noticeId: email.noticeId,
      subject: email.subject,
    });
    return "skipped";
  }

  const message = new brevo.SendSmtpEmail();
  message.sender = { name: OPS_NOTIFY_TO.name, email: OPS_NOTIFY_TO.email };
  message.to = [{ name: OPS_NOTIFY_TO.name, email: OPS_NOTIFY_TO.email }];
  message.cc = OPS_NOTIFY_CC.map((person) => ({
    name: person.name,
    email: person.email,
  }));
  message.replyTo = { name: OPS_NOTIFY_TO.name, email: OPS_NOTIFY_TO.email };
  message.subject = email.subject;
  message.htmlContent = email.html;
  message.textContent = email.text;
  message.tags = [email.brevoTag];

  try {
    await api.sendTransacEmail(message);
    logger.info("Ops notification sent", {
      noticeId: email.noticeId,
      subject: email.subject,
      tag: email.brevoTag,
    });
    return "sent";
  } catch (error) {
    await releaseNotice(email.noticeId);
    throw error;
  }
}
