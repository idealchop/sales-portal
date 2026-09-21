"use client";

import { Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ListPagination } from "@/components/list-pagination";
import type { UserSubscriptionListItem } from "@/features/dashboard/lib/build-user-subscriptions-list";
import { usePagination } from "@/hooks/use-pagination";
import { trialStartedAt } from "@/lib/admin/plan-subscriber-roster";
import {
  displaySubscriptionPlanName,
  formatSubscriptionDate,
  formatTrialDaysRemaining,
} from "@/lib/dashboard/subscription-labels";
import { cn } from "@/lib/utils";

const TRIAL_PAGE_SIZE = 10;

function daysTone(label: string | null): "ok" | "soon" | "muted" {
  if (!label) return "muted";
  if (label === "Last day of trial" || label === "1 day left") return "soon";
  const match = /^(\d+) days left$/.exec(label);
  if (match && Number(match[1]) <= 3) return "soon";
  return "ok";
}

export function TrialStationsPanel({
  stations,
  isLoading,
}: {
  stations: UserSubscriptionListItem[];
  isLoading: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return stations;
    return stations.filter((row) => {
      const haystack = [row.businessName, row.ownerEmail, row.businessId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, stations]);
  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } =
    usePagination(filtered, TRIAL_PAGE_SIZE, query);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Stations on trial now</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {isLoading && stations.length === 0 ?
              "Loading live trials…"
            : stations.length === 0 ?
              "No stations are on a free trial right now."
            : `${stations.length} station${stations.length === 1 ? "" : "s"} on trial. Soonest to expire first.`}
          </p>
        </div>
        {stations.length > 0 ?
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search station or email…"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
            />
          </div>
        : null}
      </div>

      {isLoading && stations.length === 0 ?
        <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading trials…
        </div>
      : stations.length === 0 ?
        <p className="px-6 py-12 text-center text-sm text-zinc-500">
          When a station signs up they will show up here with days left.
        </p>
      : filtered.length === 0 ?
        <p className="px-6 py-12 text-center text-sm text-zinc-500">
          No stations match that search.
        </p>
      : <>
          <ul className="divide-y divide-zinc-100 md:hidden">
            {paginatedItems.map((row) => {
              const daysLeft = formatTrialDaysRemaining(row.subscription.expiresAt);
              const tone = daysTone(daysLeft);
              return (
                <li key={row.businessId} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
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
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        tone === "soon" ?
                          "bg-amber-50 text-amber-800"
                        : tone === "ok" ?
                          "bg-sky-50 text-sky-800"
                        : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {daysLeft ?? "Days left unknown"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Trying {displaySubscriptionPlanName(row.subscription)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Started {formatSubscriptionDate(trialStartedAt(row.subscription))} · Last
                    active {formatSubscriptionDate(row.lastActiveDay)}
                  </p>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-20 border-b border-zinc-100 bg-zinc-50/90 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur">
                <tr>
                  <th className="px-5 py-3">Station</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Trying</th>
                  <th className="px-5 py-3">Started</th>
                  <th className="px-5 py-3">Last active</th>
                  <th className="px-5 py-3">Days left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedItems.map((row) => {
                  const daysLeft = formatTrialDaysRemaining(row.subscription.expiresAt);
                  const tone = daysTone(daysLeft);
                  return (
                    <tr key={row.businessId}>
                      <td className="px-5 py-3 font-medium text-foreground">
                        {row.businessName || row.businessId}
                      </td>
                      <td className="px-5 py-3">
                        {row.ownerEmail ?
                          <a
                            href={`mailto:${row.ownerEmail}`}
                            className="text-[var(--primary)] underline-offset-2 hover:underline"
                          >
                            {row.ownerEmail}
                          </a>
                        : <span className="text-zinc-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {displaySubscriptionPlanName(row.subscription)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-zinc-600">
                        {formatSubscriptionDate(trialStartedAt(row.subscription))}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-zinc-600">
                        {formatSubscriptionDate(row.lastActiveDay)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            tone === "soon" ?
                              "bg-amber-50 text-amber-800"
                            : tone === "ok" ?
                              "bg-sky-50 text-sky-800"
                            : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {daysLeft ?? "Unknown"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ?
            <div className="border-t border-zinc-100 px-5 py-3">
              <ListPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </div>
          : null}
        </>
      }
    </section>
  );
}
