"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  Lead,
  LeadHistoryChange,
  LeadHistoryEvent,
  LeadHistoryKind,
} from "@/lib/definitions";
import {
  formatLeadDate,
  formatLeadMilestoneDate,
  leadHistoryFieldLabel,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { useLeadAssignees } from "@/hooks/use-lead-assignees";
import { fetchLeadHistory } from "@/lib/sales/api";

type SortDir = "newest" | "oldest";

function resolveEventKind(event: LeadHistoryEvent): LeadHistoryKind {
  if (event.kind) return event.kind;
  if (event.type === "created" || event.summary === "Lead created") {
    return "created";
  }
  if (event.summary === "CRM tracking started") return "tracking_started";
  if (
    event.summary.toLowerCase().includes("detail") ||
    event.changes.some((change) =>
      [
        "businessName",
        "ownerName",
        "email",
        "phone",
        "address",
        "leadSource",
        "sourceWebsite",
        "referredBy",
        "referredByAffiliateCode",
        "referredByEmail",
        "contentReferrer",
      ].includes(change.field),
    )
  ) {
    return "details";
  }
  return "status";
}

function changeTo(
  changes: LeadHistoryChange[],
  field: string,
): string | null {
  const match = changes.find((change) => change.field === field);
  return match?.to ?? null;
}

function formatHistoryValue(
  field: string,
  value: string | null | undefined,
): string {
  if (value == null || value === "") return "N/A";
  if (
    field === "lastContactAt" ||
    field === "nextFollowUpAt" ||
    field === "inquiredAt" ||
    field === "registeredAt" ||
    /^\d{4}-\d{2}-\d{2}T/.test(value)
  ) {
    return formatLeadMilestoneDate(value);
  }
  if (field === "channels") {
    try {
      const parsed = JSON.parse(value) as Record<string, boolean>;
      const active = Object.entries(parsed)
        .filter(([, on]) => on)
        .map(([key]) => {
          if (key === "smsCall") return "SMS / Call";
          return key.charAt(0).toUpperCase() + key.slice(1);
        });
      return active.length ? active.join(" · ") : "None";
    } catch {
      return value;
    }
  }
  return value;
}

function hasContactLedgerFields(event: LeadHistoryEvent): boolean {
  return event.changes.some((change) =>
    [
      "warmStatus",
      "lastContactAt",
      "lastContactedByUid",
      "channels",
      "notes",
      "stallReason",
    ].includes(change.field),
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 text-xs sm:grid-cols-[7.25rem_1fr]">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-800">{children}</dd>
    </div>
  );
}

function ContactLedgerMeta({
  event,
  lead,
  resolveName,
}: {
  event: LeadHistoryEvent;
  lead: Lead;
  resolveName: (uid: string) => string;
}) {
  const status = changeTo(event.changes, "warmStatus");
  const lastContact = changeTo(event.changes, "lastContactAt");
  const contactedByUid = changeTo(event.changes, "lastContactedByUid");
  const channels = changeTo(event.changes, "channels");
  const note =
    changeTo(event.changes, "notes") || changeTo(event.changes, "stallReason");
  const contactee =
    lead.ownerName?.trim() || lead.businessName?.trim() || "lead";
  const contactedBy =
    contactedByUid ? resolveName(contactedByUid) : null;

  if (!status && !lastContact && !contactedBy && !channels && !note) {
    return null;
  }

  return (
    <dl className="mt-3 space-y-1.5 rounded-lg border border-teal-100/80 bg-white/80 px-3 py-2.5">
      {status ?
        <MetaRow label="Status">{status}</MetaRow>
      : null}
      {lastContact ?
        <MetaRow label="Last contact">
          {formatHistoryValue("lastContactAt", lastContact)}
        </MetaRow>
      : null}
      {contactedBy ?
        <MetaRow label="Who contacted">
          {contactedBy}
          <span className="text-zinc-400"> → </span>
          {contactee}
        </MetaRow>
      : null}
      {channels ?
        <MetaRow label="Via">
          {formatHistoryValue("channels", channels)}
        </MetaRow>
      : null}
      {note ?
        <MetaRow label="Note">{note}</MetaRow>
      : null}
    </dl>
  );
}

export function LeadHistoryDialog({
  open,
  lead,
  onClose,
}: {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
}) {
  const { members } = useLeadAssignees();
  const [events, setEvents] = useState<LeadHistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("newest");

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !lead) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchLeadHistory(lead.id)
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
        setError("Unable to load history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lead]);

  const sortedEvents = useMemo(() => {
    const copy = [...events];
    copy.sort((a, b) => {
      const left = a.createdAt ? Date.parse(a.createdAt) : 0;
      const right = b.createdAt ? Date.parse(b.createdAt) : 0;
      return sortDir === "newest" ? right - left : left - right;
    });
    return copy;
  }, [events, sortDir]);

  if (!open || !lead || typeof document === "undefined") return null;

  function actorLabel(uid: string): string {
    if (!uid) return "System";
    const member = members.find((row) => row.id === uid);
    return member?.displayName || member?.email || uid;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-history-title"
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2
              id="lead-history-title"
              className="text-lg font-semibold text-zinc-900"
            >
              History ledger
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">{lead.businessName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-5 py-2.5">
          <p className="text-xs text-zinc-500">
            {sortedEvents.length}{" "}
            {sortedEvents.length === 1 ? "entry" : "entries"}
          </p>
          <button
            type="button"
            onClick={() =>
              setSortDir((prev) => (prev === "newest" ? "oldest" : "newest"))
            }
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            {sortDir === "newest" ? "Latest → Oldest" : "Oldest → Latest"}
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {loading ?
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              Loading history…
            </div>
          : error ?
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          : sortedEvents.length === 0 ?
            <p className="py-10 text-center text-sm text-zinc-500">
              No history yet. Detail and status updates will appear here.
            </p>
          : <ol className="space-y-3">
              {sortedEvents.map((event) => {
                const kind = resolveEventKind(event);
                const when = formatLeadDate(event.createdAt);
                const who = actorLabel(event.actorUid);
                const showContactMeta =
                  kind === "status" || hasContactLedgerFields(event);

                if (kind === "details") {
                  const snapshotEntries = Object.entries(
                    event.snapshot ||
                      Object.fromEntries(
                        event.changes.map((change) => [
                          change.field,
                          change.from,
                        ]),
                      ),
                  );
                  return (
                    <li
                      key={event.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3"
                    >
                      <div className="text-sm font-medium text-zinc-900">
                        Updated details by {who}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">{when}</div>
                      {snapshotEntries.length ?
                        <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                            Previous snapshot
                          </div>
                          <dl className="space-y-1.5">
                            {snapshotEntries.map(([field, value]) => (
                              <div
                                key={`${event.id}-${field}`}
                                className="grid grid-cols-[7.5rem_1fr] gap-2 text-xs"
                              >
                                <dt className="text-zinc-500">
                                  {leadHistoryFieldLabel(field)}
                                </dt>
                                <dd className="text-zinc-800">
                                  {formatHistoryValue(field, value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      : null}
                    </li>
                  );
                }

                if (kind === "status" || showContactMeta) {
                  const status = changeTo(event.changes, "warmStatus");
                  const headline =
                    status ||
                    (kind === "tracking_started" ?
                      "CRM tracking started"
                    : kind === "created" ?
                      "Lead created"
                    : event.summary || "Updated status");

                  return (
                    <li
                      key={event.id}
                      className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/90 to-white px-4 py-3"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700/80">
                        {kind === "status" ? "Status update" : "Ledger entry"}
                      </div>
                      <div className="mt-1 text-base font-semibold tracking-tight text-teal-950">
                        {headline}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Logged {when} · by {who}
                      </div>
                      <ContactLedgerMeta
                        event={event}
                        lead={lead}
                        resolveName={actorLabel}
                      />
                    </li>
                  );
                }

                return (
                  <li
                    key={event.id}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
                  >
                    <div className="text-sm font-medium text-zinc-900">
                      {kind === "tracking_started" ?
                        "CRM tracking started"
                      : kind === "created" ?
                        "Lead created"
                      : event.summary}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {when} · by {who}
                    </div>
                  </li>
                );
              })}
            </ol>
          }
        </div>

        <div className="flex justify-end border-t border-zinc-100 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
