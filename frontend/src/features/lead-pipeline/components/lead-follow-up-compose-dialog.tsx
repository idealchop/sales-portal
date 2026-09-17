"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/definitions";
import {
  buildDemoInquirySubject,
  buildDemoInquiryText,
} from "@/lib/email/demo-inquiry-template";
import {
  buildInactiveOwnerSubject,
  buildInactiveOwnerText,
} from "@/lib/email/inactive-owner-template";
import {
  buildLeadFollowUpSubject,
  buildLeadFollowUpText,
} from "@/lib/email/lead-follow-up-template";
import {
  buildNewUserWelcomeSubject,
  buildNewUserWelcomeText,
} from "@/lib/email/new-user-welcome-template";
import {
  buildSubscriptionReminderSubject,
  buildSubscriptionReminderText,
} from "@/lib/email/subscription-reminder-template";
import {
  OUTREACH_EMAIL_BCC,
  OUTREACH_SENDER_OPTIONS,
  outreachSenderByEmail,
} from "@/lib/email/outreach-email-shared";
import { sendSalesOutreachEmail } from "@/lib/sales/api";
import {
  formatLastSignIn,
  formatWarmStatusForSave,
  inputClassName,
  labelClassName,
  leadQueueBucket,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { useAuthUid } from "@/hooks/use-auth-uid";
import { useLeadAssignees } from "@/hooks/use-lead-assignees";

type TemplateId =
  | "lead_follow_up"
  | "demo_inquiry"
  | "new_user_registration"
  | "subscription_reminder"
  | "inactive_catch_up"
  | "personalized";

const TEMPLATE_OPTIONS: Array<{
  id: TemplateId;
  label: string;
  description: string;
  /** When set, only show for that queue (plus always for personalized). */
  queues?: Array<"warm" | "cold" | "onboarded" | "archive">;
}> = [
  {
    id: "lead_follow_up",
    label: "Lead follow-up",
    description: "Short pipeline follow-up for this lead.",
    queues: ["warm", "cold", "archive"],
  },
  {
    id: "demo_inquiry",
    label: "Demo follow-up",
    description: "Follow up on a Smart Refill demo inquiry.",
    queues: ["warm", "cold", "archive"],
  },
  {
    id: "new_user_registration",
    label: "New user welcome",
    description: "Kamustahan for newly registered owners.",
    queues: ["warm", "cold", "archive"],
  },
  {
    id: "subscription_reminder",
    label: "Subscription reminder",
    description: "Renewal, expiry, or grace-period nudge for onboarded owners.",
    queues: ["onboarded"],
  },
  {
    id: "inactive_catch_up",
    label: "Inactive catch-up",
    description: "Kamustahan for onboarded owners who went quiet.",
    queues: ["onboarded"],
  },
  {
    id: "personalized",
    label: "Write your own",
    description: "Start from a blank subject and message.",
  },
];

function formatExpiresLabel(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function templateContent(
  templateId: TemplateId,
  lead: Lead,
): { subject: string; body: string } {
  const input = {
    ownerName: lead.ownerName,
    recipientName: lead.ownerName,
    businessName: lead.businessName,
  };

  switch (templateId) {
  case "demo_inquiry":
    return {
      subject: buildDemoInquirySubject(input),
      body: buildDemoInquiryText(input),
    };
  case "new_user_registration":
    return {
      subject: buildNewUserWelcomeSubject(input),
      body: buildNewUserWelcomeText(input),
    };
  case "subscription_reminder":
    return {
      subject: buildSubscriptionReminderSubject({
        ...input,
        planName: lead.workspace?.planName,
        expiresLabel: formatExpiresLabel(
          lead.onboardedMonitor?.subscription?.expiresAt ||
            lead.subscriptionExpiresAt,
        ),
      }),
      body: buildSubscriptionReminderText({
        ...input,
        planName: lead.workspace?.planName,
        expiresLabel: formatExpiresLabel(
          lead.onboardedMonitor?.subscription?.expiresAt ||
            lead.subscriptionExpiresAt,
        ),
      }),
    };
  case "inactive_catch_up":
    return {
      subject: buildInactiveOwnerSubject(input),
      body: buildInactiveOwnerText(input),
    };
  case "personalized":
    return { subject: "", body: "" };
  case "lead_follow_up":
  default:
    return {
      subject: buildLeadFollowUpSubject(input),
      body: buildLeadFollowUpText(input),
    };
  }
}

function defaultTemplateForLead(lead: Lead): TemplateId {
  const queue = leadQueueBucket(lead.stage);
  if (queue !== "onboarded") return "lead_follow_up";

  const flags = new Set(lead.onboardedMonitor?.flags ?? []);
  if (
    flags.has("subscription_grace_period") ||
    flags.has("subscription_expiring_soon") ||
    flags.has("subscription_renew") ||
    flags.has("subscription_change")
  ) {
    return "subscription_reminder";
  }
  if (
    flags.has("journey_inactive_day8") ||
    flags.has("recommend_move_to_cold") ||
    formatLastSignIn(lead.lastSignInAt, lead.lastActiveDay) === "Never"
  ) {
    return "inactive_catch_up";
  }
  return "inactive_catch_up";
}

function templatesForLead(lead: Lead) {
  const queue = leadQueueBucket(lead.stage);
  return TEMPLATE_OPTIONS.filter(
    (option) => !option.queues || option.queues.includes(queue),
  );
}

export function LeadFollowUpComposeDialog({
  open,
  lead,
  onClose,
  onSave,
}: {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSave: (
    input: Partial<Lead> & { bumpAttempt?: boolean },
    leadId: string,
  ) => Promise<void>;
}) {
  const { uid } = useAuthUid();
  const { members } = useLeadAssignees();
  const [templateId, setTemplateId] = useState<TemplateId>("lead_follow_up");
  const [senderEmail, setSenderEmail] = useState(
    OUTREACH_SENDER_OPTIONS[0].email,
  );
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !lead) return;
    const nextTemplate = defaultTemplateForLead(lead);
    const content = templateContent(nextTemplate, lead);
    setTemplateId(nextTemplate);
    setToEmail(lead.email?.trim() || "");
    setSubject(content.subject);
    setBody(content.body);
    setMessage(null);
    setError(null);

    const currentMember = members.find((member) => member.id === uid);
    const preferred = outreachSenderByEmail(currentMember?.email);
    setSenderEmail(preferred.email);
  }, [open, lead, members, uid]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const recipientLabel = useMemo(() => {
    if (!lead) return "";
    return lead.ownerName?.trim() || lead.businessName?.trim() || "Lead";
  }, [lead]);

  const selectedSender = useMemo(
    () => outreachSenderByEmail(senderEmail),
    [senderEmail],
  );

  if (!open || !lead || typeof document === "undefined") return null;

  const visibleTemplates = templatesForLead(lead);

  async function logFollowUpAttempt(messageId?: string | null) {
    if (!lead) return;
    const awaitingStatus = formatWarmStatusForSave("awaiting_reply", "");
    const note = "Follow-up email sent via Brevo — awaiting reply.";
    await onSave(
      {
        warmStatus: awaitingStatus,
        lastContactAt: new Date().toISOString(),
        lastContactedByUid: uid || lead.lastContactedByUid || undefined,
        channels: {
          ...lead.channels,
          email: true,
        },
        notes: note,
        stallReason: note,
        bumpAttempt: true,
        ...(messageId ?
          {
            lastOutreachMessageId: messageId.replace(/^<|>$/g, ""),
            lastOutreachOpenedAt: null,
          }
        : {}),
      },
      lead.id,
    );
  }

  function applyTemplate(next: TemplateId) {
    if (!lead) return;
    setTemplateId(next);
    const content = templateContent(next, lead);
    setSubject(content.subject);
    setBody(content.body);
    setMessage(null);
    setError(null);
  }

  async function handleSendBrevo() {
    const email = toEmail.trim();
    if (!email) {
      setError("Add a recipient email address.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError("Subject and message are required.");
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await sendSalesOutreachEmail({
        toEmail: email,
        kind: "personalized",
        recipientName: lead.ownerName,
        businessName: lead.businessName,
        subject: subject.trim(),
        bodyText: body.trim(),
        leadId: lead.id,
        senderEmail: selectedSender.email,
        senderName: selectedSender.name,
      });
      if (result.outreach.skipped) {
        setMessage(
          "Brevo skipped — API key not configured. Add SMARTREFILL_BREVO_API_KEY to backend/functions/.env.local and restart the API.",
        );
        return;
      }
      setLogging(true);
      await logFollowUpAttempt(result.outreach.messageId);
      setMessage(
        `Sent via Brevo · logged as attempt · ${result.outreach.subject}`,
      );
      onClose();
    } catch {
      setError("Unable to send email via Brevo.");
    } finally {
      setLogging(false);
      setSending(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-4 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-follow-up-title"
        className="my-auto flex max-h-[min(92vh,860px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                Follow up via email
              </p>
              <h2
                id="lead-follow-up-title"
                className="mt-1 text-xl font-semibold tracking-tight text-zinc-900"
              >
                {lead.businessName}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                Compose for {recipientLabel}. Sending logs an attempt and sets
                status to Awaiting reply.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section>
            <p className={labelClassName}>Email template</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {visibleTemplates.map((option) => {
                const active = templateId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => applyTemplate(option.id)}
                    className={
                      active ?
                        "rounded-xl border border-teal-300 bg-teal-50 px-3 py-3 text-left"
                      : "rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left hover:border-teal-200"
                    }
                  >
                    <div className="text-sm font-medium text-zinc-900">
                      {option.label}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <label className={labelClassName} htmlFor="lead-follow-up-from">
                Sender
              </label>
              <select
                id="lead-follow-up-from"
                className={inputClassName}
                value={senderEmail}
                onChange={(event) => setSenderEmail(event.target.value)}
              >
                {OUTREACH_SENDER_OPTIONS.map((option) => (
                  <option key={option.id} value={option.email}>
                    {option.name} · {option.email}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Replies will go to this sender. Must be a verified Brevo address.
              </p>
            </div>
            <div>
              <label className={labelClassName} htmlFor="lead-follow-up-to">
                To
              </label>
              <input
                id="lead-follow-up-to"
                type="email"
                className={inputClassName}
                value={toEmail}
                onChange={(event) => setToEmail(event.target.value)}
                placeholder="lead@email.com"
              />
            </div>
            <div>
              <label
                className={labelClassName}
                htmlFor="lead-follow-up-subject"
              >
                Subject
              </label>
              <input
                id="lead-follow-up-subject"
                className={inputClassName}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="lead-follow-up-body">
                Message
              </label>
              <textarea
                id="lead-follow-up-body"
                className={`${inputClassName} min-h-[220px] resize-y`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write your follow-up…"
              />
            </div>
            <p className="text-xs text-zinc-500">
              From {selectedSender.name} &lt;{selectedSender.email}&gt; · BCC{" "}
              {OUTREACH_EMAIL_BCC.join(", ")}
            </p>
          </section>

          {error ?
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          : null}
          {message ?
            <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
              {message}
            </p>
          : null}
        </div>

        <footer className="shrink-0 border-t border-zinc-100 bg-zinc-50/80 px-6 py-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void handleSendBrevo()}
              disabled={sending || logging}
            >
              {sending || logging ?
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              : <Send className="mr-1.5 h-3.5 w-3.5" />}
              {sending || logging ? "Sending…" : "Send via Brevo"}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
