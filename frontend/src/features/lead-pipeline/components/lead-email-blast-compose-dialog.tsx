"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, Mail, Save, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  Lead,
  LeadEmailTemplate,
  LeadEmailTemplateVisibility,
} from "@/lib/definitions";
import type { PromoteEmailDraft } from "@/features/lead-pipeline/lib/lead-promote-offer";
import {
  OUTREACH_SENDER_OPTIONS,
  outreachSenderByEmail,
} from "@/lib/email/outreach-email-shared";
import {
  createLeadEmailTemplate,
  deleteLeadEmailTemplate,
  fetchLeadEmailBlastQuota,
  fetchLeadEmailTemplates,
  sendLeadEmailBlast,
  updateLeadEmailTemplate,
} from "@/lib/sales/api";
import { ApiError } from "@/lib/api-client";
import {
  LEAD_EMAIL_BLAST_DAILY_LIMIT,
  LEAD_EMAIL_TOKENS,
  leadsWithEmailCount,
  personalizeLeadEmailText,
  summarizeLeadEmailBlast,
} from "@/features/lead-pipeline/lib/lead-email-blast";
import {
  inputClassName,
  labelClassName,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { useAuthUid } from "@/hooks/use-auth-uid";
import { useLeadAssignees } from "@/hooks/use-lead-assignees";
import { cn } from "@/lib/utils";

export type LeadEmailBlastScope = "selected" | "filtered";

export function LeadEmailBlastComposeDialog({
  open,
  selectedLeads,
  filteredLeads,
  initialScope = "selected",
  initialDraft = null,
  onClose,
  onSent,
}: {
  open: boolean;
  selectedLeads: Lead[];
  filteredLeads: Lead[];
  initialScope?: LeadEmailBlastScope;
  /** Prefill from Promote vouchers / partner codes. */
  initialDraft?: PromoteEmailDraft | null;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { uid } = useAuthUid();
  const { members } = useLeadAssignees();
  const [scope, setScope] = useState<LeadEmailBlastScope>(initialScope);
  const [templates, setTemplates] = useState<LeadEmailTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | "new">(
    "new",
  );
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [visibility, setVisibility] =
    useState<LeadEmailTemplateVisibility>("personal");
  const [countAsAttempt, setCountAsAttempt] = useState(false);
  const [insertTarget, setInsertTarget] = useState<"subject" | "body">("body");
  const [tokensOpen, setTokensOpen] = useState(false);
  const [senderEmail, setSenderEmail] = useState<string>(
    OUTREACH_SENDER_OPTIONS[0]?.email || "",
  );
  const [remaining, setRemaining] = useState(LEAD_EMAIL_BLAST_DAILY_LIMIT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setScope(
      initialScope === "selected" && selectedLeads.length > 0 ?
        "selected"
      : "filtered",
    );
    setActiveTemplateId("new");
    if (initialDraft) {
      setTitle(initialDraft.title);
      setSubject(initialDraft.subject);
      setBodyText(initialDraft.bodyText);
      setVisibility(initialDraft.visibility);
    } else {
      setTitle("");
      setSubject("");
      setBodyText("");
      setVisibility("personal");
    }
    setCountAsAttempt(false);
    setTokensOpen(false);
    setError(null);
    setMessage(null);
  }, [open, initialScope, selectedLeads.length, initialDraft]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([fetchLeadEmailTemplates(), fetchLeadEmailBlastQuota()])
      .then(([rows, quota]) => {
        if (cancelled) return;
        setTemplates(rows);
        setRemaining(quota.remaining);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load templates or blast quota.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const currentMember = useMemo(
    () => members.find((member) => member.id === uid),
    [members, uid],
  );

  useEffect(() => {
    if (!open) return;
    if (currentMember?.email) {
      setSenderEmail(outreachSenderByEmail(currentMember.email).email);
    }
  }, [open, currentMember?.email]);

  const selectedSender = useMemo(
    () => outreachSenderByEmail(senderEmail),
    [senderEmail],
  );

  const recipientPool =
    scope === "selected" ? selectedLeads : filteredLeads;
  const withEmail = useMemo(
    () =>
      recipientPool.filter((lead) => {
        const email = lead.email?.trim();
        return Boolean(email && email.includes("@"));
      }),
    [recipientPool],
  );
  const emailReadyCount = withEmail.length;
  const overQuota = emailReadyCount > remaining;
  const previewLead = withEmail[0] || recipientPool[0] || null;

  function insertToken(token: string) {
    if (insertTarget === "subject") {
      setSubject((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${token}`);
      return;
    }
    setBodyText((prev) => `${prev}${prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : ""}${token}`);
  }

  if (!open || typeof document === "undefined") return null;

  function applyTemplate(template: LeadEmailTemplate | null) {
    if (!template) {
      setActiveTemplateId("new");
      setTitle("");
      setSubject("");
      setBodyText("");
      setVisibility("personal");
      return;
    }
    setActiveTemplateId(template.id);
    setTitle(template.title);
    setSubject(template.subject);
    setBodyText(template.bodyText);
    setVisibility(template.visibility);
  }

  async function handleSaveTemplate() {
    if (!title.trim() || !subject.trim() || !bodyText.trim()) {
      setError("Title, subject, and message are required to save.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        visibility,
      };
      if (activeTemplateId !== "new") {
        const updated = await updateLeadEmailTemplate(activeTemplateId, payload);
        setTemplates((prev) =>
          prev.map((row) => (row.id === updated.id ? updated : row)),
        );
        setMessage("Template updated.");
      } else {
        const created = await createLeadEmailTemplate(payload);
        setTemplates((prev) => [created, ...prev]);
        setActiveTemplateId(created.id);
        setMessage(
          visibility === "shared" ?
            "Saved as shared template."
          : "Saved as personal template.",
        );
      }
    } catch {
      setError("Unable to save template.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate() {
    if (activeTemplateId === "new") return;
    setSaving(true);
    setError(null);
    try {
      await deleteLeadEmailTemplate(activeTemplateId);
      setTemplates((prev) => prev.filter((row) => row.id !== activeTemplateId));
      applyTemplate(null);
      setMessage("Template deleted.");
    } catch {
      setError("Unable to delete template.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !bodyText.trim()) {
      setError("Subject and message are required.");
      return;
    }
    if (emailReadyCount === 0) {
      setError("No recipients with an email address in this list.");
      return;
    }
    if (overQuota) {
      setError(
        `Daily limit is ${LEAD_EMAIL_BLAST_DAILY_LIMIT}. You have ${remaining} left — narrow the list or send tomorrow.`,
      );
      return;
    }
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await sendLeadEmailBlast({
        leadIds: withEmail.map((lead) => lead.id),
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        countAsAttempt,
        senderEmail: selectedSender.email,
        senderName: selectedSender.name,
        templateId:
          activeTemplateId === "new" ? undefined : activeTemplateId,
      });
      setRemaining(result.quota.remaining);
      setMessage(
        summarizeLeadEmailBlast({
          sent: result.sent,
          skipped: result.skipped,
          failed: result.failed,
          attemptLogged: result.attemptLogged,
          remaining: result.quota.remaining,
        }),
      );
      onSent?.();
      if (result.sent > 0 && result.failed === 0) {
        onClose();
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.message : "";
      if (
        code.includes("DAILY_BLAST_LIMIT") ||
        (err instanceof ApiError && err.status === 400 && code.includes("BLAST"))
      ) {
        setError(
          `Daily blast limit of ${LEAD_EMAIL_BLAST_DAILY_LIMIT} reached. Try again tomorrow.`,
        );
      } else {
        setError("Unable to send email blast.");
      }
    } finally {
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
        aria-labelledby="lead-email-blast-title"
        className="my-auto flex max-h-[min(94vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                Lead pipeline
              </p>
              <h2
                id="lead-email-blast-title"
                className="mt-1 text-xl font-semibold tracking-tight text-zinc-900"
              >
                Compose email blast
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                Save personal or shared templates, then blast selected or
                filtered leads. Soft cap: {LEAD_EMAIL_BLAST_DAILY_LIMIT}/day (
                {remaining} left).
              </p>
              {initialDraft ?
                <p className="mt-2 rounded-lg border border-teal-100 bg-teal-50/70 px-2.5 py-1.5 text-xs text-teal-900">
                  Prefixed from{" "}
                  {initialDraft.offerKind === "affiliate" ?
                    "partner code"
                  : "voucher"}{" "}
                  <span className="font-mono font-semibold">
                    {initialDraft.offerCode}
                  </span>
                  . Edit freely before sending.
                </p>
              : null}
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

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {loading ?
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          : <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={labelClassName}>Recipients</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm",
                        scope === "selected" ?
                          "border-teal-600 bg-teal-50 text-teal-900"
                        : "border-zinc-200 text-zinc-600",
                      )}
                      disabled={selectedLeads.length === 0}
                      onClick={() => setScope("selected")}
                    >
                      Selected ({selectedLeads.length})
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm",
                        scope === "filtered" ?
                          "border-teal-600 bg-teal-50 text-teal-900"
                        : "border-zinc-200 text-zinc-600",
                      )}
                      onClick={() => setScope("filtered")}
                    >
                      Filtered ({filteredLeads.length})
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {emailReadyCount} with email
                    {overQuota ?
                      ` · exceeds remaining quota (${remaining})`
                    : ""}
                  </p>
                </div>
                <div>
                  <label className={labelClassName} htmlFor="blast-from">
                    From
                  </label>
                  <select
                    id="blast-from"
                    className={cn(inputClassName, "mt-1.5")}
                    value={senderEmail}
                    onChange={(event) => setSenderEmail(event.target.value)}
                  >
                    {OUTREACH_SENDER_OPTIONS.map((sender) => (
                      <option key={sender.email} value={sender.email}>
                        {sender.name} · {sender.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className={labelClassName}>Saved templates</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs",
                      activeTemplateId === "new" ?
                        "border-teal-600 bg-teal-50 text-teal-900"
                      : "border-zinc-200 text-zinc-600",
                    )}
                    onClick={() => applyTemplate(null)}
                  >
                    Compose new
                  </button>
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs",
                        activeTemplateId === template.id ?
                          "border-teal-600 bg-teal-50 text-teal-900"
                        : "border-zinc-200 text-zinc-600",
                      )}
                      onClick={() => applyTemplate(template)}
                    >
                      {template.title}
                      <span className="ml-1 text-[10px] uppercase text-zinc-400">
                        {template.visibility}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <label className={labelClassName} htmlFor="blast-title">
                    Template title
                  </label>
                  <input
                    id="blast-title"
                    className={cn(inputClassName, "mt-1.5")}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Warm demo follow-up"
                  />
                </div>
                <div>
                  <p className={labelClassName}>Visibility</p>
                  <div className="mt-1.5 flex gap-2">
                    {(["personal", "shared"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm capitalize",
                          visibility === value ?
                            "border-teal-600 bg-teal-50 text-teal-900"
                          : "border-zinc-200 text-zinc-600",
                        )}
                        onClick={() => setVisibility(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-teal-100 bg-teal-50/50">
                <button
                  type="button"
                  id="lead-email-tokens-trigger"
                  aria-expanded={tokensOpen}
                  aria-controls="lead-email-tokens-panel"
                  className="flex w-full items-start gap-2 px-3 py-3 text-left transition hover:bg-teal-50/80"
                  onClick={() => setTokensOpen((open) => !open)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-teal-950">
                        Dynamic fields
                      </span>
                      <span className="rounded-full bg-teal-100/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-teal-800">
                        {LEAD_EMAIL_TOKENS.length}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-teal-900/70">
                      {tokensOpen ?
                        <>
                          Click a chip to insert into the{" "}
                          <span className="font-medium">
                            {insertTarget === "subject" ? "subject" : "message"}
                          </span>
                          . Each recipient gets their own values when you send.
                        </>
                      : "Personalize with {{firstName}}, {{businessName}}, and more — expand to insert."}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-teal-700 transition-transform",
                      tokensOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                {tokensOpen ?
                  <div
                    id="lead-email-tokens-panel"
                    role="region"
                    aria-labelledby="lead-email-tokens-trigger"
                    className="border-t border-teal-100 px-3 pb-3 pt-2"
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {LEAD_EMAIL_TOKENS.map((row) => (
                        <button
                          key={row.token}
                          type="button"
                          title={row.description}
                          className="rounded-md border border-teal-200 bg-white px-2 py-1 text-left text-xs text-teal-900 hover:border-teal-500 hover:bg-teal-50"
                          onClick={() => insertToken(row.token)}
                        >
                          <span className="font-medium">{row.label}</span>
                          <span className="ml-1 font-mono text-[10px] text-teal-700/80">
                            {row.token}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                : null}
              </div>

              <div>
                <label className={labelClassName} htmlFor="blast-subject">
                  Subject
                </label>
                <input
                  id="blast-subject"
                  className={cn(inputClassName, "mt-1.5")}
                  value={subject}
                  onFocus={() => setInsertTarget("subject")}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Kumusta po, {{firstName}} — follow-up"
                />
              </div>

              <div>
                <label className={labelClassName} htmlFor="blast-body">
                  Message
                </label>
                <textarea
                  id="blast-body"
                  className={cn(inputClassName, "mt-1.5 min-h-[180px]")}
                  value={bodyText}
                  onFocus={() => setInsertTarget("body")}
                  onChange={(event) => setBodyText(event.target.value)}
                  placeholder={
                    "Hi {{firstName}},\n\nKumusta po ang {{businessName}}?\n\nUse the Dynamic fields chips above — they fill in per lead when you blast."
                  }
                />
              </div>

              {previewLead ?
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600">
                  <p className="font-medium text-zinc-800">
                    Preview for {previewLead.businessName}
                    <span className="ml-1 font-normal text-zinc-500">
                      (tokens replaced)
                    </span>
                  </p>
                  <p className="mt-1 font-medium">
                    {personalizeLeadEmailText(subject, previewLead) || "—"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {personalizeLeadEmailText(bodyText, previewLead) || "—"}
                  </p>
                </div>
              : null}

              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  className="rounded border-zinc-300"
                  checked={countAsAttempt}
                  onChange={(event) => setCountAsAttempt(event.target.checked)}
                />
                Count as attempt (sets Awaiting reply + bumps attempt)
              </label>
            </>
          }

          {error ?
            <p className="text-sm text-red-600">{error}</p>
          : null}
          {message ?
            <p className="text-sm text-teal-800">{message}</p>
          : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving || loading}
              onClick={() => void handleSaveTemplate()}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {activeTemplateId === "new" ? "Save template" : "Update template"}
            </Button>
            {activeTemplateId !== "new" ?
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => void handleDeleteTemplate()}
                className="gap-1.5 text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            : null}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={sending || loading || emailReadyCount === 0 || overQuota}
            onClick={() => void handleSend()}
            className="gap-1.5"
          >
            {sending ?
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Send className="h-3.5 w-3.5" />}
            <Mail className="h-3.5 w-3.5" />
            Send to {emailReadyCount}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
