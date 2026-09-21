"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Loader2, Mail, Tag, Users, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdminCatalogCollection } from "@/hooks/use-admin-catalog-collection";
import {
  buildPromoteEmailDraft,
  filterPromoteOffers,
  parsePromoteOffers,
  type PromoteEmailDraft,
  type PromoteOffer,
  type PromoteOfferKind,
} from "@/features/lead-pipeline/lib/lead-promote-offer";
import {
  inputClassName,
  labelClassName,
} from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { cn } from "@/lib/utils";

export function LeadPromoteOfferDialog({
  open,
  onClose,
  onUseInEmail,
}: {
  open: boolean;
  onClose: () => void;
  onUseInEmail: (draft: PromoteEmailDraft) => void;
}) {
  const { documents, isLoading, error } = useAdminCatalogCollection(
    "vouchers_affiliates",
    open,
  );
  const [tab, setTab] = useState<PromoteOfferKind>("voucher");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const offers = useMemo(() => parsePromoteOffers(documents), [documents]);
  const visible = useMemo(
    () =>
      filterPromoteOffers(offers, tab, {
        activeOnly: !includeInactive,
        query,
      }),
    [offers, tab, includeInactive, query],
  );
  const selected = visible.find((row) => row.documentId === selectedId) ||
    offers.find((row) => row.documentId === selectedId) ||
    null;

  if (!open || typeof document === "undefined") return null;

  async function copyCode(offer: PromoteOffer) {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function handleUseInEmail() {
    if (!selected) return;
    onUseInEmail(buildPromoteEmailDraft(selected));
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-4 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-promote-title"
        className="my-auto flex max-h-[min(92vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-zinc-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                Lead pipeline
              </p>
              <h2
                id="lead-promote-title"
                className="mt-1 text-xl font-semibold tracking-tight text-zinc-900"
              >
                Promote offers
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                Pick a checkout voucher for prospect blasts, or a partner code
                to share with referrers — then email or copy the code.
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
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
                tab === "voucher" ?
                  "border-teal-600 bg-teal-50 text-teal-900"
                : "border-zinc-200 text-zinc-600",
              )}
              onClick={() => {
                setTab("voucher");
                setSelectedId(null);
              }}
            >
              <Tag className="h-3.5 w-3.5" />
              Vouchers
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
                tab === "affiliate" ?
                  "border-teal-600 bg-teal-50 text-teal-900"
                : "border-zinc-200 text-zinc-600",
              )}
              onClick={() => {
                setTab("affiliate");
                setSelectedId(null);
              }}
            >
              <Users className="h-3.5 w-3.5" />
              Partner codes
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            {tab === "voucher" ?
              "Vouchers are checkout discounts for leads in your blast list."
            : "Partner codes belong to referrers — use when emailing affiliates, not as a prospect discount."}
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <label className={labelClassName} htmlFor="promote-search">
                Search
              </label>
              <input
                id="promote-search"
                className={cn(inputClassName, "mt-1.5")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Code or name…"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-xs text-zinc-600">
              <input
                type="checkbox"
                className="rounded border-zinc-300"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
              />
              Show inactive
            </label>
          </div>

          {isLoading ?
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
            </div>
          : error ?
            <p className="text-sm text-red-600">{error}</p>
          : visible.length === 0 ?
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-10 text-center text-sm text-zinc-500">
              No {tab === "voucher" ? "vouchers" : "partner codes"} found.{" "}
              <Link
                href="/subscriptions/vouchers-affiliates"
                className="font-medium text-teal-700 hover:underline"
              >
                Manage catalog
              </Link>
            </div>
          : <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
              {visible.map((offer) => {
                const active = selectedId === offer.documentId;
                return (
                  <li key={offer.documentId}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-teal-50/40",
                        active && "bg-teal-50/70",
                      )}
                      onClick={() => setSelectedId(offer.documentId)}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-zinc-900">
                          {offer.code}
                        </span>
                        {!offer.isActive ?
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-500">
                            Inactive
                          </span>
                        : null}
                        <span className="text-xs text-zinc-500">
                          {offer.offerLine}
                        </span>
                      </span>
                      <span className="text-sm text-zinc-700">{offer.name}</span>
                      {offer.validUntil ?
                        <span className="text-[11px] text-zinc-500">
                          Until {offer.validUntil}
                          {offer.applicablePlans ?
                            ` · ${offer.applicablePlans}`
                          : ""}
                        </span>
                      : offer.contactEmail ?
                        <span className="text-[11px] text-zinc-500">
                          {offer.contactEmail}
                        </span>
                      : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          }

          <p className="text-xs text-zinc-500">
            Create or edit codes in{" "}
            <Link
              href="/subscriptions/vouchers-affiliates"
              className="font-medium text-teal-700 hover:underline"
            >
              Vouchers & affiliates
            </Link>
            .
          </p>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-6 py-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected}
            className="gap-1.5"
            onClick={() => {
              if (selected) void copyCode(selected);
            }}
          >
            {copied ?
              <Check className="h-3.5 w-3.5 text-teal-700" />
            : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy code"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!selected}
            className="gap-1.5"
            onClick={handleUseInEmail}
          >
            <Mail className="h-3.5 w-3.5" />
            Use in email blast
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
