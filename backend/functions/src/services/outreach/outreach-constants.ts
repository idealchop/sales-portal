export const OUTREACH_SENDER = {
  name: "River Support",
  email: "support@riverph.com",
} as const;

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
