import { db, FieldValue } from "../config/firebase-admin";
import {
  LEAD_EMAIL_BLAST_DAILY_LIMIT,
  blastUsageDocId,
  personalizeLeadEmailText,
  utcDayKey,
} from "../lib/lead-email-blast";
import { sendOutreachEmail } from "./outreach/send-outreach-email";
import type { SalesActor } from "./sales-scope";
import { getLead, updateLead } from "./leads-service";

export type LeadEmailBlastQuota = {
  dayKey: string;
  limit: number;
  used: number;
  remaining: number;
};

export type LeadEmailBlastInput = {
  leadIds: string[];
  subject: string;
  bodyText: string;
  countAsAttempt?: boolean;
  senderEmail?: string;
  senderName?: string;
  templateId?: string;
};

export type LeadEmailBlastResult = {
  quota: LeadEmailBlastQuota;
  sent: number;
  skipped: number;
  failed: number;
  attemptLogged: number;
  results: Array<{
    leadId: string;
    email?: string;
    status: "sent" | "skipped" | "failed";
    reason?: string;
    messageId?: string;
  }>;
};

const BLAST_MAX_PER_REQUEST = LEAD_EMAIL_BLAST_DAILY_LIMIT;

async function readQuota(actor: SalesActor, dayKey: string): Promise<LeadEmailBlastQuota> {
  const ref = db.collection("sales_lead_email_blast_usage").doc(
    blastUsageDocId(actor.uid, dayKey),
  );
  const snap = await ref.get();
  const used = Math.max(0, Number(snap.data()?.count) || 0);
  return {
    dayKey,
    limit: LEAD_EMAIL_BLAST_DAILY_LIMIT,
    used,
    remaining: Math.max(0, LEAD_EMAIL_BLAST_DAILY_LIMIT - used),
  };
}

async function incrementQuota(
  actor: SalesActor,
  dayKey: string,
  by: number,
): Promise<LeadEmailBlastQuota> {
  if (by <= 0) return readQuota(actor, dayKey);
  const ref = db.collection("sales_lead_email_blast_usage").doc(
    blastUsageDocId(actor.uid, dayKey),
  );
  await ref.set(
    {
      uid: actor.uid,
      dayKey,
      count: FieldValue.increment(by),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return readQuota(actor, dayKey);
}

export async function getLeadEmailBlastQuota(
  actor: SalesActor,
): Promise<LeadEmailBlastQuota> {
  return readQuota(actor, utcDayKey());
}

function awaitingReplyStatus(): string {
  return "Awaiting reply";
}

export async function sendLeadEmailBlast(
  actor: SalesActor,
  input: LeadEmailBlastInput,
): Promise<LeadEmailBlastResult> {
  const subject = input.subject?.trim() || "";
  const bodyText = input.bodyText?.trim() || "";
  if (!subject || !bodyText) throw new Error("BLAST_FIELDS_REQUIRED");

  const leadIds = [
    ...new Set(
      (Array.isArray(input.leadIds) ? input.leadIds : [])
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  if (leadIds.length === 0) throw new Error("LEAD_IDS_REQUIRED");
  if (leadIds.length > BLAST_MAX_PER_REQUEST) {
    throw new Error("TOO_MANY_BLAST_RECIPIENTS");
  }

  const dayKey = utcDayKey();
  let quota = await readQuota(actor, dayKey);
  if (quota.remaining <= 0) throw new Error("DAILY_BLAST_LIMIT_REACHED");
  if (leadIds.length > quota.remaining) throw new Error("DAILY_BLAST_LIMIT_EXCEEDED");

  const results: LeadEmailBlastResult["results"] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let attemptLogged = 0;

  for (const leadId of leadIds) {
    try {
      const lead = await getLead(actor, leadId);
      if (!lead) {
        failed += 1;
        results.push({ leadId, status: "failed", reason: "NOT_FOUND" });
        continue;
      }
      const email = lead.email?.trim();
      if (!email || !email.includes("@")) {
        skipped += 1;
        results.push({
          leadId,
          status: "skipped",
          reason: "NO_EMAIL",
        });
        continue;
      }

      const personalizedSubject = personalizeLeadEmailText(subject, lead);
      const personalizedBody = personalizeLeadEmailText(bodyText, lead);

      const outreach = await sendOutreachEmail({
        toEmail: email,
        kind: "personalized",
        personalization: {
          recipientName: lead.ownerName,
          businessName: lead.businessName,
        },
        customSubject: personalizedSubject,
        customBodyText: personalizedBody,
        actorUid: actor.uid,
        leadId: lead.id,
        senderEmail: input.senderEmail,
        senderName: input.senderName,
      });

      if (outreach.skipped) {
        skipped += 1;
        results.push({
          leadId,
          email,
          status: "skipped",
          reason: "BREVO_SKIPPED",
          messageId: outreach.messageId,
        });
        continue;
      }

      sent += 1;
      results.push({
        leadId,
        email,
        status: "sent",
        messageId: outreach.messageId,
      });

      if (input.countAsAttempt) {
        const note = "Email blast sent via Brevo — awaiting reply.";
        await updateLead(actor, lead.id, {
          warmStatus: awaitingReplyStatus(),
          lastContactAt: new Date().toISOString(),
          lastContactedByUid: actor.uid,
          channels: { ...lead.channels, email: true },
          notes: note,
          stallReason: note,
          bumpAttempt: true,
          lastOutreachMessageId:
            outreach.messageId?.replace(/^<|>$/g, "") || null,
          lastOutreachOpenedAt: null,
        });
        attemptLogged += 1;
      }
    } catch (error) {
      failed += 1;
      results.push({
        leadId,
        status: "failed",
        reason: error instanceof Error ? error.message : "SEND_FAILED",
      });
    }
  }

  if (sent > 0) {
    quota = await incrementQuota(actor, dayKey, sent);
  } else {
    quota = await readQuota(actor, dayKey);
  }

  return {
    quota,
    sent,
    skipped,
    failed,
    attemptLogged,
    results,
  };
}
