/** Shared sender / BCC for Sales Portal outreach mailto templates. */

export const OUTREACH_EMAIL_FROM = "support@riverph.com";

/** Verified Brevo senders that sales can choose from. */
export const OUTREACH_SENDER_OPTIONS = [
  { id: "support", name: "River Support", email: "support@riverph.com" },
  { id: "justfer", name: "Justfer", email: "justfer@riverph.com" },
  { id: "wina", name: "Wina", email: "wina@riverph.com" },
  { id: "jimboy", name: "Jimboy", email: "jimboy@smartrefill.io" },
] as const;

export type OutreachSenderOptionId =
  (typeof OUTREACH_SENDER_OPTIONS)[number]["id"];

export function outreachSenderByEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase() || "";
  return (
    OUTREACH_SENDER_OPTIONS.find(
      (option) => option.email.toLowerCase() === normalized,
    ) || OUTREACH_SENDER_OPTIONS[0]
  );
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

export function buildOutreachMailto(options: {
  toEmail: string;
  subject: string;
  body: string;
}): string {
  // Keep commas between BCC addresses unencoded — URLSearchParams turns "," into
  // "%2C", which many mail clients treat as one invalid address.
  const query = [
    `subject=${encodeURIComponent(options.subject)}`,
    `body=${encodeURIComponent(options.body)}`,
    `bcc=${OUTREACH_EMAIL_BCC.map((address) => encodeURIComponent(address)).join(",")}`,
    `from=${encodeURIComponent(OUTREACH_EMAIL_FROM)}`,
  ].join("&");
  return `mailto:${options.toEmail}?${query}`;
}

/** Opens a mailto without navigating the SPA away (so list updates still run). */
export function openOutreachMailto(href: string): void {
  if (typeof window === "undefined" || !href.startsWith("mailto:")) return;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

