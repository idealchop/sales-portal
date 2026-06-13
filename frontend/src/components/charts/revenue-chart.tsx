"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Revenue } from "@/lib/definitions";
import { formatPhp } from "@/lib/format";

export function RevenueChart({ data }: { data: Revenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
        />
        <Tooltip formatter={(value) => [formatPhp(Number(value)), "Revenue"]} />
        <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
