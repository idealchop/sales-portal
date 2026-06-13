"use client";

import { useState } from "react";
import {
  Activity,
  Building2,
  CreditCard,
  MonitorSmartphone,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DashboardMetric,
  DashboardMetricVariant,
} from "@/lib/dashboard/analytics";
import { MetricBreakdownDialog } from "@/features/dashboard/components/metric-breakdown-dialog";

const VARIANT_STYLES: Record<
  DashboardMetricVariant,
  {
    icon: typeof Users;
    accent: string;
    chip: string;
    ring: string;
  }
> = {
  users: {
    icon: Users,
    accent: "text-sky-700",
    chip: "bg-sky-50 text-sky-800",
    ring: "hover:ring-sky-200",
  },
  devices: {
    icon: MonitorSmartphone,
    accent: "text-violet-700",
    chip: "bg-violet-50 text-violet-800",
    ring: "hover:ring-violet-200",
  },
  workspaces: {
    icon: Building2,
    accent: "text-teal-700",
    chip: "bg-teal-50 text-teal-800",
    ring: "hover:ring-teal-200",
  },
  engagement: {
    icon: Activity,
    accent: "text-amber-700",
    chip: "bg-amber-50 text-amber-800",
    ring: "hover:ring-amber-200",
  },
  payment: {
    icon: CreditCard,
    accent: "text-rose-700",
    chip: "bg-rose-50 text-rose-800",
    ring: "hover:ring-rose-200",
  },
  upsell: {
    icon: TrendingUp,
    accent: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-800",
    ring: "hover:ring-emerald-200",
  },
  reengagement: {
    icon: RefreshCw,
    accent: "text-orange-700",
    chip: "bg-orange-50 text-orange-800",
    ring: "hover:ring-orange-200",
  },
  pipeline: {
    icon: Sparkles,
    accent: "text-indigo-700",
    chip: "bg-indigo-50 text-indigo-800",
    ring: "hover:ring-indigo-200",
  },
};

function inferVariant(metric: DashboardMetric): DashboardMetricVariant {
  if (metric.variant) return metric.variant;

  const fallback: Record<string, DashboardMetricVariant> = {
    users: "users",
    "device-browser": "devices",
    "owner-conversion-pipeline": "workspaces",
    "team-expansion-upside": "engagement",
    "revenue-churn-risk": "payment",
    "growth-opportunities": "upsell",
    "behavioral-re-engagement": "reengagement",
    "ai-sales-priority": "pipeline",
    "workspace-expansion": "workspaces",
    "product-engagement": "engagement",
    "payment-recovery": "payment",
    "plan-upsell": "upsell",
    "re-engagement": "reengagement",
    "new-logo-pipeline": "pipeline",
  };

  return fallback[metric.id] ?? "users";
}

function MetricCard({
  metric,
  onOpenBreakdown,
}: {
  metric: DashboardMetric;
  onOpenBreakdown: (metric: DashboardMetric) => void;
}) {
  const variant = inferVariant(metric);
  const style = VARIANT_STYLES[variant];
  const Icon = style.icon;
  const highlights = metric.highlights ?? [];

  return (
    <Card
      className={cn(
        "flex flex-col border-[var(--border)] transition hover:shadow-md hover:ring-2",
        style.ring,
      )}
    >
      <button
        type="button"
        onClick={() => onOpenBreakdown(metric)}
        className="flex h-full w-full flex-col text-left"
      >
        <CardHeader className="flex flex-1 flex-col gap-3 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                style.chip,
              )}
            >
              <Icon className={cn("h-5 w-5", style.accent)} />
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Details
            </span>
          </div>

          <div>
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              {metric.title}
            </CardTitle>
            <p className={cn("mt-1 text-3xl font-bold tracking-tight", style.accent)}>
              {metric.value}
            </p>
            <CardDescription className="mt-1 text-xs leading-relaxed">
              {metric.subtitle}
            </CardDescription>
          </div>

          {highlights.length > 0 && (
            <div className="mt-auto grid gap-2 pt-1">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-2.5 py-2 text-xs"
                >
                  <span className="text-[var(--muted-foreground)]">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs font-medium text-[var(--primary)]">
            View breakdown
          </p>
        </CardHeader>
      </button>
    </Card>
  );
}

export function MetricCardsGrid({
  title,
  description,
  metrics,
}: {
  title: string;
  description: string;
  metrics: DashboardMetric[];
}) {
  const [activeMetric, setActiveMetric] = useState<DashboardMetric | null>(null);

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              onOpenBreakdown={setActiveMetric}
            />
          ))}
        </div>
      </div>

      <MetricBreakdownDialog
        metric={activeMetric}
        onClose={() => setActiveMetric(null)}
      />
    </>
  );
}
