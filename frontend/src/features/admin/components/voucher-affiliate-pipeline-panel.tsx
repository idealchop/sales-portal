"use client";

import { Button } from "@/components/ui/button";
import {
  formatReferralSuccessRate,
  suggestPartnerCode,
  type ProspectVoucherRow,
  type ReferralPartnerRow,
} from "@/features/lead-pipeline/lib/lead-referral-partners";
import { prefilledVoucherAffiliateForm } from "@/lib/admin/catalog-document-forms";
import type { CatalogFormValues } from "@/lib/admin/catalog-document-forms";

export function voucherAffiliatePrefillFromPartner(
  row: ReferralPartnerRow,
): CatalogFormValues {
  return prefilledVoucherAffiliateForm({
    kind: "affiliate",
    name: row.label,
    code: row.affiliateCode || suggestPartnerCode(row.label),
    contactEmail: row.email,
    ownerUserId: row.userId,
    notesInternal: row.reason,
  });
}

export function voucherAffiliatePrefillFromProspect(
  row: ProspectVoucherRow,
): CatalogFormValues {
  return prefilledVoucherAffiliateForm({
    kind: "voucher",
    name: `${row.businessName} close`,
    code: suggestPartnerCode(row.businessName),
    contactEmail: row.email,
    notesInternal: row.reason,
  });
}

export function VoucherAffiliatePipelinePanel({
  partners,
  prospectVouchers,
  closeDealProspects,
  onCreatePartner,
  onCreateVoucher,
}: {
  partners: ReferralPartnerRow[];
  prospectVouchers: ProspectVoucherRow[];
  closeDealProspects: ProspectVoucherRow[];
  onCreatePartner: (row: ReferralPartnerRow) => void;
  onCreateVoucher: (row: ProspectVoucherRow) => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Pipeline: who deserves a code
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Success rate is paid Starter–Scale only. Free and trial do not count as
          subscribed. Onboarded/account-ready referees still count toward payout.
        </p>
      </div>

      {partners.length === 0 ?
        <p className="text-sm text-zinc-500">
          No referral partners in the lead pipeline yet.
        </p>
      : <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="pb-2 pr-3">Partner</th>
                <th className="pb-2 pr-3">Success</th>
                <th className="hidden pb-2 pr-3 md:table-cell">Payout</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {partners.map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-3">
                    <p className="font-medium text-zinc-900">{row.label}</p>
                    <p className="text-[11px] text-zinc-500">
                      {row.affiliateCode || row.email || "No partner code yet"}
                      {row.contentAttributed ? " · webinar/article" : ""}
                    </p>
                  </td>
                  <td className="py-2 pr-3">
                    <p className="font-medium tabular-nums">
                      {formatReferralSuccessRate(row.subscribed, row.referred)}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {row.subscribed} paid / {row.referred} referred
                    </p>
                  </td>
                  <td className="hidden py-2 pr-3 tabular-nums md:table-cell">
                    {row.payoutEligible}
                  </td>
                  <td className="py-2">
                    {row.affiliateId ?
                      <span className="text-xs text-zinc-500">Already affiliated</span>
                    : <Button size="sm" onClick={() => onCreatePartner(row)}>
                        Create partner code
                      </Button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }

      <ProspectGroup
        title="Checkout voucher prospects"
        rows={prospectVouchers}
        onCreate={onCreateVoucher}
      />
      <ProspectGroup
        title="Close-the-deal (stalled warm + demo)"
        rows={closeDealProspects}
        onCreate={onCreateVoucher}
      />
    </section>
  );
}

function ProspectGroup({
  title,
  rows,
  onCreate,
}: {
  title: string;
  rows: ProspectVoucherRow[];
  onCreate: (row: ProspectVoucherRow) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      {rows.length === 0 ?
        <p className="mt-1 text-sm text-zinc-500">None right now.</p>
      : <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-100 md:hidden">
          {rows.slice(0, 12).map((row) => (
            <li key={row.leadId} className="flex items-start justify-between gap-3 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{row.businessName}</p>
                <p className="text-[11px] text-zinc-500">{row.reason}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onCreate(row)}>
                Create
              </Button>
            </li>
          ))}
        </ul>
      }
      {rows.length > 0 ?
        <div className="mt-2 hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="pb-2 pr-3">Station</th>
                <th className="pb-2 pr-3">Referrer</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.slice(0, 12).map((row) => (
                <tr key={row.leadId}>
                  <td className="py-2 pr-3">
                    <p className="font-medium">{row.businessName}</p>
                    <p className="text-[11px] text-zinc-500">{row.reason}</p>
                  </td>
                  <td className="py-2 pr-3 text-zinc-600">{row.referredBy}</td>
                  <td className="py-2">
                    <Button size="sm" variant="outline" onClick={() => onCreate(row)}>
                      Create voucher
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      : null}
    </div>
  );
}
