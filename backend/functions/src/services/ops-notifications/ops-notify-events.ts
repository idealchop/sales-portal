import { escapeHtmlForEmail } from "../outreach/outreach-constants";

export const OPS_NOTIFY_TO = {
  name: "River Support",
  email: "support@riverph.com",
} as const;

/** Keith Abante — Marketing & Sales. Address from the Smart Refill account export. */
export const KEITH_ABANTE_EMAIL = "abantekeithh@gmail.com";

export const OPS_NOTIFY_CC = [
  { name: "Jimboy", email: "jimboy@smartrefill.io" },
  { name: "Wina", email: "wina@riverph.com" },
  { name: "Keith Abante", email: KEITH_ABANTE_EMAIL },
] as const;

const SALES_PORTAL_SUBSCRIPTIONS_URL =
  "https://sales-river-tech.web.app/webapp/smartrefill";

const TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  "superseded",
  "expired",
  "cancelled",
  "canceled",
]);

export type OpsNotifyEmail = {
  noticeId: string;
  subject: string;
  html: string;
  text: string;
  brevoTag: string;
};

function textValue(data: Record<string, unknown> | undefined, key: string): string {
  const value = data?.[key];
  return typeof value === "string" ? value.trim() : "";
}

export function hasSmartrefillAccess(
  data: Record<string, unknown> | undefined,
): boolean {
  const rows = data?.appAccess;
  if (!Array.isArray(rows)) return false;
  return rows.some((row) => {
    if (!row || typeof row !== "object") return false;
    return String((row as { appId?: string }).appId || "").toLowerCase() === "smartrefill";
  });
}

function isIgnoredAccount(data: Record<string, unknown> | undefined): boolean {
  if (!data) return true;
  if (data.authAccountTag === "test") return true;
  const email = textValue(data, "email").toLowerCase();
  return email === "demo@smartrefill.com";
}

export function isNewSmartrefillRegistration(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  if (!after || isIgnoredAccount(after)) return false;
  const email = textValue(after, "email");
  if (!email.includes("@")) return false;
  return !hasSmartrefillAccess(before) && hasSmartrefillAccess(after);
}

export function isOnboardingJustCompleted(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  businessId?: string,
): boolean {
  if (!after || isIgnoredAccount(after)) return false;
  if (businessId === "demo_smartrefill_clone") return false;
  return before?.onboardingComplete !== true && after.onboardingComplete === true;
}

export function subscriptionNeedsReview(
  data: Record<string, unknown> | undefined,
): boolean {
  if (!data) return false;
  const status = String(data.status || "").toLowerCase();
  if (TERMINAL_SUBSCRIPTION_STATUSES.has(status)) return false;
  const payment = String(data.paymentStatus || "").toLowerCase();
  return (
    payment === "pending_verification" ||
    payment === "pending" ||
    status === "pending"
  );
}

export function enteredSubscriptionReview(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  return subscriptionNeedsReview(after) && !subscriptionNeedsReview(before);
}

function displayName(data: Record<string, unknown>): string {
  return (
    textValue(data, "displayName") ||
    textValue(data, "fullName") ||
    textValue(data, "name") ||
    textValue(data, "email") ||
    "New user"
  );
}

function noticeToken(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 200);
}

function layout(title: string, lines: string[]): { html: string; text: string } {
  const text = [title, "", ...lines, "", `Sales Portal: ${SALES_PORTAL_SUBSCRIPTIONS_URL}`].join("\n");
  const body = lines
    .map((line) => `<p style="margin:0 0 8px;">${escapeHtmlForEmail(line)}</p>`)
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;font-size:14px;line-height:1.5;">
<p style="margin:0 0 12px;font-size:16px;font-weight:700;">${escapeHtmlForEmail(title)}</p>
${body}
<p style="margin:16px 0 0;"><a href="${SALES_PORTAL_SUBSCRIPTIONS_URL}">Open Sales Portal</a></p>
</div>`;
  return { html, text };
}

export function buildRegistrationNotice(
  userId: string,
  user: Record<string, unknown>,
): OpsNotifyEmail {
  const name = displayName(user);
  const email = textValue(user, "email");
  const subject = `New Smart Refill registration — ${name}`;
  const { html, text } = layout(subject, [
    `${name} just registered for Smart Refill.`,
    `Email: ${email}`,
  ]);
  return {
    noticeId: `register_${noticeToken(userId)}`,
    subject,
    html,
    text,
    brevoTag: "sales_portal_ops_registration",
  };
}

export function buildOnboardingNotice(
  businessId: string,
  business: Record<string, unknown>,
): OpsNotifyEmail {
  const station = textValue(business, "name") || textValue(business, "businessName") || businessId;
  const email = textValue(business, "email");
  const phone = textValue(business, "phone");
  const subject = `Smart Refill onboarding complete — ${station}`;
  const lines = [`${station} finished onboarding.`];
  if (email) lines.push(`Email: ${email}`);
  if (phone) lines.push(`Phone: ${phone}`);
  const { html, text } = layout(subject, lines);
  return {
    noticeId: `onboarding_${noticeToken(businessId)}`,
    subject,
    html,
    text,
    brevoTag: "sales_portal_ops_onboarding",
  };
}

export function buildSubscriptionReviewNotice(input: {
  businessId: string;
  subscriptionId: string;
  businessName: string;
  ownerEmail?: string;
  subscription: Record<string, unknown>;
}): OpsNotifyEmail {
  const plan =
    textValue(input.subscription, "planName") ||
    textValue(input.subscription, "planCode") ||
    "Subscription";
  const cycle = textValue(input.subscription, "billingCycle");
  const payment = textValue(input.subscription, "paymentStatus") || textValue(input.subscription, "status");
  const reference = textValue(input.subscription, "paymentReference");
  const price = Number(input.subscription.price);
  const amount = Number.isFinite(price) ? `₱${price.toLocaleString("en-PH")}` : "";
  const subject = `Subscription needs review — ${input.businessName} · ${plan}`;
  const lines = [
    `${input.businessName} submitted a subscription for review.`,
    `Plan: ${plan}${cycle ? ` (${cycle})` : ""}`,
  ];
  if (amount) lines.push(`Amount: ${amount}`);
  if (payment) lines.push(`Payment: ${payment.replace(/_/g, " ")}`);
  if (reference) lines.push(`Reference: ${reference}`);
  if (input.ownerEmail) lines.push(`Owner: ${input.ownerEmail}`);
  const { html, text } = layout(subject, lines);
  return {
    noticeId: [
      "review",
      noticeToken(input.businessId),
      noticeToken(input.subscriptionId),
      noticeToken(payment || "pending"),
      noticeToken(reference || "none"),
    ].join("_"),
    subject,
    html,
    text,
    brevoTag: "sales_portal_ops_subscription_review",
  };
}
