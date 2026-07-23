import { logger } from "firebase-functions";
import { brevo, getBrevoApi } from "../../utils/brevo";
import {
  OUTREACH_EMAIL_BCC,
  OUTREACH_SENDER,
} from "./outreach-constants";
import {
  buildOutreachEmailByKind,
  type OutreachPersonalization,
  type OutreachTemplateKind,
} from "./outreach-templates";

export type SendOutreachEmailInput = {
  toEmail: string;
  kind: OutreachTemplateKind;
  personalization?: OutreachPersonalization;
  actorUid?: string;
};

export type SendOutreachEmailResult = {
  sent: boolean;
  skipped: boolean;
  messageId?: string;
  subject: string;
  brevoTag: string;
};

export async function sendOutreachEmail(
  input: SendOutreachEmailInput,
): Promise<SendOutreachEmailResult> {
  const toEmail = input.toEmail.trim();
  if (!toEmail || !toEmail.includes("@")) {
    throw new Error("A valid recipient email is required.");
  }

  const template = buildOutreachEmailByKind(
    input.kind,
    input.personalization ?? {},
  );
  const api = getBrevoApi();

  if (!api) {
    logger.info("Skipping Brevo outreach send (no API key / emulator)", {
      toEmail,
      kind: input.kind,
      subject: template.subject,
      actorUid: input.actorUid,
    });
    return {
      sent: false,
      skipped: true,
      subject: template.subject,
      brevoTag: template.brevoTag,
    };
  }

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: OUTREACH_SENDER.name,
    email: OUTREACH_SENDER.email,
  };
  sendSmtpEmail.to = [{ email: toEmail }];
  sendSmtpEmail.bcc = OUTREACH_EMAIL_BCC.map((email) => ({ email }));
  sendSmtpEmail.replyTo = {
    name: OUTREACH_SENDER.name,
    email: OUTREACH_SENDER.email,
  };
  sendSmtpEmail.subject = template.subject;
  sendSmtpEmail.htmlContent = template.html;
  sendSmtpEmail.textContent = template.text;
  sendSmtpEmail.tags = [template.brevoTag];

  const response = await api.sendTransacEmail(sendSmtpEmail);
  const messageId =
    (response.body as { messageId?: string } | undefined)?.messageId;

  logger.info("Brevo outreach email sent", {
    toEmail,
    kind: input.kind,
    subject: template.subject,
    messageId,
    actorUid: input.actorUid,
  });

  return {
    sent: true,
    skipped: false,
    messageId,
    subject: template.subject,
    brevoTag: template.brevoTag,
  };
}
