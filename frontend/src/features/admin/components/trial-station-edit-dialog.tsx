"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SMARTREFILL_TRIAL_APP_LABEL,
  manilaDateInputValue,
  trialEndsAtFromManilaDate,
} from "@/features/admin/lib/trial-station-edit";
import type { UserSubscriptionListItem } from "@/features/dashboard/lib/build-user-subscriptions-list";
import { displaySubscriptionPlanName } from "@/lib/dashboard/subscription-labels";

export type TrialPlanOption = {
  code: string;
  label: string;
};

export function TrialStationEditDialog({
  station,
  planOptions,
  saving,
  error,
  onClose,
  onSave,
}: {
  station: UserSubscriptionListItem;
  planOptions: TrialPlanOption[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: {
    planCode: string;
    expiresAt: string;
    note: string;
    paid: boolean;
  }) => void;
}) {
  const currentCode = (station.subscription.planCode || "scale").toLowerCase();
  const [planCode, setPlanCode] = useState(
    planOptions.some((option) => option.code === currentCode) ? currentCode : planOptions[0]?.code || currentCode,
  );
  const [endDate, setEndDate] = useState(
    manilaDateInputValue(station.subscription.expiresAt),
  );
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, saving]);

  function handleSubmit() {
    try {
      setLocalError(null);
      const trimmedNote = note.trim();
      if (trimmedNote.length < 8) {
        setLocalError("Add a note explaining why this subscription changed.");
        return;
      }
      onSave({
        planCode,
        expiresAt: trialEndsAtFromManilaDate(endDate),
        note: trimmedNote,
        paid,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Enter a trial end date.");
    }
  }

  const shownError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-edit-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="trial-edit-title" className="text-base font-semibold text-foreground">
              Overwrite subscription
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {station.businessName || station.businessId} is on a free trial. Saving replaces that
              subscription with the plan you pick, such as free trial to Scale.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">App</span>
            <input
              value={SMARTREFILL_TRIAL_APP_LABEL}
              readOnly
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-zinc-50 px-3 text-sm text-zinc-600"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Replace with</span>
            <select
              value={planCode}
              onChange={(event) => setPlanCode(event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
            >
              {planOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              Now on a free trial of {displaySubscriptionPlanName(station.subscription)}.
            </p>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Access until</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
            />
            <p className="text-xs text-zinc-500">They keep this plan through this day (Philippine time).</p>
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Payment</legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="overwrite-payment"
                className="mt-1"
                checked={!paid}
                onChange={() => setPaid(false)}
              />
              <span>
                <span className="block font-medium text-foreground">Granted — not paid</span>
                <span className="block text-xs text-zinc-500">
                  Recorded at ₱0. This is not counted as income or a sale.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="overwrite-payment"
                className="mt-1"
                checked={paid}
                onChange={() => setPaid(true)}
              />
              <span>
                <span className="block font-medium text-foreground">Paid</span>
                <span className="block text-xs text-zinc-500">
                  Recorded at the plan’s monthly price.
                </span>
              </span>
            </label>
          </fieldset>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">Why this changed</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Example: Moved from free trial to the Scale plan after a sales call."
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none ring-[var(--primary)] focus:ring-2"
            />
          </label>
        </div>

        {shownError ?
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {shownError}
          </p>
        : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !planCode || note.trim().length < 8}>
            {saving ?
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Saving…
              </>
            : "Overwrite subscription"}
          </Button>
        </div>
      </div>
    </div>
  );
}
