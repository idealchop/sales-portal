"use client";

import {
  CheckCircle2,
  Layers,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";

function KpiTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {label}
          </p>
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

const FEATURE_LABELS: Record<string, string> = {
  addCustomer: "Add customer",
  addInventory: "Inventory",
  addDelivery: "Delivery",
  useAi: "AI",
};

function featureLabel(feature: string) {
  return FEATURE_LABELS[feature] ?? feature.replace(/([A-Z])/g, " $1").trim();
}

export function ProductSignalsStrip({ data }: { data: DashboardAnalytics }) {
  const { summary, featureAdoption } = data;
  const onboardingPct =
    summary.totalBusinesses > 0 ?
      Math.round((summary.onboardedBusinesses / summary.totalBusinesses) * 100)
    : 0;
  const avgCustomersPerWs =
    summary.totalBusinesses > 0 ?
      Math.round(summary.totalCustomers / summary.totalBusinesses)
    : 0;
  const sessionsPerActiveUser =
    summary.activeLoginUsers > 0 ?
      Math.round(summary.loginSessionsLast30Days / summary.activeLoginUsers)
    : 0;
  const topFeature = featureAdoption[0];

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        label="Onboarding"
        value={`${onboardingPct}%`}
        hint={`${summary.onboardedBusinesses}/${summary.totalBusinesses} ws`}
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Customers / ws"
        value={avgCustomersPerWs.toLocaleString()}
        hint={`${summary.totalCustomers.toLocaleString()} total`}
        icon={<UsersRound className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Sessions / user"
        value={sessionsPerActiveUser.toLocaleString()}
        hint="30d active users"
        icon={<Layers className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Top feature"
        value={topFeature ? `${topFeature.rate}%` : "—"}
        hint={
          topFeature ?
            `${featureLabel(topFeature.feature)} · ${topFeature.completed}/${topFeature.total}`
          : "No adoption data"
        }
        icon={<Sparkles className="h-3.5 w-3.5" />}
      />
    </div>
  );
}
