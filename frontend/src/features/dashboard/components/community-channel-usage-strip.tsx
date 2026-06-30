"use client";

import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CommunityChannelUsageBilling } from "@/lib/dashboard/analytics";

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

function formatPeriodLabel(periodKey: string): string {
  const [year, month] = periodKey.split("-");
  if (!year || !month) return periodKey;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function CommunityChannelUsageStrip({
  usage,
}: {
  usage: CommunityChannelUsageBilling;
}) {
  const intakeToAcceptRatio =
    usage.platformMessengerIntake > 0 ?
      `${Math.round((usage.stationAcceptsTotal / usage.platformMessengerIntake) * 1000) / 10}%`
    : "—";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Community channel usage (billing)
        </CardTitle>
        <CardDescription>
          Platform intake vs station accepts — {formatPeriodLabel(usage.periodKey)}{" "}
          (Manila)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell
            label="Messenger intake"
            value={String(usage.platformMessengerIntake)}
            detail="platform/channel_usage"
          />
          <MetricCell
            label="Station accepts"
            value={String(usage.stationAcceptsTotal)}
            detail={`${usage.stationsReportingAccepts} stations reporting`}
          />
          <MetricCell
            label="Accept / intake"
            value={intakeToAcceptRatio}
            detail="COGS conversion proxy"
          />
          <MetricCell
            label="Community enrolled"
            value={String(usage.communityEnrolledStations)}
            detail={
              usage.platformWhatsappIntake > 0 ?
                `WhatsApp intake: ${usage.platformWhatsappIntake}`
              : "Scale+ stations on map"
            }
          />
        </div>

        {usage.topStationsByAccepts.length > 0 ?
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Top stations by accepts (channelUsage)
            </p>
            <ul className="space-y-1 text-sm">
              {usage.topStationsByAccepts.map((station) => (
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
