/** Shared personalization + daily blast limit for lead pipeline email blasts. */

export const LEAD_EMAIL_BLAST_DAILY_LIMIT = 25;

export type LeadEmailTokenLead = {
  businessName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  stage?: string;
  warmStatus?: string;
  leadSource?: string;
  referredBy?: string;
  nextFollowUpAt?: string | null;
  address?: string;
};

/** Tokens users can insert into subject/body — kept in sync with personalizeLeadEmailText. */
export const LEAD_EMAIL_TOKENS = [
  {
    token: "{{firstName}}",
    label: "First name",
    description: "First word of the owner name (e.g. Ana)",
  },
  {
    token: "{{ownerName}}",
    label: "Owner name",
    description: "Full contact / owner name",
  },
  {
    token: "{{businessName}}",
    label: "Business",
    description: "Station or business name",
  },
  {
    token: "{{email}}",
    label: "Email",
    description: "Lead email address",
  },
  {
    token: "{{phone}}",
    label: "Phone",
    description: "Lead phone number",
  },
  {
    token: "{{stage}}",
    label: "Stage",
    description: "Pipeline stage label (Warm, Cold, …)",
  },
  {
    token: "{{warmStatus}}",
    label: "Status",
    description: "Latest warm status text",
  },
  {
    token: "{{leadSource}}",
    label: "Source",
    description: "How the lead came in (FB Ads, Website, …)",
  },
  {
    token: "{{referredBy}}",
    label: "Referrer",
    description: "Referral name when source is Referrals",
  },
  {
    token: "{{nextFollowUpAt}}",
    label: "Follow-up date",
    description: "Next follow-up date if set",
  },
  {
    token: "{{address}}",
    label: "Address",
    description: "Lead address when available",
  },
] as const;

export type LeadEmailToken = (typeof LEAD_EMAIL_TOKENS)[number]["token"];

const STAGE_LABELS: Record<string, string> = {
  inquire: "Inquire",
  warm: "Warm",
  cold: "Cold",
  registered: "Registered",
  onboarded: "Onboarded",
  archive: "Archive",
};

export function firstNameFromDisplay(name?: string | null): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] || "";
}

function formatFollowUpDate(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function personalizeLeadEmailText(
  template: string,
  lead: LeadEmailTokenLead,
): string {
  const stageKey = (lead.stage || "").trim();
  const replacements: Array<[string, string]> = [
    ["{{businessName}}", lead.businessName?.trim() || ""],
    ["{{ownerName}}", lead.ownerName?.trim() || ""],
    ["{{firstName}}", firstNameFromDisplay(lead.ownerName)],
    ["{{email}}", lead.email?.trim() || ""],
    ["{{phone}}", lead.phone?.trim() || ""],
    ["{{stage}}", STAGE_LABELS[stageKey] || stageKey],
    ["{{warmStatus}}", lead.warmStatus?.trim() || ""],
    ["{{leadSource}}", lead.leadSource?.trim() || ""],
    ["{{referredBy}}", lead.referredBy?.trim() || ""],
    ["{{nextFollowUpAt}}", formatFollowUpDate(lead.nextFollowUpAt)],
    ["{{address}}", lead.address?.trim() || ""],
  ];
  let out = template;
  for (const [token, value] of replacements) {
    out = out.split(token).join(value);
  }
  return out;
}

export function leadsWithEmailCount(
  leads: Array<{ email?: string }>,
): number {
  return leads.filter((lead) => {
    const email = lead.email?.trim();
    return Boolean(email && email.includes("@"));
  }).length;
}

export function summarizeLeadEmailBlast(input: {
  sent: number;
  skipped: number;
  failed: number;
  attemptLogged: number;
  remaining: number;
}): string {
  const parts = [
    `Sent ${input.sent}`,
    input.skipped > 0 ? `skipped ${input.skipped}` : null,
    input.failed > 0 ? `failed ${input.failed}` : null,
  ].filter(Boolean);
  let message = parts.join(", ") + ".";
  if (input.attemptLogged > 0) {
    message += ` Logged attempt on ${input.attemptLogged}.`;
  }
  message += ` ${input.remaining} of ${LEAD_EMAIL_BLAST_DAILY_LIMIT} remaining today.`;
  return message;
}
