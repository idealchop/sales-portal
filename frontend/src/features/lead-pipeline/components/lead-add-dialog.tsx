"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadReferrerPicker } from "@/features/lead-pipeline/components/lead-referrer-picker";
import {
  buildManualLeadInput,
  EMPTY_MANUAL_LEAD_FORM,
  inputClassName,
  labelClassName,
  LEAD_ACQUISITION_SOURCES,
  type ManualLeadForm,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import type { Lead } from "@/lib/definitions";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
      {children}
    </h3>
  );
}

export function LeadAddDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: Partial<Lead>) => Promise<void>;
}) {
  const [form, setForm] = useState<ManualLeadForm>(EMPTY_MANUAL_LEAD_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_MANUAL_LEAD_FORM);
    setError(null);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.businessName.trim() || !form.ownerName.trim()) {
      setError("Business name and owner name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate(buildManualLeadInput(form));
      onClose();
    } catch {
      setError("Unable to add lead.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-add-title"
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2
              id="lead-add-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Add lead
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Starts on Warm, assigned to you.
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

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-4">
          <section className="space-y-3">
            <SectionTitle>User details</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClassName}>Business name</span>
                <input
                  className={inputClassName}
                  value={form.businessName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      businessName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="block">
                <span className={labelClassName}>Owner name</span>
                <input
                  className={inputClassName}
                  value={form.ownerName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      ownerName: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="block">
                <span className={labelClassName}>Email</span>
                <input
                  className={inputClassName}
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className={labelClassName}>Phone</span>
                <input
                  className={inputClassName}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClassName}>Address</span>
                <input
                  className={inputClassName}
                  value={form.address}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClassName}>Notes</span>
                <textarea
                  className={inputClassName}
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-zinc-100 pt-4">
            <SectionTitle>Source</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClassName}>Acquisition source</span>
                <select
                  className={inputClassName}
                  value={form.leadSource}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      leadSource: event.target
                        .value as ManualLeadForm["leadSource"],
                      sourceWebsite:
                        event.target.value === "Website" ?
                          prev.sourceWebsite
                        : "",
                      referredBy:
                        event.target.value === "Referrals" ?
                          prev.referredBy
                        : "",
                      referredByClientId:
                        event.target.value === "Referrals" ?
                          prev.referredByClientId
                        : "",
                      referredByUserId:
                        event.target.value === "Referrals" ?
                          prev.referredByUserId
                        : "",
                      referredByAffiliateId:
                        event.target.value === "Referrals" ?
                          prev.referredByAffiliateId
                        : "",
                      referredByAffiliateCode:
                        event.target.value === "Referrals" ?
                          prev.referredByAffiliateCode
                        : "",
                      referredByEmail:
                        event.target.value === "Referrals" ?
                          prev.referredByEmail
                        : "",
                    }))
                  }
                >
                  <option value="">—</option>
                  {LEAD_ACQUISITION_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
              {form.leadSource === "Website" ?
                <label className="block">
                  <span className={labelClassName}>Which website</span>
                  <input
                    className={inputClassName}
                    value={form.sourceWebsite}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        sourceWebsite: event.target.value,
                      }))
                    }
                    placeholder="smartrefill.app…"
                  />
                </label>
              : null}
              {form.leadSource === "Referrals" ?
                <LeadReferrerPicker
                  value={{
                    label: form.referredBy,
                    clientId: form.referredByClientId || undefined,
                    userId: form.referredByUserId || undefined,
                    affiliateId: form.referredByAffiliateId || undefined,
                    affiliateCode: form.referredByAffiliateCode || undefined,
                    email: form.referredByEmail || undefined,
                  }}
                  onChange={(selection) =>
                    setForm((prev) => ({
                      ...prev,
                      referredBy: selection.label,
                      referredByClientId: selection.clientId || "",
                      referredByUserId: selection.userId || "",
                      referredByAffiliateId: selection.affiliateId || "",
                      referredByAffiliateCode: selection.affiliateCode || "",
                      referredByEmail: selection.email || "",
                    }))
                  }
                />
              : null}
            </div>
          </section>

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
              {saving ? "Adding…" : "Add lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
