"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/definitions";
import {
  formatLeadMilestoneDate,
  inputClassName,
  isAcquisitionSource,
  labelClassName,
  LEAD_ACQUISITION_SOURCES,
  resolveInquiredAt,
  resolveRegisteredAt,
  type LeadAcquisitionSource,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { LeadReferrerPicker } from "@/features/lead-pipeline/components/lead-referrer-picker";

type DetailsFormState = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  leadSource: "" | LeadAcquisitionSource;
  sourceWebsite: string;
  referredBy: string;
  referredByClientId: string;
  referredByUserId: string;
  referredByAffiliateId: string;
  referredByAffiliateCode: string;
};

function fromLead(lead: Lead): DetailsFormState {
  return {
    businessName: lead.businessName,
    ownerName: lead.ownerName,
    email: lead.email || "",
    phone: lead.phone || "",
    address: lead.address || "",
    leadSource: isAcquisitionSource(lead.leadSource) ? lead.leadSource : "",
    sourceWebsite: lead.sourceWebsite || "",
    referredBy: lead.referredBy || "",
    referredByClientId: lead.referredByClientId || "",
    referredByUserId: lead.referredByUserId || "",
    referredByAffiliateId: lead.referredByAffiliateId || "",
    referredByAffiliateCode: lead.referredByAffiliateCode || "",
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
      {children}
    </h3>
  );
}

export function LeadUpdateDetailsDialog({
  open,
  lead,
  onClose,
  onSave,
}: {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSave: (input: Partial<Lead>, leadId: string) => Promise<void>;
}) {
  const [form, setForm] = useState<DetailsFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !lead) return;
    setForm(fromLead(lead));
    setError(null);
  }, [open, lead]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !lead || !form || typeof document === "undefined") return null;

  const inquiredAt = resolveInquiredAt(lead);
  const registeredAt = resolveRegisteredAt(lead);
  const pipelineOrigin =
    lead.leadSource && !isAcquisitionSource(lead.leadSource) ?
      lead.leadSource
    : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!lead || !form) return;
    if (!form.businessName.trim() || !form.ownerName.trim()) {
      setError("Business name and owner name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const sourcePayload =
        form.leadSource ?
          {
            leadSource: form.leadSource,
            sourceWebsite:
              form.leadSource === "Website" ? form.sourceWebsite.trim() : "",
            referredBy:
              form.leadSource === "Referrals" ? form.referredBy.trim() : "",
            referredByClientId:
              form.leadSource === "Referrals" ?
                form.referredByClientId.trim()
              : "",
            referredByUserId:
              form.leadSource === "Referrals" ?
                form.referredByUserId.trim()
              : "",
            referredByAffiliateId:
              form.leadSource === "Referrals" ?
                form.referredByAffiliateId.trim()
              : "",
            referredByAffiliateCode:
              form.leadSource === "Referrals" ?
                form.referredByAffiliateCode.trim()
              : "",
          }
        : {};
      await onSave(
        {
          businessName: form.businessName.trim(),
          ownerName: form.ownerName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          ...sourcePayload,
        },
        lead.id,
      );
      onClose();
    } catch {
      setError("Unable to update details.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-update-details-title"
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2
              id="lead-update-details-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Update details
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
                    setForm((prev) =>
                      prev ?
                        { ...prev, businessName: event.target.value }
                      : prev,
                    )
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
                    setForm((prev) =>
                      prev ? { ...prev, ownerName: event.target.value } : prev,
                    )
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
                    setForm((prev) =>
                      prev ? { ...prev, email: event.target.value } : prev,
                    )
                  }
                />
              </label>
              <label className="block">
                <span className={labelClassName}>Phone</span>
                <input
                  className={inputClassName}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) =>
                      prev ? { ...prev, phone: event.target.value } : prev,
                    )
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClassName}>Address</span>
                <input
                  className={inputClassName}
                  value={form.address}
                  onChange={(event) =>
                    setForm((prev) =>
                      prev ? { ...prev, address: event.target.value } : prev,
                    )
                  }
                />
              </label>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 sm:col-span-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className={labelClassName}>Date inquire</div>
                    <div className="text-sm text-zinc-800">
                      {formatLeadMilestoneDate(inquiredAt)}
                    </div>
                  </div>
                  <div>
                    <div className={labelClassName}>Date registered</div>
                    <div className="text-sm text-zinc-800">
                      {formatLeadMilestoneDate(registeredAt)}
                    </div>
                  </div>
                </div>
              </div>
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
                    setForm((prev) =>
                      prev ?
                        {
                          ...prev,
                          leadSource: event.target
                            .value as DetailsFormState["leadSource"],
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
                        }
                      : prev,
                    )
                  }
                >
                  <option value="">—</option>
                  {LEAD_ACQUISITION_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                {pipelineOrigin ?
                  <span className="mt-1 block text-xs text-zinc-500">
                    Pipeline origin: {pipelineOrigin}
                  </span>
                : null}
              </label>
              {form.leadSource === "Website" ?
                <label className="block">
                  <span className={labelClassName}>Which website</span>
                  <input
                    className={inputClassName}
                    value={form.sourceWebsite}
                    onChange={(event) =>
                      setForm((prev) =>
                        prev ?
                          { ...prev, sourceWebsite: event.target.value }
                        : prev,
                      )
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
                  }}
                  onChange={(selection) =>
                    setForm((prev) =>
                      prev ?
                        {
                          ...prev,
                          referredBy: selection.label,
                          referredByClientId: selection.clientId || "",
                          referredByUserId: selection.userId || "",
                          referredByAffiliateId: selection.affiliateId || "",
                          referredByAffiliateCode: selection.affiliateCode || "",
                        }
                      : prev,
                    )
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
              {saving ? "Saving…" : "Save details"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
