"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPhp } from "@/lib/format";

const PIE_COLORS = [
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#6366f1",
];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e4e4e7",
  fontSize: 12,
};

/** Owner acquisition momentum — area shows volume building over time. */
export function OwnerSignupAreaChart({
  data,
}: {
  data: { month?: string; date?: string; count: number }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No owner signup data in this period." />;
  }

  const xKey = data[0]?.month ? "month" : "date";

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ownerSignupFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          name="Owners"
          stroke="#0284c7"
          strokeWidth={2}
          fill="url(#ownerSignupFill)"
          dot={{ r: 3, fill: "#0284c7" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Workspace pipeline trend — line highlights change over time. */
export function WorkspaceLineChart({
  data,
}: {
  data: { month?: string; date?: string; count: number }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No workspace data in this period." />;
  }

  const xKey = data[0]?.month ? "month" : "date";

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="count"
          name="Workspaces"
          stroke="#14b8a6"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#14b8a6", strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Daily engagement — area + line compares sessions vs unique users. */
export function LoginEngagementChart({
  data,
}: {
  data: { date: string; sessions: number; uniqueUsers: number }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No login activity in this period." />;
  }

  const chartData = data.map((row) => ({
    ...row,
    label: row.date.length > 5 ? row.date.slice(5) : row.date,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sessionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
        <YAxis
          yAxisId="right"
          orientation="right"
          allowDecimals={false}
          tick={{ fontSize: 10 }}
          width={28}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="sessions"
          name="Sessions"
          stroke="#7c3aed"
          fill="url(#sessionFill)"
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="uniqueUsers"
          name="Users"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Station GMV + transaction count — bars for revenue, line for volume. */
export function TransactionMixedChart({
  data,
}: {
  data: { month?: string; date?: string; count: number; amount: number }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No transactions in this period." />;
  }

  const xKey = data[0]?.month ? "month" : "date";

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis
          yAxisId="amount"
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `₱${Math.round(Number(v) / 1000)}k`}
          width={44}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          allowDecimals={false}
          tick={{ fontSize: 10 }}
          width={28}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) =>
            name === "GMV" ?
              [formatPhp(Number(value)), "GMV"]
            : [Number(value).toLocaleString(), "Transactions"]
          }
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar
          yAxisId="amount"
          dataKey="amount"
          name="GMV"
          fill="#0d9488"
          radius={[4, 4, 0, 0]}
          barSize={22}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="count"
          name="Transactions"
          stroke="#eab308"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#eab308" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** MRR mix — donut shows share of revenue by plan. */
export function MrrDonutChart({
  data,
}: {
  data: {
    name: string;
    mrr: number;
    count: number;
    color?: string;
    isPotential?: boolean;
  }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No paid plans yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="mrr"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={
                entry.color ?? PIE_COLORS[index % PIE_COLORS.length]
              }
              stroke={entry.isPotential ? "#D97706" : undefined}
              strokeDasharray={entry.isPotential ? "4 3" : undefined}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, _name, item) => {
            const payload = item?.payload as {
              name: string;
              count: number;
              isPotential?: boolean;
            };
            const suffix =
              payload?.isPotential ? " approx. upside" : " MRR";
            return [
              formatPhp(Number(value)),
              `${payload?.name ?? "Plan"} · ${payload?.count ?? 0} ws${suffix}`,
            ];
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Product adoption shape — radar compares setup steps at a glance. */
export function FeatureRadarChart({
  data,
}: {
  data: { feature: string; rate: number }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No adoption data yet." />;
  }

  const radarData = data.map((row) => ({
    feature: row.feature.length > 14 ? `${row.feature.slice(0, 12)}…` : row.feature,
    rate: row.rate,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="#e4e4e7" />
        <PolarAngleAxis dataKey="feature" tick={{ fontSize: 9 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
        <Radar
          name="Adoption %"
          dataKey="rate"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.35}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value}%`, "Adoption"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <p className="flex h-[220px] items-center justify-center px-4 text-center text-sm text-[var(--muted-foreground)]">
      {message}
    </p>
  );
}

/** Workspace health distribution — pie chart by tier. */
export function HealthPieChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const filtered = data.filter((row) => row.count > 0);
  if (filtered.length === 0) {
    return <ChartEmpty message="No workspace health data." />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={82}
          paddingAngle={2}
        >
          {filtered.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Payment status — radial bar chart. */
export function PaymentRadialChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const filtered = data.filter((row) => row.count > 0);
  if (filtered.length === 0) {
    return <ChartEmpty message="No payment status data." />;
  }

  const chartData = filtered.map((row, index) => ({
    ...row,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="20%"
        outerRadius="90%"
        data={chartData}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar dataKey="count" background cornerRadius={6} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

/** Device sessions — horizontal bar. */
export function DeviceMixChart({
  data,
}: {
  data: { name: string; sessions: number }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No device data in this period." />;
  }

  const chartData = data.slice(0, 6);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10 }}
          width={72}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="sessions" name="Sessions" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Browser sessions — horizontal bar. */
export function BrowserMixChart({
  data,
}: {
  data: { name: string; sessions: number }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No browser data in this period." />;
  }

  const chartData = data.slice(0, 6);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10 }}
          width={72}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="sessions" name="Sessions" fill="#0d9488" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Usage goals selected by workspaces. */
export function UsageGoalsChart({
  data,
}: {
  data: { goal: string; count: number }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No usage goals recorded." />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis
          dataKey="goal"
          tick={{ fontSize: 9 }}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Workspaces" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Proposal pipeline by status. */
export function ProposalPipelineChart({
  data,
}: {
  data: { status: string; count: number; value: number }[];
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No proposals yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis
          dataKey="status"
          tick={{ fontSize: 9 }}
          angle={-25}
          textAnchor="end"
          height={44}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) =>
            name === "Value" ?
              [formatPhp(Number(value)), "Value"]
            : [Number(value).toLocaleString(), "Count"]
          }
        />
        <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="count" name="Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="value" name="Value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
