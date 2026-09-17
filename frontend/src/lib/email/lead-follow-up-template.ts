import {
  buildOutreachMailto,
  firstNameFromDisplay,
} from "@/lib/email/outreach-email-shared";

export type LeadFollowUpEmailInput = {
  ownerName?: string | null;
  businessName?: string | null;
};

export function buildLeadFollowUpSubject(
  input: LeadFollowUpEmailInput = {},
): string {
  const business = input.businessName?.trim();
  return business ?
      `Follow-up — ${business} · Smart Refill`
    : "Follow-up · Smart Refill";
}

export function buildLeadFollowUpText(
  input: LeadFollowUpEmailInput = {},
): string {
  const name =
    firstNameFromDisplay(input.ownerName) ||
    firstNameFromDisplay(input.businessName) ||
    "";
  const greeting = name ? `Kumusta po, ${name}!` : "Kumusta po!";
  const business = input.businessName?.trim();

  return [
    greeting,
    "",
    business ?
      `Gusto lang naming i-follow up regarding ${business} and Smart Refill.`
    : "Gusto lang naming i-follow up regarding Smart Refill.",
    "",
    "Pwede po ba kayong mag-reply dito kung kelan kayo available for a quick chat?",
    "",
    "Salamat po!",
    "Smart Refill Team",
  ].join("\n");
}

export function buildLeadFollowUpMailto(
  toEmail: string,
  input: LeadFollowUpEmailInput = {},
): string {
  return buildOutreachMailto({
    toEmail,
    subject: buildLeadFollowUpSubject(input),
    body: buildLeadFollowUpText(input),
  });
}
