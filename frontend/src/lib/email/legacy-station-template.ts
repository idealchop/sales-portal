/** Check-in / upgrade outreach for legacy Smart Refill (prod-smartrefill) stations. */

import {
  OUTREACH_BRAND_COLOR,
  OUTREACH_EMAIL_FROM,
  SMART_REFILL_EMAIL_LOGO_SRC,
  buildOutreachMailto,
  escapeHtmlForEmail,
  firstNameFromDisplay,
  openOutreachMailto,
} from "@/lib/email/outreach-email-shared";

const SUPPORT_EMAIL = "support@riverph.com";

export type LegacyStationEmailInput = {
  recipientName?: string | null;
  businessName?: string | null;
};

function greetingName(input: LegacyStationEmailInput): string {
  const person = firstNameFromDisplay(input.recipientName);
  if (person) return person;
  return input.businessName?.trim() || "";
}

export function buildLegacyStationSubject(
  input: LegacyStationEmailInput = {},
): string {
  const name = greetingName(input);
  return name ?
      `Kumusta po, ${name} — update tungkol sa Smart Refill station ninyo`
    : "Kumusta po — update tungkol sa Smart Refill station ninyo";
}

export function buildLegacyStationText(
  input: LegacyStationEmailInput = {},
): string {
  const name = greetingName(input);
  const greeting = name ? `Hi ${name},` : "Hi,";
  const businessName = input.businessName?.trim();

  const lines = [
    greeting,
    "",
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "",
    "Gusto lang namin kayong kamustahin — paano na po ang refill station ninyo?",
    "",
  ];

  if (businessName) {
    lines.push(
      `Nakita namin ang profile ninyo for ${businessName} sa dating Smart Refill system.`,
      "",
    );
  } else {
    lines.push(
      "Nakita namin ang profile ninyo sa dating Smart Refill system.",
      "",
    );
  }

  lines.push(
    "May bagong version na po ang Smart Refill — mas madali ang customers, deliveries, at reports. Gusto naming i-check in kung interested kayo mag-upgrade or mag-continue with us.",
    "",
    "Libre po naming i-walkthrough ang updated Smart Refill through a short call (around 15–20 minutes). Doon natin tingnan ang setup ninyo and answer any questions live.",
    "",
    "Pwede niyo rin po kaming hingan ng help or mag-inquire anytime through the chat support sa smartrefill.io — nandiyan po ang team para tumulong.",
    "",
    `Para mag-schedule, pwede po kayong mag-reply sa email na ito, or email kami sa ${SUPPORT_EMAIL}.`,
    "",
    "Maraming salamat po — looking forward to chatting with you!",
    "",
    "Warm regards,",
    "River Support Team",
    SUPPORT_EMAIL,
    "https://riverph.com",
  );

  return lines.join("\n");
}

export function buildLegacyStationHtml(
  input: LegacyStationEmailInput = {},
): string {
  const name = greetingName(input);
  const greeting = escapeHtmlForEmail(name ? `Hi ${name},` : "Hi,");
  const businessName = input.businessName?.trim();
  const businessHtml =
    businessName ?
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Nakita namin ang profile ninyo for
        <strong style="color:#0f172a;">${escapeHtmlForEmail(businessName)}</strong>
        sa dating Smart Refill system.
      </p>`
    : `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Nakita namin ang profile ninyo sa dating Smart Refill system.
      </p>`;
  const year = new Date().getFullYear();
  const subject = escapeHtmlForEmail(buildLegacyStationSubject(input));
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
    Kumusta po! Update tungkol sa Smart Refill station ninyo — libre naming i-walkthrough ang bagong version.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${brand};">Station check-in</p>
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#0f172a;">${greeting}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Kumusta po! Mula po ito sa River Support ng Smart Refill.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Gusto lang namin kayong kamustahin — paano na po ang refill station ninyo?
              </p>
              ${businessHtml}
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                May bagong version na po ang Smart Refill — mas madali ang customers, deliveries, at reports. Gusto naming i-check in kung interested kayo mag-upgrade or mag-continue with us.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Libre po naming i-walkthrough ang updated Smart Refill through a short call (around 15–20 minutes). Doon natin tingnan ang setup ninyo and answer any questions live.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                Pwede niyo rin po kaming hingan ng help or mag-inquire anytime through the chat support sa smartrefill.io — nandiyan po ang team para tumulong.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background-color:${brand};">
                    <a href="mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Gusto po naming mag-usap tungkol sa Smart Refill station namin")}"
                      style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Mag-reply sa support
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#64748b;">
                Para mag-schedule, pwede po kayong mag-reply sa email na ito, or email kami sa
                <a href="mailto:${SUPPORT_EMAIL}" style="color:${brand};">${SUPPORT_EMAIL}</a>.
              </p>
              <p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#334155;">
                Maraming salamat po — looking forward to chatting with you!
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

export function buildLegacyStationMailto(
  toEmail: string,
  input: LegacyStationEmailInput = {},
): string {
  return buildOutreachMailto({
    toEmail,
    subject: buildLegacyStationSubject(input),
    body: buildLegacyStationText(input),
  });
}

export function openLegacyStationOutreachEmail(options: {
  email?: string | null;
  businessName?: string | null;
  recipientName?: string | null;
}): void {
  const email = options.email?.trim();
  if (!email || typeof window === "undefined") return;
  openOutreachMailto(
    buildLegacyStationMailto(email, {
      recipientName: options.recipientName,
      businessName: options.businessName,
    }),
  );
}

/** Exposed for previews / docs; matches Brevo payload sender. */
export const LEGACY_STATION_EMAIL_FROM = OUTREACH_EMAIL_FROM;
