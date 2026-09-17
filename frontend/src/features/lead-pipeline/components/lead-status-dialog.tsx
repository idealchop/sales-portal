"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead, LeadStage } from "@/lib/definitions";
import {
  DEMO_STATUS_OPTIONS,
  COLD_ATTEMPT_ARCHIVE_THRESHOLD,
  WARM_ATTEMPT_ARCHIVE_THRESHOLD,
  attemptSeverity,
  attemptSeverityClassName,
  autoQueueMoveHint,
  displayAttemptCount,
  formatWarmStatusForSave,
  inputClassName,
  isEmailTrackingWarmStatus,
  labelClassName,
  leadQueueBucket,
  normalizeDemoStatus,
  parseWarmStatus,
  previewAttemptCounts,
  readColdAttemptCount,
  readWarmAttemptCount,
  resolveStageAfterStatusUpdate,
  resolveWarmStatusAfterDemoChange,
  warmStatusOptionByValue,
  groupWarmStatusOptions,
  WARM_STATUS_RESULT_OPTIONS,
  isWarmReengageStatus,
  type DemoStatus,
  type WarmStatusValue,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { useLeadAssignees } from "@/hooks/use-lead-assignees";
import { useAuthUid } from "@/hooks/use-auth-uid";
import { cn } from "@/lib/utils";

type StatusFormState = {
  stage: LeadStage;
  attendedDemo: "" | DemoStatus;
  accountReady: boolean;
  warmStatusValue: WarmStatusValue | "";
  warmStatusDetail: string;
  lastContactAt: string;
  lastContactedByUid: string;
  nextFollowUpAt: string;
  notes: string;
  channels: Lead["channels"];
  /** true = new contact attempt; false = update previous attempt with feedback. */
  countAsNewAttempt: boolean;
};

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function fromLead(
  lead: Lead,
  currentUid?: string | null,
): StatusFormState {
  const parsed = parseWarmStatus(lead.warmStatus);
  const today = new Date().toISOString().slice(0, 10);
  const existingNote = (lead.notes || lead.stallReason || "").trim();
  const fromEmailFollowUp = isEmailTrackingWarmStatus(lead.warmStatus);
  const isAwaitingAutoNote =
    existingNote.startsWith("Follow-up email sent") ||
    existingNote.startsWith("Follow-up email opened");
  return {
    stage: lead.stage,
    attendedDemo: normalizeDemoStatus(lead.attendedDemo),
    accountReady: Boolean(lead.accountReady ?? lead.workspace?.accountReady),
    warmStatusValue: fromEmailFollowUp ? "" : parsed.value,
    warmStatusDetail: fromEmailFollowUp ? "" : parsed.detail,
    lastContactAt: toDateInput(lead.lastContactAt) || today,
    lastContactedByUid: lead.lastContactedByUid || currentUid || "",
    nextFollowUpAt: toDateInput(lead.nextFollowUpAt),
    notes: isAwaitingAutoNote ? "" : existingNote,
    channels: {
      ...lead.channels,
      email: fromEmailFollowUp ? true : lead.channels.email,
    },
    // After email follow-up, default to updating that attempt; otherwise new attempt.
    countAsNewAttempt: !fromEmailFollowUp,
  };
}

export function LeadStatusDialog({
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
  const { members } = useLeadAssignees();
  const { uid } = useAuthUid();
  const [form, setForm] = useState<StatusFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !lead) return;
    setForm(fromLead(lead, uid));
    setError(null);
  }, [open, lead, uid]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !lead || !form || typeof document === "undefined") return null;

  const selectedWarm = warmStatusOptionByValue(form.warmStatusValue);
  const needsDetail = Boolean(selectedWarm?.requiresDetail);
  const fromEmailFollowUp = isEmailTrackingWarmStatus(lead.warmStatus);
  const warmAttempts = readWarmAttemptCount(lead);
  const coldAttempts = readColdAttemptCount(lead);
  const currentDisplay = displayAttemptCount(lead);
  const statusGroups = groupWarmStatusOptions(
    WARM_STATUS_RESULT_OPTIONS,
    lead.stage,
  );

  const statusForPreview = form.warmStatusValue || "other";
  const attendedForPreview =
    statusForPreview === "missed_demo" ?
      "missed"
    : isWarmReengageStatus(statusForPreview) &&
        normalizeDemoStatus(form.attendedDemo) === "missed" ?
      ""
    : form.attendedDemo;

  const warmStatusForPreview = resolveWarmStatusAfterDemoChange({
    attendedDemo: attendedForPreview,
    warmStatusValue: form.warmStatusValue,
    warmAttemptCount: warmAttempts,
    coldAttemptCount: coldAttempts,
  });

  const stageBeforeBump = form.warmStatusValue ?
      resolveStageAfterStatusUpdate({
        warmStatusValue: warmStatusForPreview,
        currentStage: lead.stage,
        attendedDemo: attendedForPreview,
        warmAttemptCount: warmAttempts,
        coldAttemptCount: coldAttempts,
      })
    : lead.stage;

  const preview = previewAttemptCounts({
    fromStage: lead.stage,
    toStage: stageBeforeBump,
    warmAttemptCount: warmAttempts,
    coldAttemptCount: coldAttempts,
    countAsNewAttempt: form.countAsNewAttempt,
  });

  const nextStage = form.warmStatusValue ?
      resolveStageAfterStatusUpdate({
        warmStatusValue: warmStatusForPreview,
        currentStage: lead.stage,
        attendedDemo: attendedForPreview,
        warmAttemptCount: preview.warmAttemptCount,
        coldAttemptCount: preview.coldAttemptCount,
      })
    : lead.stage;

  const queueHint =
    form.warmStatusValue === "subscribed" ?
      null
    : autoQueueMoveHint({
        attendedDemo: attendedForPreview,
        warmAttemptCount: preview.warmAttemptCount,
        coldAttemptCount: preview.coldAttemptCount,
        bumpTrack:
          form.countAsNewAttempt && form.warmStatusValue ? preview.track : undefined,
        warmStatusValue: warmStatusForPreview,
      });

  const nextTrack = leadQueueBucket(nextStage) === "cold" ? "cold" : "warm";
  const nextDisplayCount =
    nextTrack === "cold" ? preview.coldAttemptCount : preview.warmAttemptCount;
  const nextSeverity = attemptSeverity(nextDisplayCount, nextTrack);
  const nextThreshold =
    nextTrack === "cold" ?
      COLD_ATTEMPT_ARCHIVE_THRESHOLD
    : WARM_ATTEMPT_ARCHIVE_THRESHOLD;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!lead || !form) return;
    if (!form.warmStatusValue) {
      setError("Select the contact result / status.");
      return;
    }
    if (needsDetail && !form.warmStatusDetail.trim()) {
      setError("Please specify the status.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const attendedDemo =
        form.warmStatusValue === "missed_demo" ?
          "missed"
        : isWarmReengageStatus(form.warmStatusValue) &&
            normalizeDemoStatus(form.attendedDemo) === "missed" ?
          null
        : form.attendedDemo || undefined;
      const afterPreview = previewAttemptCounts({
        fromStage: lead.stage,
        toStage: resolveStageAfterStatusUpdate({
          warmStatusValue: resolveWarmStatusAfterDemoChange({
            attendedDemo,
            warmStatusValue: form.warmStatusValue,
            warmAttemptCount: warmAttempts,
            coldAttemptCount: coldAttempts,
          }),
          currentStage: lead.stage,
          attendedDemo,
          warmAttemptCount: warmAttempts,
          coldAttemptCount: coldAttempts,
        }),
        warmAttemptCount: warmAttempts,
        coldAttemptCount: coldAttempts,
        countAsNewAttempt: form.countAsNewAttempt,
      });
      const warmStatusValue = resolveWarmStatusAfterDemoChange({
        attendedDemo,
        warmStatusValue: form.warmStatusValue,
        warmAttemptCount: afterPreview.warmAttemptCount,
        coldAttemptCount: afterPreview.coldAttemptCount,
      });
      const warmStatus = formatWarmStatusForSave(
        warmStatusValue,
        form.warmStatusDetail,
      );
      const stage = resolveStageAfterStatusUpdate({
        warmStatusValue,
        currentStage: lead.stage,
        attendedDemo,
        warmAttemptCount: afterPreview.warmAttemptCount,
        coldAttemptCount: afterPreview.coldAttemptCount,
      });
      await onSave(
        {
          stage,
          attendedDemo,
          accountReady:
            warmStatusValue === "subscribed" ? true : form.accountReady,
          warmStatus,
          lastContactAt:
            form.lastContactAt ?
              new Date(form.lastContactAt).toISOString()
            : null,
          lastContactedByUid: form.lastContactedByUid || undefined,
          nextFollowUpAt:
            form.nextFollowUpAt ?
              new Date(form.nextFollowUpAt).toISOString()
            : null,
          notes: form.notes,
          stallReason: form.notes,
          channels: form.channels,
          bumpAttempt: form.countAsNewAttempt,
        },
        lead.id,
      );
      onClose();
    } catch {
      setError("Unable to update status.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-status-title"
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2
              id="lead-status-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Update status
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Record contact result and feedback for {lead.businessName}
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {fromEmailFollowUp ?
            <div className="rounded-lg border border-teal-100 bg-teal-50/80 px-3 py-2.5 text-sm text-teal-900">
              <p className="font-medium">
                Current: {lead.warmStatus} ·{" "}
                <span
                  className={attemptSeverityClassName(
                    attemptSeverity(currentDisplay.count, currentDisplay.track),
                  )}
                >
                  {currentDisplay.count}/{currentDisplay.threshold}{" "}
                  {currentDisplay.track} attempt
                  {currentDisplay.count === 1 ? "" : "s"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-teal-800/90">
                Email follow-up already logged. Choose whether this save updates
                that attempt or counts a new one.
              </p>
            </div>
          : null}

          <fieldset className="rounded-xl border border-zinc-200 px-3 py-3">
            <legend className="px-1 text-xs font-medium text-zinc-600">
              Attempt counting
            </legend>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">
                  {form.countAsNewAttempt ?
                    "Count as a new attempt"
                  : "Update previous attempt"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Warm track archives at {WARM_ATTEMPT_ARCHIVE_THRESHOLD}; cold
                  track at {COLD_ATTEMPT_ARCHIVE_THRESHOLD}. Some moves do not
                  count (e.g. Cold → Warm, Warm → Onboarded).
                </p>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Now: warm {warmAttempts}/{WARM_ATTEMPT_ARCHIVE_THRESHOLD}, cold{" "}
                  {coldAttempts}/{COLD_ATTEMPT_ARCHIVE_THRESHOLD}
                  {form.countAsNewAttempt && preview.track !== "none" ?
                    <>
                      {" "}
                      →{" "}
                      <span className={attemptSeverityClassName(nextSeverity)}>
                        {preview.track} {nextDisplayCount}/{nextThreshold}
                      </span>
                    </>
                  : form.countAsNewAttempt && preview.track === "none" && form.warmStatusValue ?
                    " · this change will not count"
                  : null}
                  .
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.countAsNewAttempt}
                aria-label="Count as a new attempt"
                className={cn(
                  "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
                  form.countAsNewAttempt ? "bg-teal-600" : "bg-zinc-300",
                )}
                onClick={() =>
                  setForm((prev) =>
                    prev ?
                      { ...prev, countAsNewAttempt: !prev.countAsNewAttempt }
                    : prev,
                  )
                }
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    form.countAsNewAttempt && "translate-x-5",
                  )}
                />
              </button>
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelClassName}>Status / result</span>
              <select
                className={inputClassName}
                value={form.warmStatusValue}
                required
                onChange={(event) => {
                  const value = event.target.value as WarmStatusValue | "";
                  setForm((prev) => {
                    if (!prev) return prev;
                    const option = warmStatusOptionByValue(value);
                    const attended =
                      value === "missed_demo" ?
                        "missed"
                      : value === "demo_scheduled" &&
                          normalizeDemoStatus(prev.attendedDemo) === "missed" ?
                        ""
                      : prev.attendedDemo;
                    const statusValue = resolveWarmStatusAfterDemoChange({
                      attendedDemo: attended,
                      warmStatusValue: value,
                      warmAttemptCount: warmAttempts,
                      coldAttemptCount: coldAttempts,
                    });
                    const next =
                      value ?
                        resolveStageAfterStatusUpdate({
                          warmStatusValue: statusValue,
                          currentStage: lead.stage,
                          attendedDemo: attended,
                          warmAttemptCount: warmAttempts,
                          coldAttemptCount: coldAttempts,
                        })
                      : lead.stage;
                    return {
                      ...prev,
                      warmStatusValue: value,
                      warmStatusDetail:
                        option?.requiresDetail ? prev.warmStatusDetail : "",
                      stage: next,
                      attendedDemo:
                        value === "missed_demo" ?
                          "missed"
                        : value === "demo_scheduled" &&
                            normalizeDemoStatus(prev.attendedDemo) === "missed" ?
                          ""
                        : prev.attendedDemo,
                      accountReady:
                        value === "subscribed" ? true : prev.accountReady,
                    };
                  });
                }}
              >
                <option value="">—</option>
                {statusGroups.map((group) => (
                  <optgroup key={group.id} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {selectedWarm?.moveHint ?
                <span className="mt-1 block text-xs text-teal-800">
                  {selectedWarm.moveHint}
                </span>
              : <span className="mt-1 block text-xs text-zinc-500">
                  Record the outcome of this contact. Feedback is optional.
                </span>
              }
              {queueHint ?
                <span className="mt-1 block text-xs font-medium text-sky-800">
                  {queueHint}
                </span>
              : null}
            </label>
            {needsDetail ?
              <label className="block sm:col-span-2">
                <span className={labelClassName}>
                  {form.warmStatusValue === "duplicate_record" ?
                    "Which record to keep"
                  : "Specify status"}
                </span>
                <input
                  className={inputClassName}
                  value={form.warmStatusDetail}
                  onChange={(event) =>
                    setForm((prev) =>
                      prev ?
                        { ...prev, warmStatusDetail: event.target.value }
                      : prev,
                    )
                  }
                  placeholder={
                    form.warmStatusValue === "duplicate_record" ?
                      "e.g. keep SmartRefill sr-business:… / archive legacy sr-legacy:…"
                    : "Add details…"
                  }
                  required
                />
              </label>
            : null}
            <label className="block">
              <span className={labelClassName}>Demo</span>
              <select
                className={inputClassName}
                value={form.attendedDemo}
                onChange={(event) => {
                  const demo = event.target
                    .value as StatusFormState["attendedDemo"];
                  setForm((prev) => {
                    if (!prev) return prev;
                    const warmStatusValue = resolveWarmStatusAfterDemoChange({
                      attendedDemo: demo,
                      warmStatusValue: prev.warmStatusValue,
                      warmAttemptCount: warmAttempts,
                      coldAttemptCount: coldAttempts,
                    });
                    const stage = resolveStageAfterStatusUpdate({
                      warmStatusValue,
                      currentStage: lead.stage,
                      attendedDemo: demo,
                      warmAttemptCount: warmAttempts,
                      coldAttemptCount: coldAttempts,
                    });
                    return {
                      ...prev,
                      attendedDemo: demo,
                      warmStatusValue,
                      stage,
                    };
                  });
                }}
              >
                <option value="">—</option>
                {DEMO_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {form.attendedDemo === "missed" ?
                <span className="mt-1 block text-xs font-medium text-sky-800">
                  Missed demo — status set to Missed Demo · moves to Cold.
                </span>
              : null}
            </label>
            <label className="block">
              <span className={labelClassName}>Date contacted</span>
              <input
                className={inputClassName}
                type="date"
                value={form.lastContactAt}
                onChange={(event) =>
                  setForm((prev) =>
                    prev ?
                      { ...prev, lastContactAt: event.target.value }
                    : prev,
                  )
                }
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Contacted by</span>
              <select
                className={inputClassName}
                value={form.lastContactedByUid}
                onChange={(event) =>
                  setForm((prev) =>
                    prev ?
                      { ...prev, lastContactedByUid: event.target.value }
                    : prev,
                  )
                }
              >
                <option value="">—</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName || member.email || member.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClassName}>Next follow-up</span>
              <input
                className={inputClassName}
                type="date"
                value={form.nextFollowUpAt}
                onChange={(event) =>
                  setForm((prev) =>
                    prev ?
                      { ...prev, nextFollowUpAt: event.target.value }
                    : prev,
                  )
                }
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClassName}>Feedback / result (optional)</span>
              <textarea
                className={`${inputClassName} min-h-20`}
                value={form.notes}
                placeholder="What did they say? Decision, objection, next step…"
                onChange={(event) =>
                  setForm((prev) =>
                    prev ? { ...prev, notes: event.target.value } : prev,
                  )
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
            {(
              [
                ["viber", "Viber"],
                ["email", "Email"],
                ["messenger", "Messenger"],
                ["smsCall", "SMS/Call"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.channels[key]}
                  onChange={(event) =>
                    setForm((prev) =>
                      prev ?
                        {
                          ...prev,
                          channels: {
                            ...prev.channels,
                            [key]: event.target.checked,
                          },
                        }
                      : prev,
                    )
                  }
                />
                {label}
              </label>
            ))}
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.accountReady}
                onChange={(event) =>
                  setForm((prev) =>
                    prev ?
                      { ...prev, accountReady: event.target.checked }
                    : prev,
                  )
                }
              />
              Account ready
            </label>
          </div>

          {error ?
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          : null}

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save status"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
