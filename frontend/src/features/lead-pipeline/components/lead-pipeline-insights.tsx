"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HorizontalBarChart } from "@/components/charts/distribution-chart";
import { buildLeadPipelineInsights } from "@/features/lead-pipeline/lib/lead-pipeline-insights";
import { useLeadAssignees } from "@/hooks/use-lead-assignees";
import type { Lead, LeadAnalytics, LeadQueue } from "@/lib/definitions";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "#0d9488",
  "#14b8a6",
  "#2dd4bf",
  "#5eead4",
  "#99f6e4",
  "#115e59",
  "#0f766e",
  "#36a69f",
];

const QUEUE_STACK_COLORS = {
  Warm: "#0d9488",
  Cold: "#0284c7",
  Onboarded: "#059669",
  Archives: "#a1a1aa",
} as const;

const FOLLOW_UP_COLORS: Record<string, string> = {
  Overdue: "#dc2626",
  "Due in 7 days": "#d97706",
  "Scheduled later": "#0d9488",
  "No follow-up": "#a1a1aa",
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e4e4e7",
  fontSize: 12,
};

function EmptyChart({ message }: { message: string }) {
  return (
    <p className="flex h-[240px] items-center justify-center px-4 text-center text-sm text-zinc-500">
      {message}
    </p>
  );
}

function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn" | "danger" | "ok";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3",
        tone === "danger" && "border-red-200 bg-red-50/70",
        tone === "warn" && "border-amber-200 bg-amber-50/70",
        tone === "ok" && "border-teal-200 bg-teal-50/70",
        tone === "default" && "border-zinc-200 bg-white",
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "danger" && "text-red-800",
          tone === "warn" && "text-amber-900",
          tone === "ok" && "text-teal-900",
          tone === "default" && "text-zinc-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function QueueRadialChart({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  const rows = data
    .filter((row) => row.count > 0)
    .map((row, index) => ({
      ...row,
      fill:
        QUEUE_STACK_COLORS[row.name as keyof typeof QUEUE_STACK_COLORS] ??
        CHART_COLORS[index % CHART_COLORS.length],
    }));
  if (rows.length === 0) return <EmptyChart message="No queue data yet." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="18%"
        outerRadius="90%"
        data={rows}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar dataKey="count" background cornerRadius={6} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
        />
        <Tooltip contentStyle={tooltipStyle} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

