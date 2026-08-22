"use client";

import { Mail, Search, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchOutreachRecipients,
  sendSalesOutreachEmail,
  type OutreachSendKind,
} from "@/lib/sales/api";
import type { OutreachRecipient } from "@/lib/definitions";
import { buildDemoInquiryMailto } from "@/lib/email/demo-inquiry-template";
import { buildNewUserWelcomeMailto } from "@/lib/email/new-user-welcome-template";
import {
  buildOutreachMailto,
  openOutreachMailto,
} from "@/lib/email/outreach-email-shared";
import {
  buildOutreachTemplatePreview,
  MAX_BULK_OUTREACH_RECIPIENTS,
  summarizeBulkOutreachSend,
} from "@/features/proposals/lib/proposal-outreach-compose-utils";
import { cn } from "@/lib/utils";

const TEMPLATE_OPTIONS: Array<{
  id: OutreachSendKind;
  label: string;
  description: string;
}> = [
  {
    id: "personalized",
    label: "Personalized",
    description: "Write your own subject and message.",
  },
  {
    id: "demo_inquiry",
    label: "Demo follow-up",
    description: "Follow up on a Smart Refill demo inquiry.",
  },
  {
    id: "new_user_registration",
    label: "New user welcome",
    description: "Kamustahan for newly registered owners.",
  },
  {
    id: "generic",
    label: "General follow-up",
    description: "Short follow-up with a custom subtitle.",
  },
];

const SOURCE_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All sources" },
  { id: "platform_user", label: "Platform users" },
  { id: "crm_client", label: "CRM clients" },
  { id: "webinar_guest", label: "Webinar guests" },
  { id: "webinar_member", label: "Webinar members" },
  { id: "story_engagement", label: "Story engagement" },
  { id: "article_engagement", label: "Article engagement" },
];

