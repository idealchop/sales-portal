"use client";

import Link from "next/link";
import {
  Briefcase,
  CircleDollarSign,
  Percent,
  TrendingUp,
  Send,
} from "lucide-react";
import type { AnalyticsScope, PersonalSalesSummary } from "@/lib/dashboard/analytics";
import { formatPhp } from "@/lib/format";

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
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
          {hint ?
            <p className="mt-1 text-xs tabular-nums text-[var(--muted-foreground)]">{hint}</p>
          : null}
        </div>
        <div className="rounded-lg bg-white p-2 text-teal-700 shadow-sm">{icon}</div>
      </div>
    </div>
  );
}

export function PersonalSalesStrip({
  personalSales,
}: {
  personalSales: PersonalSalesSummary;
  analyticsScope?: AnalyticsScope;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          href="/dashboard/proposals"
          className="text-xs font-medium text-teal-700 hover:underline"
        >
          Proposals →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Pipeline"
          value={formatPhp(personalSales.pipelineValue)}
          hint={`${personalSales.totalProposals} · ${personalSales.totalClients} clients`}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatTile
          label="Win rate"
          value={`${personalSales.winRate}%`}
          hint={formatPhp(personalSales.acceptedValue)}
          icon={<Percent className="h-4 w-4" />}
        />
        <StatTile
          label="Closed won"
          value={formatPhp(personalSales.acceptedValue)}
          hint={`${personalSales.totalClients} clients`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatTile
          label="Commissions"
          value={formatPhp(personalSales.commissionsMtd)}
          hint={`${formatPhp(personalSales.pendingCommissions)} pending`}
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <StatTile
          label="Paid MTD"
          value={formatPhp(personalSales.paidCommissionsMtd)}
          hint={formatPhp(personalSales.pendingCommissions) + " open"}
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <StatTile
          label="Open actions"
          value={String(
            personalSales.draftsNeedingAction + personalSales.sentAwaitingResponse,
          )}
          hint={`${personalSales.draftsNeedingAction} drafts · ${personalSales.sentAwaitingResponse} sent`}
          icon={<Send className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
