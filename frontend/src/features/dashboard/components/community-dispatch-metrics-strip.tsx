"use client";

import { MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CommunityDispatchMetrics } from "@/lib/dashboard/analytics";

function MetricCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-zinc-50/60 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {detail ?
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{detail}</p>
      : null}
    </div>
  );
}

export function CommunityDispatchMetricsStrip({
  metrics,
}: {
  metrics: CommunityDispatchMetrics;
}) {
  const acceptRate =
    metrics.acceptRatePercent === null ?
      "—"
    : `${metrics.acceptRatePercent}%`;
  const avgAccept =
    metrics.avgAcceptMinutes === null ?
      "—"
    : `${metrics.avgAcceptMinutes} min`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Community Messenger (30d)
        </CardTitle>
        <CardDescription>
          Intake, acceptance, and station performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell
            label="Intake today"
            value={String(metrics.intakeToday)}
            detail={`${metrics.intakeLast7Days} in last 7 days`}
          />
          <MetricCell
            label="Open requests"
            value={String(metrics.openCount)}
          />
          <MetricCell
            label="Accept rate"
            value={acceptRate}
            detail={`${metrics.acceptedCount} accepted`}
          />
          <MetricCell
            label="Avg time to accept"
            value={avgAccept}
            detail={`${metrics.escalatedCount} radius escalations`}
          />
        </div>

        {metrics.topStations.length > 0 ?
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Top accepting stations
            </p>
            <ul className="space-y-1 text-sm">
              {metrics.topStations.map((station) => (
                <li
                  key={station.businessId}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-zinc-50"
                >
                  <span className="truncate text-foreground">
                    {station.businessName}
                  </span>
                  <span className="shrink-0 text-[var(--muted-foreground)]">
                    {station.accepts} accepts
                  </span>
                </li>
              ))}
            </ul>
          </div>
        : null}
      </CardContent>
    </Card>
  );
}
