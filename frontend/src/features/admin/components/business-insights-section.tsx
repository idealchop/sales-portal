"use client";

import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
  computeBusinessInsights,
  consumptionMeterState,
} from "@/lib/admin/business-insights-display";
import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-1.5 h-8 w-0.5 shrink-0 rounded-full bg-teal-500/70" />
      <div>
        <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900">
          {title}
        </h4>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ConsumptionRow({
  label,
  used,
  cap,
  suffix,
}: {
  label: string;
  used: number;
  cap: number;
  suffix?: string;
}) {
  const { percent, isBlocked, isNearLimit, clampedUsed } = consumptionMeterState(
    used,
    cap,
  );

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        isBlocked ?
          "border-red-200 bg-red-50/60"
        : isNearLimit ?
          "border-amber-200 bg-amber-50/60"
        : "border-zinc-200 bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
          {label}
        </p>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums text-zinc-900",
            isBlocked && "text-red-700",
          )}
        >
          {clampedUsed}/{cap}
          {suffix ?
            <span className="font-medium text-zinc-500"> {suffix}</span>
          : null}
        </span>
      </div>
      <div className="mt-2">
        <Progress value={percent} />
      </div>
    </div>
  );
}

export function BusinessInsightsSection({
  documents,
  transactions,
  transactionsLoading,
}: {
  documents: BusinessFirestoreDocumentRow[];
  transactions: UserFirestoreDocumentRow[];
  transactionsLoading?: boolean;
}) {
  const insights = useMemo(
    () => computeBusinessInsights({ documents, transactions }),
    [documents, transactions],
  );

  const hasConsumption = insights.consumption.length > 0;

  return (
    <section>
      <SectionHeader
        title="Insight section"
        description="Workspace activity, trends, and subscription consumption"
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {insights.stats.map((stat) => (
          <StatCard key={stat.id} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Transaction activity"
          description="Daily records over the last 14 days"
        >
          {transactionsLoading ?
            <div className="flex h-[200px] items-center justify-center text-sm text-zinc-500">
              Loading transactions…
            </div>
          : <ResponsiveContainer width="100%" height={200}>
              <LineChart data={insights.transactionDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Transactions"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0d9488" }}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard
          title="AI & support activity"
          description="Daily AI tool runs and chat sessions"
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={insights.engagementDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="aiRuns"
                name="AI runs"
                fill="#0d9488"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="chatSessions"
                name="Chat sessions"
                fill="#64748b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Subscription consumption
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {insights.planLabel}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            How much of the current plan limits this workspace has used
          </p>
        </div>

        {hasConsumption ?
          <div className="grid gap-3 lg:grid-cols-2">
            {insights.consumption.map((row) => (
              <ConsumptionRow
                key={row.id}
                label={row.label}
                used={row.used}
                cap={row.cap ?? 0}
                suffix={row.suffix}
              />
            ))}
          </div>
        : <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200/70">
            This plan has unlimited usage on the tracked limits, or no metered
            caps are configured.
          </p>
        }
      </div>
    </section>
  );
}
