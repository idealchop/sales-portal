"use client";

import { Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import {
  TrialStationEditDialog,
  type TrialPlanOption,
} from "@/features/admin/components/trial-station-edit-dialog";
import { SMARTREFILL_TRIAL_APP_LABEL } from "@/features/admin/lib/trial-station-edit";
import {
  filterAndSortTrialStations,
  trialPlanFilterOptions,
  TRIAL_STATION_SORT_OPTIONS,
  type TrialStationSort,
  type TrialUrgencyFilter,
} from "@/features/admin/lib/trial-station-list";
import { ApiError } from "@/lib/api-client";
import { updateTrialStation } from "@/features/admin/lib/update-trial-station";
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
  canEdit = false,
  planOptions = [],
  onUpdated,
}: {
  stations: UserSubscriptionListItem[];
  isLoading: boolean;
  canEdit?: boolean;
  planOptions?: TrialPlanOption[];
  onUpdated?: (result: {
    businessId: string;
    subscriptionId: string;
    planCode: string;
    planName: string;
    expiresAt: string;
    billingCycle?: string;
    price?: number;
  }) => void;
}) {
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState<TrialUrgencyFilter>("all");
  const [sort, setSort] = useState<TrialStationSort>("expires-asc");
  const [editing, setEditing] = useState<UserSubscriptionListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const planChoices = useMemo(() => trialPlanFilterOptions(stations), [stations]);
  const filtered = useMemo(
    () =>
      filterAndSortTrialStations(stations, {
        query,
        plan: planFilter,
        urgency: urgencyFilter,
        sort,
      }),
    [planFilter, query, sort, stations, urgencyFilter],
  );
  const filtersActive = query.trim().length > 0 || planFilter !== "all" || urgencyFilter !== "all";
  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } =
    usePagination(filtered, TRIAL_PAGE_SIZE, `${query}|${planFilter}|${urgencyFilter}|${sort}`);

  async function handleSave(input: { planCode: string; expiresAt: string; note: string }) {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await updateTrialStation({
        businessId: editing.businessId,
        subscriptionId: editing.subscription.id,
        planCode: input.planCode,
        expiresAt: input.expiresAt,
        note: input.note,
      });
      onUpdated?.({
        businessId: editing.businessId,
        subscriptionId: editing.subscription.id,
        planCode: result.planCode,
        planName: result.planName,
        expiresAt: result.expiresAt,
        billingCycle: result.billingCycle,
        price: result.price,
      });
      setEditing(null);
    } catch (error) {
      setSaveError(
        error instanceof ApiError ? error.message : "Could not update this trial.",
      );
    } finally {
      setSaving(false);
    }
  }

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
            : filtersActive ?
              `${filtered.length} of ${stations.length} stations`
            : `${stations.length} station${stations.length === 1 ? "" : "s"} on trial.`}
          </p>
        </div>
      </div>
      {stations.length > 0 ?
        <div className="flex flex-col gap-2 border-b border-zinc-100 px-5 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search station or email…"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
            />
          </div>
          <select
            aria-label="Filter by plan"
            value={planFilter}
            onChange={(event) => setPlanFilter(event.target.value)}
            className="h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
          >
            <option value="all">All plans</option>
            {planChoices.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by days left"
            value={urgencyFilter}
            onChange={(event) => setUrgencyFilter(event.target.value as TrialUrgencyFilter)}
            className="h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
          >
            <option value="all">All days left</option>
            <option value="ending">Ending in 3 days</option>
            <option value="later">More than 3 days</option>
          </select>
          <select
            aria-label="Sort stations"
            value={sort}
            onChange={(event) => setSort(event.target.value as TrialStationSort)}
            className="h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
          >
            {TRIAL_STATION_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      : null}

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
          No stations match those filters.
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
                    {SMARTREFILL_TRIAL_APP_LABEL} · Trying{" "}
                    {displaySubscriptionPlanName(row.subscription)}
                  </p>
                  {canEdit ?
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 px-2 text-xs"
                      onClick={() => {
                        setSaveError(null);
                        setEditing(row);
                      }}
                    >
                      Overwrite
                    </Button>
                  : null}
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
                  <th className="px-5 py-3">App</th>
                  <th className="px-5 py-3">Trial</th>
                  {canEdit ? <th className="px-5 py-3 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedItems.map((row) => {
                  const daysLeft = formatTrialDaysRemaining(row.subscription.expiresAt);
                  const tone = daysTone(daysLeft);
                  return (
                    <tr key={row.businessId}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">
                          {row.businessName || row.businessId}
                        </p>
                        {row.ownerEmail ?
                          <a
                            href={`mailto:${row.ownerEmail}`}
                            className="mt-0.5 block text-xs text-[var(--primary)] underline-offset-2 hover:underline"
                          >
                            {row.ownerEmail}
                          </a>
                        : <p className="mt-0.5 text-xs text-zinc-400">No owner email</p>}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{SMARTREFILL_TRIAL_APP_LABEL}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Trying {displaySubscriptionPlanName(row.subscription)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                            tone === "soon" ?
                              "bg-amber-50 text-amber-800"
                            : tone === "ok" ?
                              "bg-sky-50 text-sky-800"
                            : "bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {daysLeft ?? "Unknown"}
                        </span>
                        <p className="mt-1 text-xs text-zinc-500">
                          Started {formatSubscriptionDate(trialStartedAt(row.subscription))}
                          {" · "}
                          Last active {formatSubscriptionDate(row.lastActiveDay)}
                        </p>
                      </td>
                      {canEdit ?
                        <td className="px-5 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-2 text-xs"
                            onClick={() => {
                              setSaveError(null);
                              setEditing(row);
                            }}
                          >
                            Overwrite
                          </Button>
                        </td>
                      : null}
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
      {editing ?
        <TrialStationEditDialog
          station={editing}
          planOptions={planOptions}
          saving={saving}
          error={saveError}
          onClose={() => {
            if (!saving) setEditing(null);
          }}
          onSave={(input) => void handleSave(input)}
        />
      : null}
    </section>
  );
}
