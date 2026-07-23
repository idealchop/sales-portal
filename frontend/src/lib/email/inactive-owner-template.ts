/** Re-engagement email for inactive Smart Refill owners. */

import {
  OUTREACH_BRAND_COLOR,
  OUTREACH_EMAIL_FROM,
  SMART_REFILL_EMAIL_LOGO_SRC,
  buildOutreachMailto,
  escapeHtmlForEmail,
  firstNameFromDisplay,
  openOutreachMailto,
} from "@/lib/email/outreach-email-shared";

/** @deprecated Prefer OUTREACH_EMAIL_FROM */
export const INACTIVE_OWNER_EMAIL_FROM = OUTREACH_EMAIL_FROM;

const SUPPORT_EMAIL = "support@riverph.com";

export type InactiveOwnerEmailInput = {
  /** Owner display name when available; otherwise business name is used in greeting. */
  recipientName?: string | null;
  businessName?: string | null;
};

function greetingName(input: InactiveOwnerEmailInput): string {
  const person = firstNameFromDisplay(input.recipientName);
  if (person) return person;
  return input.businessName?.trim() || "";
}

export function buildInactiveOwnerSubject(
  input: InactiveOwnerEmailInput = {},
): string {
  const name = greetingName(input);
  return name ?
      `Kumusta po, ${name} — namimiss namin kayo sa Smart Refill`
    : "Kumusta po — namimiss namin kayo sa Smart Refill";
}

export function buildInactiveOwnerText(
  input: InactiveOwnerEmailInput = {},
): string {
  const name = greetingName(input);
  const greeting = name ? `Hi ${name},` : "Hi,";
  const businessName = input.businessName?.trim();

  const lines = [
    greeting,
    "",
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "",
    "Gusto lang namin kayong kamustahin and mag-check in — how are you right now?",
    "",
    "Namimiss po namin kayo sa app. Sana okay lang ang lahat sa inyo.",
  ];

  if (businessName) {
    lines.push(
      "",
      `Lalo na for ${businessName} — hoping everything is going smoothly on your end.`,
    );
  }

  lines.push(
    "",
    "We’d love to see you continue using Smart Refill. If ever may issue, problem, or something confusing sa app, don’t hesitate po to reach out — handa po kaming tumulong.",
    "",
    "Pwede niyo po kaming hingan ng help or mag-inquire anytime through the in-app chat support ng Smart Refill. Nandiyan po ang team para tumulong sa inyo.",
    "",
    `Pwede rin po kayong mag-reply sa email na ito, or email kami sa ${SUPPORT_EMAIL}.`,
    "",
    "Maraming salamat po, and hoping to see you back soon!",
    "",
    "Warm regards,",
    "River Support Team",
    SUPPORT_EMAIL,
    "https://riverph.com",
  );

  return lines.join("\n");
}

export function buildInactiveOwnerHtml(
  input: InactiveOwnerEmailInput = {},
): string {
  const name = greetingName(input);
  const greeting = escapeHtmlForEmail(name ? `Hi ${name},` : "Hi,");
  const businessHtml =
    input.businessName?.trim() ?
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Lalo na for
        <strong style="color:#0f172a;">${escapeHtmlForEmail(input.businessName.trim())}</strong>
        — hoping everything is going smoothly on your end.
      </p>`
    : "";
  const year = new Date().getFullYear();
  const subject = escapeHtmlForEmail(buildInactiveOwnerSubject(input));
  const brand = OUTREACH_BRAND_COLOR;

  return `<!DOCTYPE html>
<html lang="fil">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Kumusta po! Namimiss namin kayo sa Smart Refill — we're here if you need help.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:24px 28px 20px;border-bottom:3px solid ${brand};background-color:#fbfcfd;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img src="${SMART_REFILL_EMAIL_LOGO_SRC}" width="40" height="40" alt="Smart Refill" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">Smart Refill</p>
                    <p style="margin:4px 0 0;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">River Support</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${brand};">We miss you</p>
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#0f172a;">${greeting}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Kumusta po! Mula po ito sa River Support ng Smart Refill.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Gusto lang namin kayong kamustahin and mag-check in — how are you right now?
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Namimiss po namin kayo sa app. Sana okay lang ang lahat sa inyo.
              </p>
              ${businessHtml}
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                We’d love to see you continue using Smart Refill. If ever may issue, problem, or something confusing sa app, don’t hesitate po to reach out — handa po kaming tumulong.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                Pwede niyo po kaming hingan ng help or mag-inquire anytime through the in-app chat support ng Smart Refill. Nandiyan po ang team para tumulong sa inyo.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background-color:${brand};">
                    <a href="mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Need help with Smart Refill")}"
                      style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Contact support
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#64748b;">
                Pwede rin po kayong mag-reply sa email na ito, or email kami sa
                <a href="mailto:${SUPPORT_EMAIL}" style="color:${brand};">${SUPPORT_EMAIL}</a>.
              </p>
              <p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#334155;">
                Maraming salamat po, and hoping to see you back soon!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#0f172a;">River Support Team</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">
                <a href="mailto:${SUPPORT_EMAIL}" style="color:${brand};text-decoration:none;">${SUPPORT_EMAIL}</a>
                · <a href="https://riverph.com" style="color:${brand};text-decoration:none;">riverph.com</a>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">© ${year} River Tech Inc. · Smart Refill</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildInactiveOwnerMailto(
  toEmail: string,
  input: InactiveOwnerEmailInput = {},
): string {
  return buildOutreachMailto({
    toEmail,
    subject: buildInactiveOwnerSubject(input),
    body: buildInactiveOwnerText(input),
  });
}

export function openInactiveOwnerOutreachEmail(options: {
  email?: string | null;
  businessName?: string | null;
  recipientName?: string | null;
}): void {
  const email = options.email?.trim();
  if (!email || typeof window === "undefined") return;
  openOutreachMailto(
    buildInactiveOwnerMailto(email, {
      recipientName: options.recipientName,
      businessName: options.businessName,
    }),
  );
}
