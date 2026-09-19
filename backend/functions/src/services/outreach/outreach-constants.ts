export const OUTREACH_SENDER = {
  name: "River Support",
  email: "support@riverph.com",
} as const;

/** Visible reply-to in customer HTML/text. From address stays OUTREACH_SENDER. */
export const OUTREACH_VISIBLE_CONTACT_EMAIL = "hello@smartrefill.io";

/** Verified Brevo senders that sales can choose from. */
export const OUTREACH_SENDER_OPTIONS = [
  { id: "support", name: "River Support", email: "support@riverph.com" },
  { id: "justfer", name: "Justfer", email: "justfer@riverph.com" },
  { id: "wina", name: "Wina", email: "wina@riverph.com" },
  { id: "jimboy", name: "Jimboy", email: "jimboy@smartrefill.io" },
] as const;

export type OutreachSenderOption = (typeof OUTREACH_SENDER_OPTIONS)[number];

export function resolveOutreachSender(input?: {
  email?: string | null;
  name?: string | null;
}): { name: string; email: string } {
  const email = input?.email?.trim().toLowerCase() || "";
  const match = OUTREACH_SENDER_OPTIONS.find(
    (option) => option.email.toLowerCase() === email,
  );
  if (match) {
    return {
      email: match.email,
      name: input?.name?.trim() || match.name,
    };
  }
  return {
    email: OUTREACH_SENDER.email,
    name: OUTREACH_SENDER.name,
  };
}

export const OUTREACH_EMAIL_BCC = [
  "justfer@riverph.com",
  "wina@riverph.com",
  "jimboy@smartrefill.io",
] as const;

export const SMART_REFILL_EMAIL_LOGO_SRC =
  "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FAsset%2022.png?alt=media&token=f7458efe-afd7-4006-862e-40c8d524c080";

export const OUTREACH_BRAND_COLOR = "#0f766e";

export function firstNameFromDisplay(raw?: string | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function escapeHtmlForEmail(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
