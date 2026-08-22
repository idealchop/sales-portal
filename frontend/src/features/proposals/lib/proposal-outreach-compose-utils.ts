import type { OutreachSendKind } from "@/lib/sales/api";
import type { OutreachRecipient } from "@/lib/definitions";
import { buildDemoInquiryText } from "@/lib/email/demo-inquiry-template";
import { buildNewUserWelcomeText } from "@/lib/email/new-user-welcome-template";
import { firstNameFromDisplay } from "@/lib/email/outreach-email-shared";

export const MAX_BULK_OUTREACH_RECIPIENTS = 50;

export function buildOutreachTemplatePreview(
  kind: OutreachSendKind,
  recipient: OutreachRecipient,
  subtitle: string,
): { subject: string; bodyText: string } {
  const input = {
    recipientName: recipient.displayName,
    businessName: recipient.companyName,
  };
  if (kind === "demo_inquiry") {
    return {
      subject: `Kumusta po, ${firstNameFromDisplay(recipient.displayName) || "there"} — tungkol sa Smart Refill demo ninyo`,
      bodyText: buildDemoInquiryText(input),
    };
  }
  if (kind === "new_user_registration") {
    return {
      subject: `Kumusta po, ${firstNameFromDisplay(recipient.displayName) || "there"} — paano na ang Smart Refill ninyo?`,
      bodyText: buildNewUserWelcomeText(input),
    };
  }
  if (kind === "generic") {
    const sub = subtitle.trim() || recipient.sourceLabel;
    const name = firstNameFromDisplay(recipient.displayName);
    return {
      subject: name ?
        `Kumusta po, ${name} — follow-up from Smart Refill`
      : "Kumusta po — follow-up from Smart Refill",
      bodyText: [
        name ? `Hi ${name},` : "Hi,",
        "",
        "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
        "",
        `Gusto lang naming i-follow up regarding: ${sub}.`,
        "",
        "If ever may questions, feel free po to reply.",
        "",
        "Maraming salamat po!",
      ].join("\n"),
    };
  }
  return {
    subject: "",
    bodyText: "",
  };
}

export function summarizeBulkOutreachSend(input: {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  subject?: string;
}): string {
  const { total, sent, skipped, failed, subject } = input;
  if (failed > 0) {
    return `Sent ${sent}, skipped ${skipped}, failed ${failed}. Check failed addresses and retry.`;
  }
  if (skipped === total) {
    return "Brevo skipped (no API key). Use Open in mail client.";
  }
  if (total === 1) {
    return `Sent via Brevo — ${subject || "message delivered"}`;
  }
  return (
    `Sent ${sent} email${sent === 1 ? "" : "s"} via Brevo` +
    (skipped > 0 ? ` (${skipped} skipped)` : "") +
    "."
  );
}