export function ProposalOutreachComposeDialog({
  initialRecipientId,
  onClose,
}: {
  initialRecipientId?: string;
  onClose: () => void;
}) {
  const [recipients, setRecipients] = useState<OutreachRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialRecipientId ? [initialRecipientId] : []),
  );
  const [templateKind, setTemplateKind] = useState<OutreachSendKind>("personalized");
  const [subtitle, setSubtitle] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchOutreachRecipients()
      .then((rows) => {
        if (cancelled) return;
        setRecipients(rows);
        if (initialRecipientId && rows.some((r) => r.id === initialRecipientId)) {
          setSelectedIds(new Set([initialRecipientId]));
        }
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load outreach recipients.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialRecipientId]);

  const appOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of recipients) {
      if (row.appId && row.appLabel) byId.set(row.appId, row.appLabel);
      for (const app of row.apps ?? []) {
        byId.set(app.appId, app.label);
      }
    }
    return [...byId.entries()].map(([appId, label]) => ({ appId, label }));
  }, [recipients]);

  const filteredRecipients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return recipients.filter((row) => {
      if (sourceFilter !== "all" && row.source !== sourceFilter) return false;
      if (appFilter !== "all") {
        const appIds = row.apps?.map((app) => app.appId) ?? [];
        if (row.appId) appIds.push(row.appId);
        if (!appIds.includes(appFilter)) return false;
      }
      if (!normalized) return true;
      const haystack = [
        row.displayName,
        row.email,
        row.companyName,
        row.sourceLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [recipients, query, sourceFilter, appFilter]);

  const selectedRecipients = useMemo(
    () => recipients.filter((row) => selectedIds.has(row.id)),
    [recipients, selectedIds],
  );

  const previewRecipient = selectedRecipients[0] ?? null;
  const allFilteredSelected =
    filteredRecipients.length > 0 &&
    filteredRecipients.every((row) => selectedIds.has(row.id));

  function toggleRecipient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of filteredRecipients) next.add(row.id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  useEffect(() => {
    if (!previewRecipient) return;
    if (templateKind === "personalized") return;
    const preview = buildOutreachTemplatePreview(templateKind, previewRecipient, subtitle);
    setSubject(preview.subject);
    setBodyText(preview.bodyText);
  }, [previewRecipient, templateKind, subtitle]);

  async function handleSendBrevo() {
    if (selectedRecipients.length === 0) return;
    if (selectedRecipients.length > MAX_BULK_OUTREACH_RECIPIENTS) {
      setSendMessage(`Select at most ${MAX_BULK_OUTREACH_RECIPIENTS} recipients.`);
      return;
    }
    if (
      templateKind === "personalized" &&
      (!subject.trim() || !bodyText.trim())
    ) {
      setSendMessage("Subject and message are required.");
      return;
    }

    setSending(true);
    setSendMessage(null);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const recipient of selectedRecipients) {
      try {
        const result = await sendSalesOutreachEmail({
          toEmail: recipient.email,
          kind: templateKind,
          recipientName: recipient.displayName,
          businessName: recipient.companyName,
          subtitle: subtitle || recipient.sourceLabel,
          subject: templateKind === "personalized" ? subject : undefined,
          bodyText: templateKind === "personalized" ? bodyText : undefined,
        });
        if (result.outreach.skipped) skipped += 1;
        else sent += 1;
      } catch {
        failed += 1;
      }
    }

    setSendMessage(
      summarizeBulkOutreachSend({
        total: selectedRecipients.length,
        sent,
        skipped,
        failed,
        subject,
      }),
    );

    setSending(false);
  }

  function handleOpenMailClient() {
    if (selectedRecipients.length === 0) return;
    if (
      selectedRecipients.length > 1 &&
      templateKind !== "personalized"
    ) {
      setSendMessage(
        "Templates personalize per recipient — use Send via Brevo for multiple recipients.",
      );
      return;
    }

    if (selectedRecipients.length === 1) {
      const selected = selectedRecipients[0];
      let href: string;
      if (templateKind === "demo_inquiry") {
        href = buildDemoInquiryMailto(selected.email, {
          recipientName: selected.displayName,
          businessName: selected.companyName,
        });
      } else if (templateKind === "new_user_registration") {
        href = buildNewUserWelcomeMailto(selected.email, {
          recipientName: selected.displayName,
          businessName: selected.companyName,
        });
      } else {
        href = buildOutreachMailto({
          toEmail: selected.email,
          subject: subject.trim() || "Follow-up from Smart Refill",
          body: bodyText,
        });
      }
      openOutreachMailto(href);
      return;
    }

    const emails = selectedRecipients.map((row) => row.email).join(",");
    openOutreachMailto(
      buildOutreachMailto({
        toEmail: emails,
        subject: subject.trim() || "Follow-up from Smart Refill",
        body: bodyText,
      }),
    );
  }

  const recipientCountLabel =
    selectedRecipients.length === 0 ?
      "Select recipients"
    : `${selectedRecipients.length} selected`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-[min(90vh,820px)] w-full max-w-4xl flex-col rounded-2xl border border-[var(--border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Compose outreach email
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Select one or more recipients, personalize, then send via Brevo or
              your mail client.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="min-h-0 border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  className="h-10 w-full rounded-lg border border-[var(--border)] pl-9 pr-3 text-sm outline-none ring-teal-500 focus:ring-2"
                  placeholder="Search name or email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-9 rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                >
                  {SOURCE_FILTERS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                >
                  <option value="all">All apps</option>
                  {appOptions.map((app) => (
                    <option key={app.appId} value={app.appId}>{app.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">{recipientCountLabel}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-teal-700 hover:underline disabled:text-zinc-400"
                    disabled={filteredRecipients.length === 0 || allFilteredSelected}
                    onClick={selectAllFiltered}
                  >
                    Select all in view
                  </button>
                  <button
                    type="button"
                    className="text-teal-700 hover:underline disabled:text-zinc-400"
                    disabled={selectedIds.size === 0}
                    onClick={clearSelection}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 min-h-0 overflow-y-auto max-h-[420px] space-y-2">
              {loading ?
                <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
              : error ?
                <p className="text-sm text-red-600">{error}</p>
              : filteredRecipients.length === 0 ?
                <p className="text-sm text-[var(--muted-foreground)]">
                  No recipients match this filter.
                </p>
              : filteredRecipients.map((row) => {
                  const checked = selectedIds.has(row.id);
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => toggleRecipient(row.id)}
                      className={cn(
                        "flex w-full gap-3 rounded-lg border p-3 text-left transition",
                        checked ?
                          "border-teal-300 bg-teal-50/60 ring-1 ring-teal-200"
                        : "border-[var(--border)] hover:bg-zinc-50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-teal-600"
                        aria-label={`Select ${row.displayName}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{row.displayName}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">{row.email}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {row.sourceLabel}
                        </p>
                        {row.apps && row.apps.length > 0 ?
                          <div className="mt-2 flex flex-wrap gap-1">
                            {row.apps.map((app) => (
                              <Badge
                                key={app.appId}
                                className="bg-teal-50 text-teal-800 ring-1 ring-teal-100"
                              >
                                {app.label}
                              </Badge>
                            ))}
                          </div>
                        : null}
                      </div>
                    </button>
                  );
                })
              }
            </div>
          </div>

          <div className="min-h-0 p-4 space-y-4 overflow-y-auto">
            {selectedRecipients.length === 0 ?
              <p className="text-sm text-[var(--muted-foreground)]">
                Select one or more recipients to compose.
              </p>
            : <>
                <div className="rounded-lg border border-[var(--border)] bg-zinc-50 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    To: {selectedRecipients.length} recipient
                    {selectedRecipients.length === 1 ? "" : "s"}
                  </p>
                  {selectedRecipients.length === 1 ?
                    <>
                      <p className="text-[var(--muted-foreground)]">
                        {selectedRecipients[0].displayName} · {selectedRecipients[0].email}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {selectedRecipients[0].sourceLabel}
                      </p>
                    </>
                  : <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[var(--muted-foreground)]">
                      {selectedRecipients.map((row) => (
                        <li key={row.id} className="truncate">
                          {row.displayName} · {row.email}
                        </li>
                      ))}
                    </ul>
                  }
                </div>

                {selectedRecipients.length > 1 && templateKind !== "personalized" ?
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Preview shows the first selected recipient. Brevo sends a
                    personalized version to each person.
                  </p>
                : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Template</label>
                  <select
                    className="h-10 w-full rounded-lg border border-[var(--border)] px-3 text-sm"
                    value={templateKind}
                    onChange={(e) =>
                      setTemplateKind(e.target.value as OutreachSendKind)
                    }
                  >
                    {TEMPLATE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {TEMPLATE_OPTIONS.find((t) => t.id === templateKind)?.description}
                  </p>
                </div>

                {templateKind === "generic" ?
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Follow-up topic
                    </label>
                    <input
                      className="h-10 w-full rounded-lg border border-[var(--border)] px-3 text-sm"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder={previewRecipient?.sourceLabel ?? "Follow-up topic"}
                    />
                  </div>
                : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Subject</label>
                  <input
                    className="h-10 w-full rounded-lg border border-[var(--border)] px-3 text-sm"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    readOnly={templateKind !== "personalized"}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Message</label>
                  <textarea
                    className="min-h-[220px] w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    readOnly={templateKind !== "personalized"}
                  />
                </div>

                {sendMessage ?
                  <p
                    className={cn(
                      "text-sm",
                      sendMessage.includes("failed") ?
                        "text-red-600"
                      : "text-teal-700",
                    )}
                  >
                    {sendMessage}
                  </p>
                : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={sending || selectedRecipients.length === 0}
                    onClick={() => void handleSendBrevo()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sending ?
                      `Sending ${selectedRecipients.length}…`
                    : selectedRecipients.length > 1 ?
                      `Send ${selectedRecipients.length} via Brevo`
                    : "Send via Brevo"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={selectedRecipients.length === 0}
                    onClick={handleOpenMailClient}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {selectedRecipients.length > 1 ?
                      "Open in mail client (shared message)"
                    : "Open in mail client"}
                  </Button>
                </div>
              </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
