"use client";

import { FileCheck, FileClock, FileText, Send } from "lucide-react";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import { formatPhp } from "@/lib/format";

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
        <div className="rounded-md bg-violet-50 p-1.5 text-violet-700">{icon}</div>
      </div>
    </div>
  );
}

function stageCount(
  pipeline: DashboardAnalytics["proposalPipeline"],
  status: string,
) {
  return pipeline.byStatus.find((row) => row.status === status)?.count ?? 0;
}

function stageValue(
  pipeline: DashboardAnalytics["proposalPipeline"],
  status: string,
) {
  return pipeline.byStatus.find((row) => row.status === status)?.value ?? 0;
}

export function PipelineStageStrip({
  proposalPipeline,
}: {
  proposalPipeline: DashboardAnalytics["proposalPipeline"];
}) {
  const drafts = stageCount(proposalPipeline, "draft");
  const sent = stageCount(proposalPipeline, "sent");
  const accepted = stageCount(proposalPipeline, "accepted");
  const declined = stageCount(proposalPipeline, "declined");

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        label="Drafts"
        value={drafts.toLocaleString()}
        hint={formatPhp(stageValue(proposalPipeline, "draft"))}
        icon={<FileText className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Sent"
        value={sent.toLocaleString()}
        hint={formatPhp(stageValue(proposalPipeline, "sent"))}
        icon={<Send className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Accepted"
        value={accepted.toLocaleString()}
        hint={formatPhp(proposalPipeline.acceptedValue)}
        icon={<FileCheck className="h-3.5 w-3.5" />}
      />
      <KpiTile
        label="Declined"
        value={declined.toLocaleString()}
        hint={`${proposalPipeline.winRate}% win rate`}
        icon={<FileClock className="h-3.5 w-3.5" />}
      />
    </div>
  );
}
