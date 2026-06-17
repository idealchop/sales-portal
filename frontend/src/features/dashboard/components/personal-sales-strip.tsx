"use client";

import Link from "next/link";
import {
  Briefcase,
  CircleDollarSign,
  Percent,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { AnalyticsScope, PersonalSalesSummary } from "@/lib/dashboard/analytics";
import { formatPhp } from "@/lib/format";

const SCOPE_LABELS: Record<AnalyticsScope, string> = {
  platform: "Platform-wide CRM totals",
  team: "Your team’s pipeline",
  personal: "Your pipeline",
};

function StatTile({
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
    <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-white to-teal-50/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
          {hint ?
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
          : null}
        </div>
        <div className="rounded-lg bg-white p-2 text-teal-700 shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function PersonalSalesStrip({
  personalSales,
  analyticsScope,
}: {
  personalSales: PersonalSalesSummary;
  analyticsScope?: AnalyticsScope;
}) {
  const scope = analyticsScope ?? "personal";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your sales KPIs</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {SCOPE_LABELS[scope]}
          </p>
        </div>
        <Link
          href="/dashboard/proposals"
          className="text-sm font-medium text-teal-700 hover:underline"
        >
          Open proposals →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Pipeline value"
          value={formatPhp(personalSales.pipelineValue)}
          hint={`${personalSales.totalProposals} proposals · ${personalSales.totalClients} clients`}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatTile
          label="Win rate"
          value={`${personalSales.winRate}%`}
          hint={`${formatPhp(personalSales.acceptedValue)} accepted`}
          icon={<Percent className="h-4 w-4" />}
        />
        <StatTile
          label="Commissions MTD"
          value={formatPhp(personalSales.commissionsMtd)}
          hint={`${formatPhp(personalSales.pendingCommissions)} still pending`}
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <StatTile
          label="Needs action"
          value={String(
            personalSales.draftsNeedingAction + personalSales.sentAwaitingResponse,
          )}
          hint={`${personalSales.draftsNeedingAction} drafts · ${personalSales.sentAwaitingResponse} sent`}
          icon={<Target className="h-4 w-4" />}
        />
      </div>

      {(personalSales.draftsNeedingAction > 0 ||
        personalSales.sentAwaitingResponse > 0) && (
        <Card className="border-amber-100 bg-amber-50/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <p className="flex items-center gap-2 text-amber-900">
              <TrendingUp className="h-4 w-4" />
              Move deals forward — finish drafts or follow up on sent proposals.
            </p>
            <Link
              href="/dashboard/proposals"
              className="font-medium text-amber-800 underline"
            >
              Go to pipeline
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
