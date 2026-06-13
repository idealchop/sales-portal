"use client";

import {
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

const COLORS = [
  "#36a69f",
  "#2d8f89",
  "#3ab7b1",
  "#5eead4",
  "#0d9488",
  "#14b8a6",
  "#99f6e4",
  "#115e59",
];

export function PlanPieChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">
        No active subscription data yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={56}
          outerRadius={92}
          paddingAngle={2}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarChart({
  data,
  labelKey,
  valueKey,
}: {
  data: Record<string, string | number>[];
  labelKey: string;
  valueKey: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey={labelKey}
          tick={{ fontSize: 12 }}
          width={88}
        />
        <Tooltip />
        <Bar dataKey={valueKey} fill="var(--primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
