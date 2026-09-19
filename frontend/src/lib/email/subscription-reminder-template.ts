/** Subscription renewal / expiry reminder for onboarded Smart Refill owners. */

import {
  OUTREACH_VISIBLE_CONTACT_EMAIL,
  buildOutreachMailto,
  firstNameFromDisplay,
} from "@/lib/email/outreach-email-shared";

const SUPPORT_EMAIL = OUTREACH_VISIBLE_CONTACT_EMAIL;

export type SubscriptionReminderEmailInput = {
  ownerName?: string | null;
  recipientName?: string | null;
  businessName?: string | null;
  /** Optional plan label, e.g. "Pro monthly". */
  planName?: string | null;
  /** Optional human expiry hint, e.g. "Sep 20, 2026". */
  expiresLabel?: string | null;
};

function greetingName(input: SubscriptionReminderEmailInput): string {
  return (
    firstNameFromDisplay(input.ownerName) ||
    firstNameFromDisplay(input.recipientName) ||
    ""
  );
}

export function buildSubscriptionReminderSubject(
  input: SubscriptionReminderEmailInput = {},
): string {
  const name = greetingName(input);
  const business = input.businessName?.trim();
  if (name && business) {
    return `Kumusta po, ${name} — reminder sa subscription ng ${business}`;
  }
  if (name) {
    return `Kumusta po, ${name} — reminder sa Smart Refill subscription`;
  }
  if (business) {
    return `Reminder sa subscription ng ${business} · Smart Refill`;
  }
  return "Reminder sa Smart Refill subscription";
}

export function buildSubscriptionReminderText(
  input: SubscriptionReminderEmailInput = {},
): string {
  const name = greetingName(input);
  const greeting = name ? `Kumusta po, ${name}!` : "Kumusta po!";
  const business = input.businessName?.trim();
  const plan = input.planName?.trim();
  const expires = input.expiresLabel?.trim();

  const lines = [
    greeting,
    "",
    "Mula po ito sa River Support ng Smart Refill.",
    "",
    business ?
      `Gusto lang naming i-remind kayo regarding sa subscription ng ${business}.`
    : "Gusto lang naming i-remind kayo regarding sa Smart Refill subscription ninyo.",
  ];

  if (plan || expires) {
    lines.push("");
    if (plan && expires) {
      lines.push(`Plan: ${plan} · Expires / renews around ${expires}.`);
    } else if (plan) {
      lines.push(`Plan: ${plan}.`);
    } else if (expires) {
      lines.push(`Expires / renews around ${expires}.`);
    }
  }

  lines.push(
    "",
    "Para tuloy-tuloy ang access ninyo sa Smart Refill, please renew or update your plan asap. Kung nasa grace period na kayo, mas okay po na maayos agad para hindi ma-interrupt ang operations.",
    "",
    "Kung kailangan ninyo ng tulong sa renewal, change of plan, or payment, reply lang po dito or gamitin ang in-app chat support.",
    "",
    `Pwede rin po kayong mag-email sa ${SUPPORT_EMAIL}.`,
    "",
    "Salamat po!",
    "River Support Team",
    SUPPORT_EMAIL,
  );

  return lines.join("\n");
}

export function buildSubscriptionReminderMailto(
  toEmail: string,
  input: SubscriptionReminderEmailInput = {},
): string {
  return buildOutreachMailto({
    toEmail,
    subject: buildSubscriptionReminderSubject(input),
    body: buildSubscriptionReminderText(input),
  });
}
