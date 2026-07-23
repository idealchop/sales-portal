/** Welcome / kamustahan email for newly registered Smart Refill users. */

import {
  OUTREACH_BRAND_COLOR,
  OUTREACH_EMAIL_BCC,
  OUTREACH_EMAIL_FROM,
  SMART_REFILL_EMAIL_LOGO_SRC,
  buildOutreachMailto,
  escapeHtmlForEmail,
  firstNameFromDisplay,
} from "@/lib/email/outreach-email-shared";

/** @deprecated Prefer OUTREACH_EMAIL_FROM */
export const NEW_USER_EMAIL_FROM = OUTREACH_EMAIL_FROM;
/** @deprecated Prefer OUTREACH_EMAIL_BCC */
export const NEW_USER_EMAIL_BCC = OUTREACH_EMAIL_BCC;

const SUPPORT_EMAIL = "support@riverph.com";

export type NewUserWelcomeInput = {
  /** Display name; falls back to a friendly greeting if empty. */
  recipientName?: string | null;
  /** Optional business / station name for personalization. */
  businessName?: string | null;
};

export function buildNewUserWelcomeSubject(input: NewUserWelcomeInput = {}): string {
  const name = firstNameFromDisplay(input.recipientName);
  return name ?
      `Kumusta po, ${name} — paano na ang Smart Refill ninyo?`
    : "Kumusta po — paano na ang Smart Refill ninyo?";
}

export function buildNewUserWelcomeText(input: NewUserWelcomeInput = {}): string {
  const name = firstNameFromDisplay(input.recipientName);
  const greeting = name ? `Hi ${name},` : "Hi,";
  const businessName = input.businessName?.trim();

  const lines = [
    greeting,
    "",
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "",
    "Gusto lang namin kayong kamustahin regarding sa paggamit ninyo ng app so far.",
  ];

  if (businessName) {
    lines.push(
      "",
      `Napansin namin na newly registered na po kayo for ${businessName}.`,
    );
  }

  lines.push(
    "",
    "Smooth ba ang experience ninyo? May questions or concerns ba kayo sa setup, transactions, customers, o sa ibang features? Feel free po to share — handa po kaming tumulong.",
    "",
    "Pwede niyo rin po kaming hingan ng help or mag-inquire anytime through the in-app chat support ng Smart Refill — nandiyan po ang team para tumulong.",
    "",
    "If ever gusto ninyo, libre po naming i-walkthrough ang Smart Refill through a short demo (around 15–20 minutes). Doon natin pag-uusapan ang features na most useful for your station, and we can answer your questions live.",
    "",
    `Para mag-schedule, pwede po kayong mag-reply sa email na ito, or email kami sa ${SUPPORT_EMAIL} with your preferred date and time.`,
    "",
    "Maraming salamat po, and welcome to Smart Refill!",
    "",
    "Warm regards,",
    "River Support Team",
    SUPPORT_EMAIL,
    "https://riverph.com",
  );

  return lines.join("\n");
}

export function buildNewUserWelcomeHtml(input: NewUserWelcomeInput = {}): string {
  const name = firstNameFromDisplay(input.recipientName);
  const greeting = escapeHtmlForEmail(name ? `Hi ${name},` : "Hi,");
  const businessHtml =
    input.businessName?.trim() ?
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Napansin namin na newly registered na po kayo for
        <strong style="color:#0f172a;">${escapeHtmlForEmail(input.businessName.trim())}</strong>.
      </p>`
    : "";
  const year = new Date().getFullYear();
  const subject = escapeHtmlForEmail(buildNewUserWelcomeSubject(input));
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
    Kumusta po! Quick kamustahan regarding sa Smart Refill ninyo — libre ring mag-schedule ng short demo.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${brand};">Quick kamustahan</p>
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#0f172a;">${greeting}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Kumusta po! Mula po ito sa River Support ng Smart Refill.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Gusto lang namin kayong kamustahin regarding sa paggamit ninyo ng app so far.
              </p>
              ${businessHtml}
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Smooth ba ang experience ninyo? May questions or concerns ba kayo sa setup, transactions, customers, o sa ibang features? Feel free po to share — handa po kaming tumulong.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Pwede niyo rin po kaming hingan ng help or mag-inquire anytime through the in-app chat support ng Smart Refill — nandiyan po ang team para tumulong.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                If ever gusto ninyo, libre po naming i-walkthrough ang Smart Refill through a short demo (around 15–20 minutes). Doon natin pag-uusapan ang features na most useful for your station, and we can answer your questions live.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background-color:${brand};">
                    <a href="mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Gusto po naming mag-schedule ng Smart Refill demo")}"
                      style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Mag-schedule ng demo
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#64748b;">
                Para mag-schedule, pwede po kayong mag-reply sa email na ito, or email kami sa
                <a href="mailto:${SUPPORT_EMAIL}" style="color:${brand};">${SUPPORT_EMAIL}</a>
                with your preferred date and time.
              </p>
              <p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#334155;">
                Maraming salamat po, and welcome to Smart Refill!
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

/** Builds a mailto: URL so sales can send from their client (use support@riverph.com as From if configured). */
export function buildNewUserWelcomeMailto(
  toEmail: string,
  input: NewUserWelcomeInput = {},
): string {
  return buildOutreachMailto({
    toEmail,
    subject: buildNewUserWelcomeSubject(input),
    body: buildNewUserWelcomeText(input),
  });
}
