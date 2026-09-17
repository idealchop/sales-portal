"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  Lead,
  LeadHistoryChange,
  LeadHistoryEvent,
  LeadHistoryKind,
} from "@/lib/definitions";
import {
  formatCustomerCount,
  formatLeadChannels,
  formatLeadDate,
  formatLeadMilestoneDate,
  formatLeadSourceLine,
  LEAD_STAGE_LABELS,
  leadQueueBucket,
  platformMembershipLabel,
  platformSourceLabel,
  resolveInquiredAt,
  resolveLeadLastSignIn,
  resolveRegisteredAt,
  stageBadgeClass,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { useLeadAssignees } from "@/hooks/use-lead-assignees";
import { fetchLeadHistory } from "@/lib/sales/api";

function Milestone({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-zinc-900">
        {children}
      </p>
    </div>
  );
}

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

function formatChannelsValue(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  try {
    const parsed = JSON.parse(value) as Record<string, boolean>;
    const active = Object.entries(parsed)
      .filter(([, on]) => on)
      .map(([key]) => {
        if (key === "smsCall") return "SMS / Call";
        return key.charAt(0).toUpperCase() + key.slice(1);
      });
    return active.length ? active.join(" · ") : null;
  } catch {
    return value;
  }
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

function StatusUpdateCard({
  headline,
  loggedAt,
  loggedBy,
  status,
  lastContact,
  whoContacted,
  via,
  note,
}: {
  headline: string;
  loggedAt: string;
  loggedBy: string;
  status?: string | null;
  lastContact?: string | null;
  whoContacted?: React.ReactNode;
  via?: string | null;
  note?: string | null;
}) {
  const hasMeta = Boolean(status || lastContact || whoContacted || via || note);

  return (
    <li className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/90 to-white px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700/80">
        Status update
      </div>
      <div className="mt-1 text-base font-semibold tracking-tight text-teal-950">
        {headline}
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        Logged {loggedAt} · by {loggedBy}
      </div>
      {hasMeta ?
        <dl className="mt-3 space-y-1.5 rounded-lg border border-teal-100/80 bg-white/80 px-3 py-2.5">
          {status ?
            <MetaRow label="Status">{status}</MetaRow>
          : null}
          {lastContact ?
            <MetaRow label="Last contact">{lastContact}</MetaRow>
          : null}
          {whoContacted ?
            <MetaRow label="Who contacted">{whoContacted}</MetaRow>
          : null}
          {via ?
            <MetaRow label="Via">{via}</MetaRow>
          : null}
          {note ?
            <MetaRow label="Note">{note}</MetaRow>
          : null}
        </dl>
      : null}
    </li>
  );
}

export function LeadDetailsDialog({
  open,
  lead,
  onClose,
  onUpdateDetails,
  onUpdateStatus,
  onViewHistory,
}: {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onUpdateDetails?: (lead: Lead) => void;
  onUpdateStatus?: (lead: Lead) => void;
  onViewHistory?: (lead: Lead) => void;
}) {
  const { members } = useLeadAssignees();
  const [events, setEvents] = useState<LeadHistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    setLoadingHistory(true);
    void fetchLeadHistory(lead.id)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lead]);

  const statusEvents = useMemo(() => {
    return events
      .filter((event) => {
        const kind = resolveEventKind(event);
        if (kind === "status") return true;
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
      })
      .sort((a, b) => {
        const left = a.createdAt ? Date.parse(a.createdAt) : 0;
        const right = b.createdAt ? Date.parse(b.createdAt) : 0;
        return right - left;
      });
  }, [events]);

  if (!open || !lead || typeof document === "undefined") return null;

  function actorLabel(uid: string): string {
    if (!uid) return "System";
    const member = members.find((row) => row.id === uid);
    return member?.displayName || member?.email || uid;
  }

  const contactedBy =
    lead.lastContactedByUid ?
      members.find((member) => member.id === lead.lastContactedByUid)
    : null;
  const contactedByLabel =
    contactedBy?.displayName ||
    contactedBy?.email ||
    lead.lastContactedByUid ||
    null;
  const contactee =
    lead.ownerName?.trim() || lead.businessName?.trim() || "lead";
  const customers = formatCustomerCount(lead.customerCount);
  const membership = platformMembershipLabel(lead.platformRole);
  const inquiredAt = resolveInquiredAt(lead);
  const registeredAt = resolveRegisteredAt(lead);
  const stageLabel = LEAD_STAGE_LABELS[lead.stage] || lead.stage;
  const statusLabel = lead.warmStatus?.trim() || "No status yet";
  const note = lead.notes?.trim() || lead.stallReason?.trim() || null;
  const via = formatLeadChannels(lead.channels);
  const lastContactLabel = formatLeadDate(lead.lastContactAt);
  const platformLabel = platformSourceLabel(lead.platformSource);
  const isOnboarded = leadQueueBucket(lead.stage) === "onboarded";
  const lastSignInLabel = isOnboarded
    ? resolveLeadLastSignIn(lead)
    : null;
  const email = lead.email?.trim() || "";
  const phone = lead.phone?.trim() || "";
  const address = lead.address?.trim() || "";
  const title =
    lead.businessName?.trim() ||
    lead.ownerName?.trim() ||
    "Lead details";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-4 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-details-title"
        className="my-auto flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${stageBadgeClass(lead.stage)}`}
                >
                  {stageLabel}
                </span>
                {platformLabel !== "—" ?
                  <span className="text-xs text-zinc-500">
                    {platformLabel}
                    {membership ? ` · ${membership}` : ""}
                  </span>
                : null}
              </div>

              <h2
                id="lead-details-title"
                className="mt-2 text-xl font-semibold tracking-tight text-zinc-900"
              >
                {title}
              </h2>

              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-zinc-500">
                {email ?
                  <a
                    href={`mailto:${email}`}
                    className="text-teal-700 hover:underline"
                  >
                    {email}
                  </a>
                : (
                  <span>No email</span>
                )}
                <span className="text-zinc-300">·</span>
                {phone ?
                  <a
                    href={`tel:${phone}`}
                    className="text-teal-700 hover:underline"
                  >
                    {phone}
                  </a>
                : (
                  <span>No contact</span>
                )}
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {address || "No address"}
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

          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-zinc-50 px-4 py-3 sm:flex-row sm:items-start sm:gap-0">
            <Milestone label="Source">
              {formatLeadSourceLine(lead)}
            </Milestone>
            <div className="hidden h-10 w-px bg-zinc-200 sm:mx-4 sm:block" />
            <Milestone label="Date inquire">
              {formatLeadMilestoneDate(inquiredAt)}
            </Milestone>
            <div className="hidden h-10 w-px bg-zinc-200 sm:mx-4 sm:block" />
            <Milestone label="Date registered">
              {formatLeadMilestoneDate(registeredAt)}
            </Milestone>
            {lastSignInLabel ?
              <>
                <div className="hidden h-10 w-px bg-zinc-200 sm:mx-4 sm:block" />
                <Milestone label="Last sign-in">{lastSignInLabel}</Milestone>
              </>
            : null}
          </div>

          {(customers || lead.linkedBusinessId) && (
            <p className="mt-3 text-xs text-zinc-500">
              {customers}
              {customers && lead.linkedBusinessId ? " · " : ""}
              {lead.linkedBusinessId ?
                <span className="font-mono">{lead.linkedBusinessId}</span>
              : null}
            </p>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Status</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Trail of status updates
              </p>
            </div>
            {onUpdateStatus ?
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onUpdateStatus(lead);
                }}
                className="text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                Update
              </button>
            : null}
          </div>

          {loadingHistory ?
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              Loading status trail…
            </div>
          : statusEvents.length > 0 ?
            <ol className="space-y-3">
              {statusEvents.map((event) => {
                const status = changeTo(event.changes, "warmStatus");
                const lastContact = changeTo(event.changes, "lastContactAt");
                const contactedByUid = changeTo(
                  event.changes,
                  "lastContactedByUid",
                );
                const channels = formatChannelsValue(
                  changeTo(event.changes, "channels"),
                );
                const eventNote =
                  changeTo(event.changes, "notes") ||
                  changeTo(event.changes, "stallReason");
                const headline =
                  status || event.summary || "Updated status";
                const who =
                  contactedByUid ?
                    <>
                      {actorLabel(contactedByUid)}
                      <span className="text-zinc-400"> → </span>
                      {contactee}
                    </>
                  : null;

                return (
                  <StatusUpdateCard
                    key={event.id}
                    headline={headline}
                    loggedAt={formatLeadDate(event.createdAt)}
                    loggedBy={actorLabel(event.actorUid)}
                    status={status}
                    lastContact={
                      lastContact ?
                        formatLeadMilestoneDate(lastContact)
                      : null
                    }
                    whoContacted={who}
                    via={channels}
                    note={eventNote}
                  />
                );
              })}
            </ol>
          : <ol className="space-y-3">
              <StatusUpdateCard
                headline={statusLabel}
                loggedAt={formatLeadDate(
                  lead.updatedAt || lead.lastContactAt || lead.createdAt,
                )}
                loggedBy={contactedByLabel || "System"}
                status={lead.warmStatus?.trim() || null}
                lastContact={
                  lastContactLabel === "—" ? null : lastContactLabel
                }
                whoContacted={
                  contactedByLabel ?
                    <>
                      {contactedByLabel}
                      <span className="text-zinc-400"> → </span>
                      {contactee}
                    </>
                  : null
                }
                via={via === "—" ? null : via}
                note={note}
              />
            </ol>
          }
        </div>

        <footer className="shrink-0 border-t border-zinc-100 bg-zinc-50/80 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {onViewHistory ?
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onViewHistory(lead);
                  }}
                >
                  View history
                </Button>
              : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Close
              </Button>
              {onUpdateDetails ?
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onUpdateDetails(lead);
                  }}
                >
                  Update details
                </Button>
              : null}
              {onUpdateStatus ?
                <Button
                  type="button"
                  onClick={() => {
                    onClose();
                    onUpdateStatus(lead);
                  }}
                >
                  Update status
                </Button>
              : null}
            </div>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
