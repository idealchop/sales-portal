"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPricePesos } from "../lib/events-training-api";
import type {
  AnalyticsContentRank,
  EventsTrainingAnalyticsSummary,
} from "../lib/events-training-types";
import { cn } from "@/lib/utils";

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #e4e4e7",
  fontSize: 12,
};

const PIE_COLORS = ["#0f766e", "#14b8a6", "#5eead4", "#99f6e4", "#115e59", "#f59e0b"];

function formatShortDate(isoDay: string): string {
  const date = new Date(`${isoDay}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return isoDay;
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-zinc-50/80 px-3.5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function BreakdownList({
  rows,
}: {
  rows: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">{row.label}</span>
            <span className="tabular-nums text-muted-foreground">{row.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-teal-600"
              style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RankingList({
  rows,
  unit,
  empty,
}: {
  rows: AnalyticsContentRank[];
  unit: string;
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ol className="space-y-3">
      {rows.map((row, index) => (
        <li key={row.key} className="min-w-0">
          <div className="mb-1 flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold tabular-nums text-zinc-600">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {row.label}
                </p>
                <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {row.count.toLocaleString()} {unit}
                </p>
              </div>
              {row.category ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {row.category}
                </p>
              ) : null}
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-teal-600"
                  style={{
                    width: `${Math.max(6, (row.count / max) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EventsTrainingAnalyticsPanel({
  data,
  loading,
}: {
  data: EventsTrainingAnalyticsSummary | null;
  loading?: boolean;
}) {
  if (loading || !data) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  }

  const registrationsDaily = (data.series?.registrationsDaily ?? []).map(
    (row) => ({
      ...row,
      label: formatShortDate(row.date),
    }),
  );
  const revenueDaily = (data.series?.revenueDaily ?? []).map((row) => ({
    ...row,
    label: formatShortDate(row.date),
    revenue: row.revenueCents / 100,
  }));
  const registrationStatus = data.breakdowns?.registrationStatus ?? [];
  const webinarStatus = data.breakdowns?.webinarStatus ?? [];
  const videoStatus = data.breakdowns?.videoStatus ?? [];
  const videoCategories = data.videos.byCategory ?? [];
  const rankings = data.rankings;
  const topViews = rankings?.topVideosByViews ?? [];
  const topComments = rankings?.topVideosByComments ?? [];
  const topPurchases = rankings?.topVideosByPurchases ?? [];
  const topWebinarRegs = rankings?.topWebinarsByRegistrations ?? [];

  const hasRegistrationTrend = registrationsDaily.some((row) => row.total > 0);
  const hasRevenueTrend = revenueDaily.some((row) => row.count > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Registrations"
          value={data.webinars.registrations}
          hint={`${data.webinars.pending} pending · ${data.webinars.accepted} accepted`}
        />
        <Metric
          label="Video views"
          value={data.videos.totalViews}
          hint={`${data.videos.totalComments} comments · ${data.videos.totalQuestions} questions`}
        />
        <Metric
          label="Revenue"
          value={formatPricePesos(data.revenue.revenueCents)}
          hint={`${data.revenue.paidPurchaseCount} paid unlocks`}
        />
        <Metric
          label="Catalog"
          value={`${data.webinars.published} / ${data.videos.published}`}
          hint="Published webinars / videos"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Most viewed content"
          subtitle="All-time views by story, recording, or tutorial"
        >
          <RankingList
            rows={topViews}
            unit="views"
            empty="No video views recorded yet."
          />
        </ChartCard>

        <ChartCard
          title="Registrations by webinar"
          subtitle={`Sign-ups in the last ${data.periodDays} days`}
        >
          <RankingList
            rows={topWebinarRegs}
            unit="regs"
            empty="No webinar registrations in this period."
          />
        </ChartCard>

        <ChartCard
          title="Most commented"
          subtitle="Videos with the most comments"
        >
          <RankingList
            rows={topComments}
            unit="comments"
            empty="No comments yet."
          />
        </ChartCard>

        <ChartCard
          title="Top unlocking content"
          subtitle="Paid unlocks by content"
        >
          <RankingList
            rows={topPurchases}
            unit="unlocks"
            empty="No paid unlocks yet."
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Registrations over time"
          subtitle={`Daily sign-ups in the last ${data.periodDays} days`}
        >
          {!hasRegistrationTrend ? (
            <EmptyChart message="No registrations in this period." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={registrationsDaily}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="etRegFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e4e4e7"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#0f766e"
                  strokeWidth={2}
                  fill="url(#etRegFill)"
                />
                <Area
                  type="monotone"
                  dataKey="accepted"
                  name="Accepted"
                  stroke="#14b8a6"
                  strokeWidth={1.5}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Revenue over time"
          subtitle={`Paid unlocks in the last ${data.periodDays} days`}
        >
          {!hasRevenueTrend ? (
            <EmptyChart message="No paid unlocks in this period." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={revenueDaily}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e4e4e7"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  width={36}
                  tickFormatter={(value) => `₱${value}`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [
                    formatPricePesos(Math.round(Number(value) * 100)),
                    "Revenue",
                  ]}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Registration status"
          subtitle={`Last ${data.periodDays} days`}
        >
          {registrationStatus.length === 0 ? (
            <EmptyChart message="No registrations to break down." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={registrationStatus}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {registrationStatus.map((row, index) => (
                      <Cell
                        key={row.key}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <BreakdownList rows={registrationStatus} />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Webinar catalog" subtitle="Current status mix">
          <BreakdownList rows={webinarStatus} />
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
              <dt className="text-muted-foreground">Published</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {data.webinars.published}
              </dd>
            </div>
            <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {data.webinars.completed ?? 0}
              </dd>
            </div>
            <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
              <dt className="text-muted-foreground">Draft</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {data.webinars.draft ?? 0}
              </dd>
            </div>
            <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {data.webinars.total}
              </dd>
            </div>
          </dl>
        </ChartCard>

        <ChartCard title="Video status" subtitle="Stories, recordings, tutorials">
          <BreakdownList rows={videoStatus} />
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-foreground">Categories</p>
            <BreakdownList rows={videoCategories} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Schedules: {data.engagement.enabledSchedules} enabled of{" "}
            {data.engagement.scheduleCount} total.
          </p>
        </ChartCard>
      </div>
    </div>
  );
}
