"use client";

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
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { DASHBOARD_APPS, FUTURE_DASHBOARD_APPS } from "@/features/dashboard/config/dashboard-apps";

const APP_BADGE: Record<string, string> = {
  platform: "bg-sky-50 text-sky-800 border-sky-100",
  smartrefill: "bg-teal-50 text-teal-800 border-teal-100",
  "sales-portal": "bg-violet-50 text-violet-800 border-violet-100",
  "future-app": "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground sm:text-xl">{value}</p>
      {hint ?
        <p className="mt-0.5 text-[11px] tabular-nums text-[var(--muted-foreground)]">{hint}</p>
      : null}
    </div>
  );
}

function AppKpiCard({
  appId,
  label,
  badge,
  stats,
}: {
  appId: string;
  label: string;
  badge: string;
  stats: { label: string; value: string; hint?: string }[];
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          <Badge className={APP_BADGE[appId] ?? APP_BADGE["future-app"]}>{badge}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid flex-1 auto-rows-fr gap-2 sm:grid-cols-2">
        {stats.map((stat) => (
          <StatTile
            key={`${appId}-${stat.label}`}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function HubAppStatsSection({ data }: { data: DashboardAnalytics }) {
  const grouped = groupHubStatsByApp(buildHubAppStats(data));
  const platformStats = grouped.get("platform") ?? [];
  const smartrefillStats = grouped.get("smartrefill") ?? [];
  const salesPortalStats = grouped.get("sales-portal") ?? [];
  const futureStats = grouped.get("future-app") ?? [];

  const smartrefillMeta = DASHBOARD_APPS.find((app) => app.id === "smartrefill");
  const salesPortalMeta = DASHBOARD_APPS.find((app) => app.id === "sales-portal");
  const futureMeta = FUTURE_DASHBOARD_APPS[0];

  return (
    <div className="space-y-3">
      {platformStats.length > 0 ?
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Platform rollup</CardTitle>
              <Badge className={APP_BADGE.platform}>Rollup</Badge>
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

      <div className="grid gap-3 md:grid-cols-2">
        <AppKpiCard
          appId="smartrefill"
          label={smartrefillMeta?.label ?? "SmartRefill"}
          badge="Live"
          stats={smartrefillStats}
        />
        <AppKpiCard
          appId="sales-portal"
          label={salesPortalMeta?.label ?? "Sales Portal"}
          badge="Live"
          stats={salesPortalStats}
        />
      </div>

      {futureStats.length > 0 ?
        <div className="grid gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {futureMeta?.label ?? "Future apps"}
            </p>
            <Badge className={APP_BADGE["future-app"]}>Soon</Badge>
          </div>
          {futureStats.map((stat) => (
            <StatTile
              key={`future-${stat.label}`}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
            />
          ))}
        </div>
      : null}
    </div>
  );
}
