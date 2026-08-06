"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpCircle,
  Briefcase,
  FileText,
} from "lucide-react";
import { SalesInsightsPanel } from "@/features/dashboard/components/sales-insights-panel";
import { PipelineStageStrip } from "@/features/dashboard/components/pipeline-stage-strip";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  DashboardAnalyticsShell,
  type DashboardViewContext,
} from "@/features/dashboard/components/dashboard-analytics-shell";
import { formatPhp } from "@/lib/format";

function FocusTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={
        tone === "warn" ?
          "rounded-xl border border-amber-200 bg-amber-50/60 p-4"
        : "rounded-xl border border-[var(--border)] bg-white p-4"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {hint ?
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
          : null}
        </div>
        <div
          className={
            tone === "warn" ?
              "rounded-lg bg-white p-2 text-amber-700 shadow-sm"
            : "rounded-lg bg-teal-50 p-2 text-teal-700"
          }
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SalesPortalDashboardContent({ data }: DashboardViewContext) {
  const personal = data.personalSales;
  const insights = data.salesInsights;
  const highPriority = insights.salesActions.filter(
    (action) => action.priority === "high",
  ).length;
  const needsAttention =
    (personal?.draftsNeedingAction ?? 0) +
    (personal?.sentAwaitingResponse ?? 0);

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-base font-semibold text-foreground">Sales · now</h1>
        <p className="text-xs text-[var(--muted-foreground)]">
          Who to contact and what is blocking deals. Rules-based — no Gemini on
          this page.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FocusTile
          label="Follow-ups"
          value={insights.salesActions.length.toLocaleString()}
          hint={
            highPriority > 0 ?
              `${highPriority} high priority`
            : `${insights.atRiskWorkspaces} at-risk stations`
          }
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={highPriority > 0 || insights.salesActions.length > 0 ? "warn" : "default"}
        />
        <FocusTile
          label="Open pipeline"
          value={formatPhp(personal?.pipelineValue ?? data.proposalPipeline.pipelineValue)}
          hint={`${personal?.totalProposals ?? data.proposalPipeline.totalProposals} proposals`}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <FocusTile
          label="Needs attention"
          value={needsAttention.toLocaleString()}
          hint="Drafts + sent awaiting reply"
          icon={<FileText className="h-4 w-4" />}
          tone={needsAttention > 0 ? "warn" : "default"}
        />
        <FocusTile
          label="Upsell ready"
          value={insights.upgradeOpportunities.toLocaleString()}
          hint={`${formatPhp(insights.estimatedMrr)} est. MRR`}
          icon={<ArrowUpCircle className="h-4 w-4" />}
        />
      </div>

      <DashboardSection
        id="sales-do-next"
        title="Do these next"
        description="Priority account follow-ups for this period."
        count={insights.salesActions.length}
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/proposals"
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Proposals →
            </Link>
            <Link
              href="/dashboard/commissions"
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Commissions →
            </Link>
          </div>
        }
      >
        <SalesInsightsPanel
          salesInsights={insights}
          proposalPipeline={data.proposalPipeline}
          embedded
          actionsOnly
        />
      </DashboardSection>

      <DashboardSection
        id="sales-pipeline-stages"
        title="Proposal stages"
        description="Where deals sit right now."
      >
        <PipelineStageStrip proposalPipeline={data.proposalPipeline} />
      </DashboardSection>
    </>
  );
}

export function SalesPortalDashboard() {
  return (
    <DashboardAnalyticsShell>
      {(ctx) => <SalesPortalDashboardContent {...ctx} />}
    </DashboardAnalyticsShell>
  );
}
