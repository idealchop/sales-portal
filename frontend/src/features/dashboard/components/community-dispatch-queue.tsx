"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Radio, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  assignCommunityDispatchRequest,
  cancelCommunityDispatchRequest,
  fetchCommunityDispatchRequests,
  type CommunityDispatchRequestRow,
} from "@/features/dashboard/lib/community-dispatch-api";
import type { BusinessMapLocation } from "@/lib/dashboard/analytics";
import type { DashboardAnalyticsRefresh } from "@/hooks/use-dashboard-analytics";

const OPEN_STATUSES = new Set([
  "parsed",
  "needs_location",
  "routing",
  "offered",
  "no_stations",
  "expired",
]);

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function customerSummary(row: CommunityDispatchRequestRow): string {
  const parts: string[] = [];
  if (row.parsed?.name) parts.push(row.parsed.name);
  if (row.parsed?.qty) parts.push(`${row.parsed.qty} gal`);
  if (row.parsed?.delivery) parts.push("delivery");
  const location =
    row.geocode?.formattedAddress || row.parsed?.location || row.parsed?.number;
  if (location) parts.push(location);
  return parts.join(" · ") || row.referenceId;
}

export function CommunityDispatchQueue({
  communityStations,
  onRefresh,
}: {
  communityStations: BusinessMapLocation[];
  onRefresh?: DashboardAnalyticsRefresh;
}) {
  const [rows, setRows] = useState<CommunityDispatchRequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");

  const stationOptions = useMemo(
    () =>
      communityStations
        .filter((station) => station.communityDispatchEnabled)
        .map((station) => ({
          id: station.id,
          label: station.communityPublicName?.trim() || station.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [communityStations],
  );

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchCommunityDispatchRequests({ limit: 50 });
      setRows(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load dispatch queue.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    if (statusFilter === "open") {
      return rows.filter((row) => OPEN_STATUSES.has(row.status));
    }
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  async function handleCancel(requestId: string) {
    setBusyId(requestId);
    setError(null);
    try {
      await cancelCommunityDispatchRequest(requestId);
      await load();
      void onRefresh?.({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAssign(requestId: string) {
    if (!selectedBusinessId) return;
    setBusyId(requestId);
    setError(null);
    try {
      await assignCommunityDispatchRequest(requestId, selectedBusinessId);
      setAssignTarget(null);
      setSelectedBusinessId("");
      await load();
      void onRefresh?.({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4" />
              Community dispatch queue
            </CardTitle>
            <CardDescription>
              Messenger intake, offers, and manual routing
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="open">Open</option>
              <option value="offered">Offered</option>
              <option value="accepted">Accepted</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_stations">No stations</option>
              <option value="all">All</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              aria-label="Refresh queue"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        {error ?
          <p className="text-sm text-red-600">{error}</p>
        : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && rows.length === 0 ?
          <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
        : null}
        {!loading && filtered.length === 0 ?
          <p className="text-sm text-[var(--muted-foreground)]">
            No requests in this filter.
          </p>
        : null}
        {filtered.map((row) => {
          const isBusy = busyId === row.id;
          const canAct =
            row.status !== "accepted" &&
            row.status !== "cancelled" &&
            !row.smartrefillSubmissionId;

          return (
            <div
              key={row.id}
              className="rounded-lg border border-[var(--border)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {row.referenceId}
                    </p>
                    <Badge>{statusLabel(row.status)}</Badge>
                    {typeof row.searchRadiusKm === "number" ?
                      <Badge className="border-teal-200 bg-teal-50 text-teal-800">
                        {row.searchRadiusKm} km
                      </Badge>
                    : null}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {customerSummary(row)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatWhen(row.createdAt)}
                    {row.routingNotes ? ` · ${row.routingNotes}` : ""}
                  </p>
                </div>
                {canAct ?
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => {
                        setAssignTarget(row.id);
                        setSelectedBusinessId(stationOptions[0]?.id ?? "");
                      }}
                    >
                      Assign
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      disabled={isBusy}
                      onClick={() => void handleCancel(row.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                : null}
              </div>

              {assignTarget === row.id ?
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3">
                  <div className="min-w-[200px] flex-1">
                    <select
                      className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
                      value={selectedBusinessId}
                      onChange={(event) => setSelectedBusinessId(event.target.value)}
                    >
                      {stationOptions.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy || !selectedBusinessId}
                    onClick={() => void handleAssign(row.id)}
                  >
                    Send offer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setAssignTarget(null)}
                  >
                    Close
                  </Button>
                </div>
              : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
