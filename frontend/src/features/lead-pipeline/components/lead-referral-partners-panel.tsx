"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogDocumentFormDialog } from "@/features/admin/components/catalog-document-form-dialog";
import {
  buildReferralPartnerBoard,
  formatReferralSuccessRate,
  suggestPartnerCode,
  type ProspectVoucherRow,
  type ReferralPartnerRecommendation,
  type ReferralPartnerRow,
} from "@/features/lead-pipeline/lib/lead-referral-partners";
import { useAdminCatalogCollection } from "@/hooks/use-admin-catalog-collection";
import { catalogAffiliates } from "@/lib/admin/catalog-offer-options";
import {
  prefilledVoucherAffiliateForm,
  type CatalogFormValues,
} from "@/lib/admin/catalog-document-forms";
import type { Lead } from "@/lib/definitions";
import { cn } from "@/lib/utils";

function recommendationLabel(value: ReferralPartnerRecommendation): string {
  if (value === "already_affiliate") return "Already affiliate";
  if (value === "make_affiliate") return "Make affiliate";
  if (value === "thank_you_voucher") return "Thank-you voucher";
  return "Watch";
}

function recommendationClass(value: ReferralPartnerRecommendation): string {
  if (value === "already_affiliate") return "bg-emerald-50 text-emerald-800";
  if (value === "make_affiliate") return "bg-sky-50 text-sky-800";
  if (value === "thank_you_voucher") return "bg-amber-50 text-amber-900";
  return "bg-zinc-100 text-zinc-600";
}

function partnerPrefill(row: ReferralPartnerRow): CatalogFormValues {
  return prefilledVoucherAffiliateForm({
    kind: "affiliate",
    name: row.label,
    code: row.affiliateCode || suggestPartnerCode(row.label),
    contactEmail: row.email,
    ownerUserId: row.userId,
    notesInternal: `Created from Insights. ${row.reason}`,
  });
}

function voucherPrefill(row: ProspectVoucherRow): CatalogFormValues {
  return prefilledVoucherAffiliateForm({
    kind: "voucher",
    name: `${row.businessName} close`,
    code: suggestPartnerCode(row.businessName),
    contactEmail: row.email,
    notesInternal: row.reason,
  });
}

function ProspectList({
  title,
  rows,
  onCreate,
}: {
  title: string;
  rows: ProspectVoucherRow[];
  onCreate: (row: ProspectVoucherRow) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
        {rows.slice(0, 10).map((row) => (
          <li
            key={row.leadId}
            className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-zinc-900">{row.businessName}</p>
              <p className="text-[11px] text-zinc-500">
                {row.referredBy} · {row.reason}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => onCreate(row)}
            >
              Create voucher
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LeadReferralPartnersPanel({ leads }: { leads: Lead[] }) {
  const { documents, saveDocument } = useAdminCatalogCollection(
    "vouchers_affiliates",
    true,
  );
  const affiliates = useMemo(() => catalogAffiliates(documents), [documents]);
  const board = useMemo(
    () => buildReferralPartnerBoard(leads, affiliates),
    [affiliates, leads],
  );
  const [createPrefill, setCreatePrefill] = useState<CatalogFormValues | null>(
    null,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Who to reward</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">
              Affiliates are for the person who referred. Vouchers are for the
              new station still deciding. Success rate only counts referees who
              onboarded on a paid Starter–Scale plan — Free and trial do not
              count as subscribed. Onboarded/account-ready still count toward
              payout.
            </p>
          </div>
          <Link
            href="/subscriptions/vouchers-affiliates"
            className="text-sm font-medium text-[var(--primary)] underline-offset-2 hover:underline"
          >
            Open vouchers & affiliates
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {board.partners.length === 0 ?
          <p className="text-sm text-zinc-500">
            No referral leads yet. Set source to Referrals, or wait for webinar /
            article visitors to convert — speakers and authors count as referrers.
          </p>
        : <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="pb-2 pr-3">Referrer</th>
                  <th className="hidden pb-2 pr-3 sm:table-cell">Referred</th>
                  <th className="hidden pb-2 pr-3 md:table-cell">Onboarded</th>
                  <th className="pb-2 pr-3">Subscribed</th>
                  <th className="pb-2 pr-3">Success</th>
                  <th className="pb-2">Do this</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {board.partners.map((row) => (
                  <tr key={row.key}>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-zinc-900">{row.label}</p>
                      <p className="text-[11px] text-zinc-500">
                        {row.affiliateCode || row.email || row.userId || "No code yet"}
                        {row.contentAttributed ? " · content" : ""}
                      </p>
                    </td>
                    <td className="hidden py-2 pr-3 tabular-nums sm:table-cell">
                      {row.referred}
                    </td>
                    <td className="hidden py-2 pr-3 tabular-nums md:table-cell">
                      {row.onboarded}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{row.subscribed}</td>
                    <td className="py-2 pr-3">
                      <p className="font-medium tabular-nums text-zinc-900">
                        {formatReferralSuccessRate(row.subscribed, row.referred)}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {row.subscribed} paid / {row.payoutEligible} payout
                      </p>
                    </td>
                    <td className="py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          recommendationClass(row.recommendation),
                        )}
                      >
                        {recommendationLabel(row.recommendation)}
                      </span>
                      <p className="mt-1 max-w-xs text-[11px] text-zinc-500">
                        {row.reason}
                      </p>
                      {row.recommendation === "make_affiliate" ||
                      row.recommendation === "thank_you_voucher" ?
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => setCreatePrefill(partnerPrefill(row))}
                        >
                          Create partner code
                        </Button>
                      : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }

        <ProspectList
          title="Prospects who deserve a checkout voucher"
          rows={board.prospectVouchers}
          onCreate={(row) => setCreatePrefill(voucherPrefill(row))}
        />
        <ProspectList
          title="Stalled warm + attended demo"
          rows={board.closeDealProspects}
          onCreate={(row) => setCreatePrefill(voucherPrefill(row))}
        />
      </CardContent>

      {createPrefill ?
        <CatalogDocumentFormDialog
          mode="create"
          collectionId="vouchers_affiliates"
          existingDocumentIds={documents.map((doc) => doc.documentId)}
          createPrefill={createPrefill}
          onClose={() => setCreatePrefill(null)}
          onSave={async (documentId, data) => {
            await saveDocument(documentId, data);
            setCreatePrefill(null);
          }}
        />
      : null}
    </Card>
  );
}