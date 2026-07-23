import {
  OUTREACH_BRAND_COLOR,
  OUTREACH_SENDER,
  SMART_REFILL_EMAIL_LOGO_SRC,
  escapeHtmlForEmail,
  firstNameFromDisplay,
} from "./outreach-constants";

export type OutreachEmailPayload = {
  subject: string;
  html: string;
  text: string;
  brevoTag: string;
};

export type OutreachPersonalization = {
  recipientName?: string | null;
  businessName?: string | null;
  subtitle?: string | null;
};

function wrapHtml(input: {
  subject: string;
  eyebrow: string;
  greeting: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaMailtoSubject?: string;
}): string {
  const year = new Date().getFullYear();
  const brand = OUTREACH_BRAND_COLOR;
  const support = OUTREACH_SENDER.email;
  const paragraphsHtml = input.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${p}</p>`,
    )
    .join("");
  const cta =
    input.ctaLabel ?
      `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
        <tr>
          <td style="border-radius:8px;background-color:${brand};">
            <a href="mailto:${support}?subject=${encodeURIComponent(input.ctaMailtoSubject || input.ctaLabel)}"
              style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
              ${escapeHtmlForEmail(input.ctaLabel)}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="fil">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtmlForEmail(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${brand};">${escapeHtmlForEmail(input.eyebrow)}</p>
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#0f172a;">${input.greeting}</h1>
              ${paragraphsHtml}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#0f172a;">River Support Team</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">
                <a href="mailto:${support}" style="color:${brand};text-decoration:none;">${support}</a>
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

function greetingLine(name: string): string {
  return name ? `Hi ${name},` : "Hi,";
}

export function buildNewUserOutreachEmail(
  input: OutreachPersonalization = {},
): OutreachEmailPayload {
  const name = firstNameFromDisplay(input.recipientName);
  const businessName = input.businessName?.trim();
  const subject = name ?
      `Kumusta po, ${name} — paano na ang Smart Refill ninyo?`
    : "Kumusta po — paano na ang Smart Refill ninyo?";
  const paragraphs = [
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "Gusto lang namin kayong kamustahin regarding sa paggamit ninyo ng app so far.",
  ];
  if (businessName) {
    paragraphs.push(
      `Napansin namin na newly registered na po kayo for <strong style="color:#0f172a;">${escapeHtmlForEmail(businessName)}</strong>.`,
    );
  }
  paragraphs.push(
    "Smooth ba ang experience ninyo? May questions or concerns ba kayo sa setup, transactions, customers, o sa ibang features? Feel free po to share — handa po kaming tumulong.",
    "Pwede niyo rin po kaming hingan ng help or mag-inquire anytime through the in-app chat support ng Smart Refill — nandiyan po ang team para tumulong.",
    "If ever gusto ninyo, libre po naming i-walkthrough ang Smart Refill through a short demo (around 15–20 minutes). Doon natin pag-uusapan ang features na most useful for your station, and we can answer your questions live.",
    `Para mag-schedule, pwede po kayong mag-reply sa email na ito, or email kami sa ${OUTREACH_SENDER.email} with your preferred date and time.`,
    "Maraming salamat po, and welcome to Smart Refill!",
  );

  const textLines = [
    greetingLine(name),
    "",
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "",
    "Gusto lang namin kayong kamustahin regarding sa paggamit ninyo ng app so far.",
  ];
  if (businessName) {
    textLines.push(
      "",
      `Napansin namin na newly registered na po kayo for ${businessName}.`,
    );
  }
  textLines.push(
    "",
    "Smooth ba ang experience ninyo? May questions or concerns ba kayo sa setup, transactions, customers, o sa ibang features? Feel free po to share — handa po kaming tumulong.",
    "",
    "Pwede niyo rin po kaming hingan ng help or mag-inquire anytime through the in-app chat support ng Smart Refill — nandiyan po ang team para tumulong.",
    "",
    "If ever gusto ninyo, libre po naming i-walkthrough ang Smart Refill through a short demo (around 15–20 minutes).",
    "",
    `Para mag-schedule, reply or email ${OUTREACH_SENDER.email}.`,
    "",
    "Maraming salamat po, and welcome to Smart Refill!",
    "",
    "Warm regards,",
    "River Support Team",
    OUTREACH_SENDER.email,
  );

  return {
    subject,
    html: wrapHtml({
      subject,
      eyebrow: "Quick kamustahan",
      greeting: escapeHtmlForEmail(greetingLine(name)),
      paragraphs,
      ctaLabel: "Mag-schedule ng demo",
      ctaMailtoSubject: "Gusto po naming mag-schedule ng Smart Refill demo",
    }),
    text: textLines.join("\n"),
    brevoTag: "sales_portal_new_user_welcome",
  };
}

export function buildDemoInquiryOutreachEmail(
  input: OutreachPersonalization = {},
): OutreachEmailPayload {
  const name = firstNameFromDisplay(input.recipientName);
  const businessName = input.businessName?.trim();
  const subject = name ?
      `Kumusta po, ${name} — tungkol sa Smart Refill demo ninyo`
    : "Kumusta po — tungkol sa Smart Refill demo ninyo";
  const paragraphs = [
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "Salamat po sa interest ninyo — nakatanggap kami ng demo inquiry ninyo, and gusto naming i-follow up.",
  ];
  if (businessName) {
    paragraphs.push(
      `Nakita namin na interested kayo for <strong style="color:#0f172a;">${escapeHtmlForEmail(businessName)}</strong>.`,
    );
  }
  paragraphs.push(
    "Gusto po ba nating mag-schedule ng short demo (around 15–20 minutes)? Doon natin i-walkthrough ang Smart Refill, tingnan ang features na most useful for your station, and we can answer your questions live.",
    "Pwede niyo rin po kaming hingan ng help or mag-inquire anytime through the in-app chat support ng Smart Refill — nandiyan po ang team para tumulong.",
    `Para mag-schedule, pwede po kayong mag-reply sa email na ito, or email kami sa ${OUTREACH_SENDER.email} with your preferred date and time.`,
    "Maraming salamat po, and looking forward to chatting with you!",
  );

  const text = [
    greetingLine(name),
    "",
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "",
    "Salamat po sa interest ninyo — nakatanggap kami ng demo inquiry ninyo, and gusto naming i-follow up.",
    businessName ? `\nNakita namin na interested kayo for ${businessName}.\n` : "",
    "Gusto po ba nating mag-schedule ng short demo (around 15–20 minutes)?",
    "",
    "Pwede niyo rin po kaming hingan ng help through in-app chat support.",
    "",
    `Para mag-schedule, reply or email ${OUTREACH_SENDER.email}.`,
    "",
    "Maraming salamat po!",
    "",
    "Warm regards,",
    "River Support Team",
    OUTREACH_SENDER.email,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: wrapHtml({
      subject,
      eyebrow: "Demo follow-up",
      greeting: escapeHtmlForEmail(greetingLine(name)),
      paragraphs,
      ctaLabel: "Mag-schedule ng demo",
      ctaMailtoSubject: "Gusto po naming mag-schedule ng Smart Refill demo",
    }),
    text,
    brevoTag: "sales_portal_demo_inquiry",
  };
}

export function buildInactiveOwnerOutreachEmail(
  input: OutreachPersonalization = {},
): OutreachEmailPayload {
  const person = firstNameFromDisplay(input.recipientName);
  const businessName = input.businessName?.trim() || "";
  const name = person || businessName;
  const subject = name ?
      `Kumusta po, ${name} — namimiss namin kayo sa Smart Refill`
    : "Kumusta po — namimiss namin kayo sa Smart Refill";
  const paragraphs = [
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "Gusto lang namin kayong kamustahin and mag-check in — how are you right now?",
    "Namimiss po namin kayo sa app. Sana okay lang ang lahat sa inyo.",
  ];
  if (businessName) {
    paragraphs.push(
      `Lalo na for <strong style="color:#0f172a;">${escapeHtmlForEmail(businessName)}</strong> — hoping everything is going smoothly on your end.`,
    );
  }
  paragraphs.push(
    "We’d love to see you continue using Smart Refill. If ever may issue, problem, or something confusing sa app, don’t hesitate po to reach out — handa po kaming tumulong.",
    "Pwede niyo po kaming hingan ng help or mag-inquire anytime through the in-app chat support ng Smart Refill. Nandiyan po ang team para tumulong sa inyo.",
    `Pwede rin po kayong mag-reply sa email na ito, or email kami sa ${OUTREACH_SENDER.email}.`,
    "Maraming salamat po, and hoping to see you back soon!",
  );

  const text = [
    greetingLine(name),
    "",
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "",
    "Gusto lang namin kayong kamustahin and mag-check in — how are you right now?",
    "",
    "Namimiss po namin kayo sa app.",
    businessName ?
      `\nLalo na for ${businessName} — hoping everything is going smoothly.\n`
    : "",
    "We’d love to see you continue using Smart Refill. If may issue, reach out via chat support.",
    "",
    `Reply or email ${OUTREACH_SENDER.email}.`,
    "",
    "Maraming salamat po!",
    "",
    "Warm regards,",
    "River Support Team",
    OUTREACH_SENDER.email,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: wrapHtml({
      subject,
      eyebrow: "We miss you",
      greeting: escapeHtmlForEmail(greetingLine(name)),
      paragraphs,
      ctaLabel: "Contact support",
      ctaMailtoSubject: "Need help with Smart Refill",
    }),
    text,
    brevoTag: "sales_portal_inactive_owner",
  };
}

export function buildGenericAlertOutreachEmail(
  input: OutreachPersonalization = {},
): OutreachEmailPayload {
  const name = firstNameFromDisplay(input.recipientName);
  const subtitle = input.subtitle?.trim() || "your Smart Refill account";
  const subject = name ?
      `Kumusta po, ${name} — follow-up from Smart Refill`
    : "Kumusta po — follow-up from Smart Refill";
  const paragraphs = [
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    `Gusto lang naming i-follow up regarding: ${escapeHtmlForEmail(subtitle)}.`,
    "If ever may questions, concerns, or need help sa app, feel free po to reply or use the in-app chat support ng Smart Refill.",
    "Maraming salamat po!",
  ];
  const text = [
    greetingLine(name),
    "",
    "Kumusta po! Mula po ito sa River Support ng Smart Refill.",
    "",
    `Gusto lang naming i-follow up regarding: ${subtitle}.`,
    "",
    "Reply or use in-app chat support if you need help.",
    "",
    "Maraming salamat po!",
    "",
    "Warm regards,",
    "River Support Team",
    OUTREACH_SENDER.email,
  ].join("\n");

  return {
    subject,
    html: wrapHtml({
      subject,
      eyebrow: "Follow-up",
      greeting: escapeHtmlForEmail(greetingLine(name)),
      paragraphs,
    }),
    text,
    brevoTag: "sales_portal_alert_followup",
  };
}

export type OutreachTemplateKind =
  | "new_user_registration"
  | "demo_inquiry"
  | "inactive_owner"
  | "generic";

export function buildOutreachEmailByKind(
  kind: OutreachTemplateKind,
  input: OutreachPersonalization = {},
): OutreachEmailPayload {
  switch (kind) {
  case "new_user_registration":
    return buildNewUserOutreachEmail(input);
  case "demo_inquiry":
    return buildDemoInquiryOutreachEmail(input);
  case "inactive_owner":
    return buildInactiveOwnerOutreachEmail(input);
  default:
    return buildGenericAlertOutreachEmail(input);
  }
}
