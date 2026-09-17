"use client";

import {
  CheckCircle2,
  Layers,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import {
  MetricHelpButton,
  type MetricHelpContent,
} from "@/features/dashboard/components/metric-help-button";
import {
  computeSetupCompletion,
  computeUserRetention,
  SETUP_COMPLETE_MIN_STEPS,
} from "@/features/dashboard/lib/product-signals";

const PRODUCT_SIGNAL_HELP: Record<string, MetricHelpContent> = {
  setup: {
    title: "Setup",
    summary:
      "Share of workspaces that finished enough first-run setup to be useful — not the old onboardingComplete wizard flag.",
    how: `Workspaces with ${SETUP_COMPLETE_MIN_STEPS}+ getting-started steps done ÷ all workspaces × 100. Steps include add customer, inventory, delivery, walk-in, expense, collection, AI, payment account, and verify email.`,
  },
  customers: {
    title: "Customers / ws",
    summary:
      "Average customer roster size per workspace — how big a typical station’s book is.",
    how: "Total customers across all workspaces ÷ number of workspaces (rounded).",
  },
  sessions: {
    title: "Sessions / user",
    summary:
      "How often active users open the app in the last 30 days.",
    how: "Login sessions in the last 30 days ÷ users who logged in at least once in that window (rounded).",
  },
  retention: {
    title: "User retention",
    summary:
      "Share of all SmartRefill users who came back and logged in during the last 30 days.",
    how: "Users with ≥1 login in the last 30 days ÷ all SmartRefill users × 100.",
  },
};

function KpiTile({
  label,
  value,
  hint,
  icon,
  help,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  help: MetricHelpContent;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              {label}
            </p>
            <MetricHelpButton content={help} />
          </div>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{value}</p>
          {hint ?
            <p className="mt-0.5 text-[11px] tabular-nums text-[var(--muted-foreground)]">{hint}</p>
          : null}
        </div>
        <div className="rounded-md bg-sky-50 p-1.5 text-sky-700">{icon}</div>
      </div>
    </div>
  );
}

export function ProductSignalsStrip({ data }: { data: DashboardAnalytics }) {
  const { summary, chartBusinessContext } = data;
  const setup = computeSetupCompletion(chartBusinessContext ?? []);
  const retention = computeUserRetention(summary);
  const avgCustomersPerWs =
    summary.totalBusinesses > 0 ?
      Math.round(summary.totalCustomers / summary.totalBusinesses)
    : 0;
  const sessionsPerActiveUser =
    summary.activeLoginUsers > 0 ?
      Math.round(summary.loginSessionsLast30Days / summary.activeLoginUsers)
    : 0;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        label="Setup"
        value={`${setup.percent}%`}
        hint={`${SETUP_COMPLETE_MIN_STEPS}+ steps · ${setup.completed}/${setup.total} ws`}
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        help={PRODUCT_SIGNAL_HELP.setup}
      />
      <KpiTile
        label="Customers / ws"
        value={avgCustomersPerWs.toLocaleString()}
        hint={`${summary.totalCustomers.toLocaleString()} total`}
        icon={<UsersRound className="h-3.5 w-3.5" />}
        help={PRODUCT_SIGNAL_HELP.customers}
      />
      <KpiTile
        label="Sessions / user"
        value={sessionsPerActiveUser.toLocaleString()}
        hint="30d active users"
        icon={<Layers className="h-3.5 w-3.5" />}
        help={PRODUCT_SIGNAL_HELP.sessions}
      />
      <KpiTile
        label="User retention"
        value={`${retention.percent}%`}
        hint={`${retention.activeUsers.toLocaleString()} / ${retention.totalUsers.toLocaleString()} users · 30d`}
        icon={<RefreshCw className="h-3.5 w-3.5" />}
        help={PRODUCT_SIGNAL_HELP.retention}
      />
    </div>
  );
}