function FunnelAreaChart({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  if (data.every((row) => row.count === 0)) {
    return <EmptyChart message="No stage data yet." />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="funnelFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={56} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          name="Cumulative"
          stroke="#0d9488"
          strokeWidth={2}
          fill="url(#funnelFill)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function FollowUpRadialChart({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  const rows = data
    .filter((row) => row.count > 0)
    .map((row) => ({
      ...row,
      fill: FOLLOW_UP_COLORS[row.name] ?? "#0d9488",
    }));
  if (rows.length === 0) return <EmptyChart message="No follow-up data yet." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadialBarChart
        cx="50%"
        cy="55%"
        innerRadius="22%"
        outerRadius="95%"
        data={rows}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar dataKey="count" background cornerRadius={8} />
        <Legend
          verticalAlign="bottom"
          height={40}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
        />
        <Tooltip contentStyle={tooltipStyle} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

function StatusTreemap({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  if (data.length === 0) return <EmptyChart message="No statuses yet." />;
  const treeData = data.map((row, index) => ({
    name: row.name,
    size: row.count,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <Treemap
        data={treeData}
        dataKey="size"
        nameKey="name"
        stroke="#fff"
        aspectRatio={4 / 3}
        content={<TreemapCell />}
      >
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, _name, item) => {
            const label =
              item && typeof item === "object" && "payload" in item ?
                String((item.payload as { name?: string }).name ?? "")
              : "";
            return [value as number, label || "Leads"];
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}

function TreemapCell(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
  depth?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", fill = "#0d9488", depth = 0 } =
    props;
  if (depth !== 1 || width < 2 || height < 2) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
      />
      {width > 48 && height > 28 ?
        <text
          x={x + 8}
          y={y + 18}
          fill="#fff"
          fontSize={11}
          fontWeight={600}
        >
          {name.length > 18 ? `${name.slice(0, 16)}…` : name}
        </text>
      : null}
    </g>
  );
}

function AttemptsStackedChart({
  data,
}: {
  data: Array<{
    band: string;
    warm_Warm: number;
    warm_Cold: number;
    warm_Onboarded: number;
    warm_Archives: number;
    cold_Warm: number;
    cold_Cold: number;
    cold_Onboarded: number;
    cold_Archives: number;
  }>;
}) {
  const queues = ["Warm", "Cold", "Onboarded", "Archives"] as const;
  const hasData = data.some((row) =>
    queues.some(
      (queue) =>
        row[`warm_${queue}`] > 0 || row[`cold_${queue}`] > 0,
    ),
  );
  if (!hasData) {
    return <EmptyChart message="No attempt data yet." />;
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
          <XAxis dataKey="band" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            shared
            formatter={(value, name) => {
              const label = String(name);
              const track =
                label.startsWith("warm_") ? "Warm track"
                : label.startsWith("cold_") ? "Cold track"
                : "";
              const queue = label.replace(/^warm_|^cold_/, "");
              return [value as number, track ? `${queue} · ${track}` : label];
            }}
          />
          {queues.map((queue, index) => (
            <Bar
              key={`warm_${queue}`}
              dataKey={`warm_${queue}`}
              stackId="warmTrack"
              name={`warm_${queue}`}
              fill={QUEUE_STACK_COLORS[queue]}
              radius={index === queues.length - 1 ? [3, 3, 0, 0] : 0}
              maxBarSize={36}
              activeBar={false}
              legendType="none"
            />
          ))}
          {queues.map((queue, index) => (
            <Bar
              key={`cold_${queue}`}
              dataKey={`cold_${queue}`}
              stackId="coldTrack"
              name={`cold_${queue}`}
              fill={QUEUE_STACK_COLORS[queue]}
              radius={index === queues.length - 1 ? [3, 3, 0, 0] : 0}
              maxBarSize={36}
              activeBar={false}
              legendType="none"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-zinc-500">
        <div className="flex flex-wrap items-center gap-3">
          {queues.map((queue) => (
            <span key={queue} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: QUEUE_STACK_COLORS[queue] }}
              />
              {queue}
            </span>
          ))}
        </div>
        <p>
          Paired bars: <span className="font-medium text-zinc-700">Warm track</span>{" "}
          (left) · <span className="font-medium text-zinc-700">Cold track</span>{" "}
          (right) · shared scale = % of archive limit (8 warm / 3 cold)
        </p>
      </div>
    </div>
  );
}

function QueueHealthRadar({
  data,
}: {
  data: Array<{
    queue: string;
    assignedPct: number;
    contactedPct: number;
    followUpPct: number;
    attemptLoad: number;
    fullMark: number;
  }>;
}) {
  if (data.every((row) => row.assignedPct + row.contactedPct + row.followUpPct === 0)) {
    return <EmptyChart message="No queue health data yet." />;
  }

  // Recharts radar wants one row per axis metric for multi-series comparison,
  // or one row per queue with metrics as series. Use metric-as-axis for clarity.
  const radarRows = [
    {
      metric: "Assigned %",
      Warm: data.find((r) => r.queue === "Warm")?.assignedPct ?? 0,
      Cold: data.find((r) => r.queue === "Cold")?.assignedPct ?? 0,
      Onboarded: data.find((r) => r.queue === "Onboarded")?.assignedPct ?? 0,
      Archives: data.find((r) => r.queue === "Archives")?.assignedPct ?? 0,
      fullMark: 100,
    },
    {
      metric: "Contacted %",
      Warm: data.find((r) => r.queue === "Warm")?.contactedPct ?? 0,
      Cold: data.find((r) => r.queue === "Cold")?.contactedPct ?? 0,
      Onboarded: data.find((r) => r.queue === "Onboarded")?.contactedPct ?? 0,
      Archives: data.find((r) => r.queue === "Archives")?.contactedPct ?? 0,
      fullMark: 100,
    },
    {
      metric: "Follow-up %",
      Warm: data.find((r) => r.queue === "Warm")?.followUpPct ?? 0,
      Cold: data.find((r) => r.queue === "Cold")?.followUpPct ?? 0,
      Onboarded: data.find((r) => r.queue === "Onboarded")?.followUpPct ?? 0,
      Archives: data.find((r) => r.queue === "Archives")?.followUpPct ?? 0,
      fullMark: 100,
    },
    {
      metric: "Attempt load",
      Warm: data.find((r) => r.queue === "Warm")?.attemptLoad ?? 0,
      Cold: data.find((r) => r.queue === "Cold")?.attemptLoad ?? 0,
      Onboarded: data.find((r) => r.queue === "Onboarded")?.attemptLoad ?? 0,
      Archives: data.find((r) => r.queue === "Archives")?.attemptLoad ?? 0,
      fullMark: 100,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={radarRows} cx="50%" cy="50%" outerRadius="68%">
        <PolarGrid stroke="#e4e4e7" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
        <Radar
          name="Warm"
          dataKey="Warm"
          stroke={QUEUE_STACK_COLORS.Warm}
          fill={QUEUE_STACK_COLORS.Warm}
          fillOpacity={0.18}
          strokeWidth={2}
        />
        <Radar
          name="Cold"
          dataKey="Cold"
          stroke={QUEUE_STACK_COLORS.Cold}
          fill={QUEUE_STACK_COLORS.Cold}
          fillOpacity={0.12}
          strokeWidth={2}
        />
        <Radar
          name="Onboarded"
          dataKey="Onboarded"
          stroke={QUEUE_STACK_COLORS.Onboarded}
          fill={QUEUE_STACK_COLORS.Onboarded}
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Radar
          name="Archives"
          dataKey="Archives"
          stroke={QUEUE_STACK_COLORS.Archives}
          fill={QUEUE_STACK_COLORS.Archives}
          fillOpacity={0.08}
          strokeWidth={2}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
        />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function PlatformSourceArea({
  platform,
  source,
}: {
  platform: Array<{ name: string; count: number }>;
  source: Array<{ name: string; count: number }>;
}) {
  const rows = source.slice(0, 8);
  if (rows.length === 0 && platform.length === 0) {
    return <EmptyChart message="No source attribution yet." />;
  }
  return (
    <div className="space-y-3">
      {platform.length > 0 ?
        <div className="flex flex-wrap gap-2">
          {platform.map((row, index) => (
            <span
              key={row.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              {row.name}
              <span className="font-semibold tabular-nums">{row.count}</span>
            </span>
          ))}
        </div>
      : null}
      {rows.length === 0 ?
        <EmptyChart message="No lead sources yet." />
      : <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
            <defs>
              <linearGradient id="sourceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#0284c7" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-22}
              textAnchor="end"
              height={52}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#0284c7"
              strokeWidth={2}
              fill="url(#sourceFill)"
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      }
    </div>
  );
}

export function LeadPipelineInsights({
  leads,
  queue,
  analytics,
}: {
  leads: Lead[];
  queue: LeadQueue;
  analytics: LeadAnalytics | null;
}) {
  const { members } = useLeadAssignees();
  const assigneeNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const member of members) {
      map[member.id] = member.displayName || member.email || member.id;
    }
    return map;
  }, [members]);

  const model = useMemo(
    () => buildLeadPipelineInsights(leads, { assigneeNames }),
    [leads, assigneeNames],
  );

  const scopeLabel =
    queue === "all" ? "All leads"
    : queue === "warm" ? "Warm leads"
    : queue === "cold" ? "Cold leads"
    : queue === "onboarded" ? "Onboarded"
    : "Archives";

  const trialRisk = (() => {
    const fromLeads = model.trialRisk;
    if (fromLeads.daysLeftZero > 0 || fromLeads.daysLeftLte3 > 0) {
      return fromLeads;
    }
    if (queue === "all" && analytics?.trialRisk) {
      return analytics.trialRisk;
    }
    return fromLeads;
  })();

  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-16 text-center text-sm text-zinc-500">
        No leads in {scopeLabel.toLowerCase()} yet. Gather leads or switch tabs.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Insights · {scopeLabel}
          </h2>
          <p className="text-sm text-zinc-500">
            Charts use the current tab. Switch to All for the full pipeline, or
            Warm / Cold / Onboarded / Archives to focus.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Leads" value={model.kpis.total} />
        <KpiCard
          label="Unassigned"
          value={model.kpis.unassigned}
          tone={model.kpis.unassigned > 0 ? "warn" : "default"}
        />
        <KpiCard
          label="Overdue follow-ups"
          value={model.kpis.overdueFollowUps}
          tone={model.kpis.overdueFollowUps > 0 ? "danger" : "ok"}
        />
        <KpiCard
          label="Never contacted"
          value={model.kpis.neverContacted}
          tone={model.kpis.neverContacted > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Attempts by queue
            </CardTitle>
            <p className="text-xs text-zinc-500">
              Warm and cold tracks stay separate (paired bars). All four tabs
              share one scale: % of that track&apos;s archive limit.
            </p>
          </CardHeader>
          <CardContent>
            <AttemptsStackedChart data={model.attemptsByQueue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Queue health</CardTitle>
            <p className="text-xs text-zinc-500">
              Assigned, contacted, follow-up coverage, and attempt load (0–100).
            </p>
          </CardHeader>
          <CardContent>
            <QueueHealthRadar data={model.queueHealthRadar} />
          </CardContent>
        </Card>

        {queue === "all" ?
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Queue mix</CardTitle>
            </CardHeader>
            <CardContent>
              <QueueRadialChart data={model.byQueue} />
            </CardContent>
          </Card>
        : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline accumulation</CardTitle>
            <p className="text-xs text-zinc-500">
              Cumulative lead counts across stages.
            </p>
          </CardHeader>
          <CardContent>
            <FunnelAreaChart data={model.funnelCumulative} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-up health</CardTitle>
          </CardHeader>
          <CardContent>
            <FollowUpRadialChart data={model.followUpHealth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact status map</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTreemap data={model.byStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform & sources</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformSourceArea
              platform={model.byPlatform}
              source={model.bySource}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignee load</CardTitle>
          </CardHeader>
          <CardContent>
            {model.byAssignee.length === 0 ?
              <EmptyChart message="No assignees yet." />
            : <HorizontalBarChart
                data={model.byAssignee.map((row) => ({
                  label: row.name,
                  count: row.count,
                  overdue: row.overdueFollowUps,
                }))}
                labelKey="label"
                valueKey="count"
              />
            }
            {model.byAssignee.some((row) => row.overdueFollowUps > 0) ?
              <p className="mt-2 text-xs text-amber-800">
                Overdue follow-ups:{" "}
                {model.byAssignee.reduce(
                  (sum, row) => sum + row.overdueFollowUps,
                  0,
                )}
              </p>
            : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channels used</CardTitle>
          </CardHeader>
          <CardContent>
            {model.byChannel.length === 0 ?
              <EmptyChart message="No channel tags yet." />
            : <QueueRadialChart data={model.byChannel} />
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demo outcome</CardTitle>
          </CardHeader>
          <CardContent>
            {model.byDemo.every((row) => row.count === 0) ?
              <EmptyChart message="No demo data yet." />
            : <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={model.byDemo}>
                  <defs>
                    <linearGradient id="demoFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#059669"
                    strokeWidth={2}
                    fill="url(#demoFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trial risk (linked)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-red-700">
                0 days left
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-red-800">
                {trialRisk.daysLeftZero}
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                ≤ 3 days left
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-amber-900">
                {trialRisk.daysLeftLte3}
              </p>
            </div>
            {analytics?.stallReasons?.length ?
              <div className="col-span-2 mt-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Top stall reasons
                </p>
                <ul className="space-y-1 text-sm text-zinc-700">
                  {analytics.stallReasons.slice(0, 5).map((row) => (
                    <li
                      key={row.name}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{row.name}</span>
                      <span className="tabular-nums text-zinc-500">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            : null}
            <div className="col-span-2">
              {model.accountReady.every((row) => row.count === 0) ?
                null
              : <div className="mt-1 flex gap-2">
                  {model.accountReady.map((row) => (
                    <div
                      key={row.name}
                      className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                        {row.name}
                      </p>
                      <p className="text-lg font-semibold tabular-nums text-zinc-900">
                        {row.count}
                      </p>
                    </div>
                  ))}
                </div>
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
