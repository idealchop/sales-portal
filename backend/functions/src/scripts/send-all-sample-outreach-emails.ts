/**
 * Send one sample of every Sales Portal outreach email via Brevo.
 *
 * Usage (from backend/functions):
 *   npx ts-node --transpile-only src/scripts/send-all-sample-outreach-emails.ts you@example.com
 */
import { existsSync } from "fs";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";
import * as brevo from "@getbrevo/brevo";
import { OUTREACH_SENDER } from "../services/outreach/outreach-constants";
import {
  buildOutreachEmailByKind,
  type OutreachTemplateKind,
} from "../services/outreach/outreach-templates";

function loadEnv(): void {
  const functionsDir = resolve(__dirname, "../..");
  const candidates = [
    resolve(functionsDir, ".env.local"),
    resolve(functionsDir, ".env"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) dotenv.config({ path: file });
  }
}

loadEnv();

const SAMPLE_EMAIL = "justfer@riverph.com";
const PERSONALIZATION = {
  recipientName: "Justfer",
  businessName: "Smart Refill Demo",
};

const KINDS: OutreachTemplateKind[] = [
  "new_user_registration",
  "demo_inquiry",
  "inactive_owner",
  "legacy_station",
  "generic",
  "personalized",
];

const MAILTO_ONLY: Array<{
  tag: string;
  subject: string;
  bodyText: string;
}> = [
  {
    tag: "sales_portal_lead_follow_up",
    subject: "Follow-up — Smart Refill Demo · Smart Refill",
    bodyText:
      "Kumusta po, Justfer!\n\n" +
      "Gusto lang naming i-follow up regarding Smart Refill Demo and Smart Refill.\n\n" +
      "Pwede po ba kayong mag-reply dito kung kelan kayo available for a quick chat?\n\n" +
      "Salamat po!\nSmart Refill Team",
  },
  {
    tag: "sales_portal_subscription_reminder",
    subject: "Kumusta po, Justfer — reminder sa subscription ng Smart Refill Demo",
    bodyText:
      "Kumusta po, Justfer!\n\n" +
      "Mula po ito sa River Support ng Smart Refill.\n\n" +
      "Gusto lang naming i-remind kayo regarding sa subscription ng Smart Refill Demo.\n\n" +
      "Plan: Scale monthly · Expires / renews around Oct 20, 2026.\n\n" +
      "Para tuloy-tuloy ang access ninyo sa Smart Refill, please renew or update your plan asap.",
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function main(): Promise<void> {
  const sendLive = process.argv.includes("--send");
  const email = String(
    process.argv.find((arg) => arg.includes("@")) || SAMPLE_EMAIL,
  ).trim().toLowerCase();
  if (sendLive && !email.includes("@")) {
    throw new Error("Pass a recipient email as the first argument.");
  }
  const apiKey =
    process.env.SMARTREFILL_BREVO_API_KEY?.trim() ||
    process.env.SALES_PORTAL_BREVO_API_KEY?.trim();
  if (sendLive && !apiKey) {
    throw new Error("SMARTREFILL_BREVO_API_KEY is missing");
  }

  const outDir = resolve("/tmp/river-email-samples/sales-portal");
  mkdirSync(outDir, { recursive: true });

  const api = sendLive ? new brevo.TransactionalEmailsApi() : null;
  if (api && apiKey) {
    api.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  }

  const payloads = [
    ...KINDS.map((kind) =>
      buildOutreachEmailByKind(
        kind,
        PERSONALIZATION,
        kind === "personalized" ?
          {
            subject: "Personal check-in — Smart Refill Demo",
            bodyText:
              "This is a sample personalized outreach from Sales Portal.\n\n" +
              "We can help with onboarding, billing, or a live demo whenever you are ready.",
          } :
          undefined,
      ),
    ),
    ...MAILTO_ONLY.map((row) => {
      const tpl = buildOutreachEmailByKind("personalized", PERSONALIZATION, {
        subject: row.subject,
        bodyText: row.bodyText,
      });
      return { ...tpl, brevoTag: row.tag };
    }),
  ];

  const indexItems: string[] = [];
  for (const tpl of payloads) {
    writeFileSync(resolve(outDir, `${tpl.brevoTag}.html`), tpl.html, "utf8");
    indexItems.push(
      `<li><a href="./${tpl.brevoTag}.html">${tpl.brevoTag}</a> — ${tpl.subject.replace(/</g, "&lt;")}</li>`,
    );
    console.log(`wrote ${tpl.brevoTag}`);
    if (!sendLive || !api) continue;
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: OUTREACH_SENDER.name,
      email: OUTREACH_SENDER.email,
    };
    sendSmtpEmail.to = [{ email, name: "Justfer" }];
    sendSmtpEmail.subject = `[SAMPLE] ${tpl.subject}`;
    sendSmtpEmail.htmlContent = tpl.html;
    sendSmtpEmail.textContent = tpl.text;
    sendSmtpEmail.tags = [tpl.brevoTag, "email_template_sample"];
    await api.sendTransacEmail(sendSmtpEmail);
    console.log(`sent ${tpl.brevoTag}`);
    await sleep(250);
  }
  writeFileSync(
    resolve(outDir, "index.html"),
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sales Portal email samples</title></head>
<body style="font-family:system-ui;padding:24px;max-width:720px;">
<h1>Sales Portal email samples</h1>
<p>${payloads.length} templates</p>
<ul>${indexItems.join("")}</ul>
</body></html>`,
    "utf8",
  );
  console.log(`Wrote ${payloads.length} HTML files to ${outDir}`);
  if (sendLive) {
    console.log(`Sent ${payloads.length} Sales Portal samples to ${email}`);
  } else {
    console.log("HTML-only (pass --send to deliver via Brevo)");
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
