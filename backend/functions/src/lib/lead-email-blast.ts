/**
 * Personalize saved blast templates per lead.
 * Tokens: {{firstName}} {{ownerName}} {{businessName}} {{email}} {{phone}}
 * {{stage}} {{warmStatus}} {{leadSource}} {{referredBy}} {{nextFollowUpAt}} {{address}}
 */

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

export const LEAD_EMAIL_BLAST_DAILY_LIMIT = 25;

export function blastUsageDocId(uid: string, dayKey: string): string {
  return `${uid}_${dayKey}`;
}

/** UTC calendar day key YYYY-MM-DD used for daily blast quotas. */
export function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
