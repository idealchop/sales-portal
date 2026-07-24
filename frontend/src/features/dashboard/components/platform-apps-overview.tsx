"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildHubAppStats,
  groupHubStatsByApp,
} from "@/features/dashboard/lib/build-hub-app-stats";
import { buildAppPerformanceOverview } from "@/features/dashboard/lib/build-app-performance-overview";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import {
  DASHBOARD_APPS,
  type DashboardAppId,
} from "@/features/dashboard/config/dashboard-apps";
import { cn } from "@/lib/utils";

const APP_BADGE: Record<string, string> = {
  platform: "bg-sky-50 text-sky-800 border-sky-100",
  smartrefill: "bg-teal-50 text-teal-800 border-teal-100",
  "smartrefill-old": "bg-amber-50 text-amber-900 border-amber-100",
  "sales-portal": "bg-violet-50 text-violet-800 border-violet-100",
};

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground sm:text-xl">
        {value}
      </p>
      {hint ?
        <p className="mt-0.5 text-[11px] tabular-nums text-[var(--muted-foreground)]">
          {hint}
        </p>
      : null}
    </div>
  );
}

function AppOverviewCard({
  appId,
  stats,
  headline,
  detail,
}: {
  appId: DashboardAppId;
  stats: { label: string; value: string; hint?: string }[];
  headline: string;
  detail: string;
}) {
  const meta = DASHBOARD_APPS.find((app) => app.id === appId);
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                meta.accentClass,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">{meta.label}</CardTitle>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {headline}
              </p>
            </div>
          </div>
          <Badge className={APP_BADGE[appId] ?? APP_BADGE.platform}>Live</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {stats.length > 0 ?
          <div className="grid flex-1 auto-rows-fr gap-2 sm:grid-cols-2">
            {stats.map((stat) => (
              <StatTile
                key={`${appId}-${stat.label}`}
                label={stat.label}
                value={stat.value}
                hint={stat.hint}
              />
            ))}
          </div>
        : null}
        <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
          {detail}
        </p>
        <Link
          href={meta.href}
          className="text-xs font-semibold text-teal-700 hover:underline"
        >
          Open {meta.shortLabel} →
        </Link>
      </CardContent>
    </Card>
  );
}

/** Platform hub: rollup KPIs + simple per-app performance overview. */
export function PlatformAppsOverview({ data }: { data: DashboardAnalytics }) {
  const grouped = groupHubStatsByApp(buildHubAppStats(data));
  const platformStats = grouped.get("platform") ?? [];
  const overview = buildAppPerformanceOverview(data);
  const byId = new Map(overview.map((row) => [row.appId, row]));

  const cards: DashboardAppId[] = [
    "smartrefill",
    "sales-portal",
    "smartrefill-old",
  ];

  return (
    <div className="space-y-4">
      {platformStats.length > 0 ?
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Sales snapshot
                </CardTitle>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Cross-app view of revenue pressure and follow-ups.
                </p>
              </div>
              <Badge className={APP_BADGE.platform}>All apps</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            {platformStats.map((stat) => (
              <StatTile
                key={`platform-${stat.label}`}
                label={stat.label}
                value={stat.value}
                hint={stat.hint}
              />
            ))}
          </CardContent>
        </Card>
      : null}

      <div className="grid gap-3 lg:grid-cols-3">
        {cards.map((appId) => {
          const perf = byId.get(appId);
          const stats = (grouped.get(appId) ?? []).slice(0, 4);
          return (
            <AppOverviewCard
              key={appId}
              appId={appId}
              stats={stats}
              headline={perf?.headline ?? ""}
              detail={perf?.detail ?? ""}
            />
          );
        })}
      </div>
    </div>
  );
}
