import type { PlatformAlert } from "@/lib/dashboard/analytics";
import { buildDemoInquiryMailto } from "@/lib/email/demo-inquiry-template";
import { buildNewUserWelcomeMailto } from "@/lib/email/new-user-welcome-template";
import {
  buildOutreachMailto,
  firstNameFromDisplay,
  openOutreachMailto,
} from "@/lib/email/outreach-email-shared";

function buildGenericAlertMailto(item: PlatformAlert): string | null {
  if (!item.email) return null;
  const name = firstNameFromDisplay(item.title);
  const greeting = name ? `Hi ${name},` : "Hi,";
  const subject = name ?
      `Kumusta po, ${name} — follow-up from Smart Refill`
    : "Kumusta po — follow-up from Smart Refill";
  const body = [
    greeting,
    "",
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "",
    `Gusto lang naming i-follow up regarding: ${item.subtitle || item.title}.`,
    "",
    "If ever may questions, concerns, or need help sa app, feel free po to reply or use the in-app chat support ng Smart Refill.",
    "",
    "Maraming salamat po!",
    "",
    "Warm regards,",
    "River Support Team",
    "support@riverph.com",
  ].join("\n");

  return buildOutreachMailto({
    toEmail: item.email,
    subject,
    body,
  });
}

/** Mailto for alert Contact — templates for demo/new user; generic fallback when email exists. */
export function buildPlatformAlertOutreachMailto(
  item: PlatformAlert,
): string | null {
  if (!item.email?.trim()) return null;

  if (item.kind === "new_user_registration") {
    return buildNewUserWelcomeMailto(item.email, {
      recipientName: item.title,
      businessName: item.businessName,
    });
  }

  if (item.kind === "demo_inquiry") {
    return buildDemoInquiryMailto(item.email, {
      recipientName: item.title,
      businessName: item.businessName,
    });
  }

  return buildGenericAlertMailto(item);
}

/** Opens the outreach compose window when a template exists. */
export function openPlatformAlertOutreachEmail(item: PlatformAlert): boolean {
  const href = buildPlatformAlertOutreachMailto(item);
  if (!href) return false;
  openOutreachMailto(href);
  return true;
}
