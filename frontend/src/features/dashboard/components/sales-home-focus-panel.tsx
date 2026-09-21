"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import { SalesHomeStationList } from "@/features/dashboard/components/sales-home-station-list";
import type { SalesHomeStationRow } from "@/features/dashboard/lib/build-sales-home-focus";
import { buildSalesHomeFocusChart } from "@/features/dashboard/lib/build-sales-home-focus-chart";
import type { ReactNode } from "react";

const BAR_COLORS = ["#0f766e", "#0d9488", "#14b8a6", "#5eead4"];
const BAND_COLORS: Record<string, string> = {
  Low: "#b45309",
  Mid: "#ca8a04",
  High: "#0f766e",
};

export function SalesHomeFocusPanel({
  id,
  title,
  description,
  rows,
  emptyMessage,
  busyId,
  action,
  onEmail,
}: {
  id: string;
  title: string;
  description: string;
  rows: SalesHomeStationRow[];
  emptyMessage: string;
  busyId?: string | null;
  action?: ReactNode;
  onEmail?: (row: SalesHomeStationRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const chart = useMemo(() => buildSalesHomeFocusChart(rows), [rows]);

  return (
    <DashboardSection
      id={id}
      title={title}
      description={description}
      count={rows.length}
      action={action}
    >
      {rows.length === 0 ?
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-8 text-center text-sm text-zinc-500">
          {emptyMessage}
        </p>
      : <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.8fr)]">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Stations by gap
              </p>
              <div className="mt-2 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chart.byIntent}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={96}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${String(value)} stations`,
                        "Count",
                      ]}
                      labelFormatter={(label, payload) => {
                        const avg = Number(payload?.[0]?.payload?.avgChance ?? 0);
                        return `${label} · ${avg}% avg chance`;
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {chart.byIntent.map((row, index) => (
                        <Cell
                          key={row.intent}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Chance mix · avg {chart.avgChance}%
              </p>
              <div className="mt-3 space-y-2">
                {chart.byChanceBand.map((row) => {
                  const share =
                    chart.total > 0 ?
                      Math.round((row.count / chart.total) * 100)
                    : 0;
                  return (
                    <div key={row.band}>
                      <div className="flex items-center justify-between text-xs text-zinc-600">
                        <span>{row.band}</span>
                        <span className="tabular-nums">
                          {row.count} · {share}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${share}%`,
                            backgroundColor: BAND_COLORS[row.band],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 px-4 py-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-expanded={expanded}
              aria-controls={`${id}-station-list`}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ?
                <ChevronUp className="mr-1 h-3.5 w-3.5" />
              : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
              {expanded ?
                "Hide stations"
              : `Show ${rows.length} station${rows.length === 1 ? "" : "s"}`}
            </Button>
          </div>

          {expanded ?
            <div
              id={`${id}-station-list`}
              className="border-t border-zinc-100 p-4"
            >
              <SalesHomeStationList
                rows={rows}
                emptyMessage={emptyMessage}
                busyId={busyId}
                onEmail={onEmail}
              />
            </div>
          : null}
        </div>
      }
    </DashboardSection>
  );
}
