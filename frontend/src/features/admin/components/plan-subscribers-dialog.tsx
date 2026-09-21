"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
import type { UserSubscriptionListItem } from "@/features/dashboard/lib/build-user-subscriptions-list";
import { usePagination } from "@/hooks/use-pagination";
import {
  isLiveTrialSubscription,
  trialStartedAt,
} from "@/lib/admin/plan-subscriber-roster";
import {
  displaySubscriptionPlanName,
  formatBillingCycleLabel,
  formatSubscriptionDate,
  formatSubscriptionStatus,
  formatTrialDaysRemaining,
} from "@/lib/dashboard/subscription-labels";
import { cn } from "@/lib/utils";

const PLAN_SUBSCRIBERS_PAGE_SIZE = 10;

type RosterDialogKind = "plan" | "addon" | "voucher" | "affiliate";

function rosterDialogCopy(kind: RosterDialogKind): {
  heading: string;
  emptySummary: string;
  emptyBody: string;
} {
  if (kind === "addon") {
    return {
      heading: "Who has this add-on",
      emptySummary: "No live stations with this add-on.",
      emptyBody: "Nobody is currently using this catalog add-on.",
    };
  }
  if (kind === "voucher") {
    return {
      heading: "Who used this voucher",
      emptySummary: "No live stations with this voucher.",
      emptyBody: "Nobody is currently using this voucher.",
    };
  }
  if (kind === "affiliate") {
    return {
      heading: "Who came through this partner",
      emptySummary: "No live stations from this affiliate.",
      emptyBody: "Nobody is currently attributed to this partner.",
    };
  }
  return {
    heading: "Who is on this plan",
    emptySummary: "No live stations on this plan.",
    emptyBody: "Nobody is currently using this catalog plan.",
  };
}

export function PlanSubscribersDialog({
  planName,
  subscribers,
  kind = "plan",
  onClose,
}: {
  planName: string;
  subscribers: UserSubscriptionListItem[];
  kind?: RosterDialogKind;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return subscribers;
    return subscribers.filter((row) => {
      const haystack = [
        row.businessName,
        row.ownerEmail,
        row.businessId,
        row.subscription.planName,
        row.subscription.voucherCode,
        row.subscription.affiliateCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, subscribers]);
  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } =
    usePagination(filtered, PLAN_SUBSCRIBERS_PAGE_SIZE, query);

  const trialCount = subscribers.filter((row) =>
    isLiveTrialSubscription(row.subscription),
  ).length;
  const copy = rosterDialogCopy(kind);

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-subscribers-title"
        className="relative z-10 flex max-h-[min(92vh,90dvh)] w-[95vw] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl sm:max-w-2xl sm:w-full"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {copy.heading}
            </p>
            <h2
              id="plan-subscribers-title"
              className="text-lg font-semibold text-foreground"
            >
              {planName}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {subscribers.length === 0 ?
                copy.emptySummary
              : `${subscribers.length} station${subscribers.length === 1 ? "" : "s"}${
                  trialCount > 0 ? ` · ${trialCount} on trial` : ""
                }`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {subscribers.length > 0 ?
          <div className="shrink-0 border-b border-zinc-100 px-5 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search station or email…"
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>
        : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {subscribers.length === 0 ?
            <p className="px-5 py-10 text-center text-sm text-zinc-500">
              {copy.emptyBody}
            </p>
          : filtered.length === 0 ?
            <p className="px-5 py-10 text-center text-sm text-zinc-500">
              No stations match that search.
            </p>
          : <ul className="divide-y divide-zinc-100">
              {paginatedItems.map((row) => {
                const trial = isLiveTrialSubscription(row.subscription);
                return (
                  <li key={row.businessId} className="px-5 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {row.businessName || row.businessId}
                        </p>
                        {row.ownerEmail ?
                          <a
                            href={`mailto:${row.ownerEmail}`}
                            className="mt-0.5 block truncate text-sm text-[var(--primary)] underline-offset-2 hover:underline"
                          >
                            {row.ownerEmail}
                          </a>
                        : <p className="mt-0.5 text-sm text-zinc-500">No owner email</p>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        {trial ?
                          <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
                            {formatTrialDaysRemaining(row.subscription.expiresAt) ?? "Trial"}
                          </span>
                        : null}
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            row.opsBucket === "attention" ?
                              "bg-amber-50 text-amber-800"
                            : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {formatSubscriptionStatus(row.subscription.status)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {displaySubscriptionPlanName(row.subscription)} ·{" "}
                      {formatBillingCycleLabel(row.subscription.billingCycle)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Started {formatSubscriptionDate(trialStartedAt(row.subscription))} · Last
                      active {formatSubscriptionDate(row.lastActiveDay)}
                    </p>
                  </li>
                );
              })}
            </ul>
          }
        </div>
        {filtered.length > PLAN_SUBSCRIBERS_PAGE_SIZE ?
          <div className="shrink-0 border-t border-zinc-100 px-5 py-3">
            <ListPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        : null}
      </div>
    </div>,
    document.body,
  );
}
