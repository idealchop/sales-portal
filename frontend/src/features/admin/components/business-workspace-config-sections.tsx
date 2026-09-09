"use client";

import {
  CheckCircle2,
  Circle,
  Droplets,
  Flag,
  Layers3,
  MessageSquareQuote,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  parseCatalogSection,
  parseGettingStartedProgress,
  parseQuickTourProgress,
  parseUiConfigRows,
  groupUiConfigRows,
  parseUserFeedback,
  type CatalogEntry,
  type ChecklistItem,
} from "@/lib/admin/business-workspace-config-display";
import { cn } from "@/lib/utils";

function ProgressChecklist({
  title,
  done,
  total,
  items,
}: {
  title: string;
  done: number;
  total: number;
  items: ChecklistItem[];
}) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {done} of {total} complete
          </p>
        </div>
        <Badge className="border-zinc-200 bg-zinc-50 font-medium text-zinc-700">
          {percent}%
        </Badge>
      </div>
      <div className="mt-3">
        <Progress value={percent} />
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item.key}
            className={cn(
              "flex items-center gap-2 text-sm",
              item.done ? "text-zinc-800" : "text-zinc-500",
            )}
          >
            {item.done ?
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            : <Circle className="h-4 w-4 shrink-0 text-zinc-300" />}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CatalogGroup({
  icon: Icon,
  title,
  items,
  emptyLabel,
}: {
  icon: LucideIcon;
  title: string;
  items: CatalogEntry[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100/80 text-zinc-500">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-500">
            {items.length > 0 ?
              `${items.length} configured`
            : emptyLabel}
          </p>
        </div>
      </div>
      {items.length > 0 ?
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge
              key={item.key}
              className="border-zinc-200 bg-zinc-50 font-normal text-zinc-700"
            >
              {item.label}
            </Badge>
          ))}
        </div>
      : <p className="text-sm text-zinc-500">{emptyLabel}</p>}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3.5 py-2.5 ring-1 ring-zinc-200/70">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-zinc-900">{value}</p>
    </div>
  );
}

export function BusinessWorkspaceOnboardingProgress({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const gettingStarted = parseGettingStartedProgress(data);
  const quickTour = parseQuickTourProgress(data);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProgressChecklist
        title="Getting started"
        done={gettingStarted.done}
        total={gettingStarted.total}
        items={gettingStarted.items}
      />
      <ProgressChecklist
        title="Quick tour"
        done={quickTour.done}
        total={quickTour.total}
        items={quickTour.items}
      />
    </div>
  );
}

export function BusinessWorkspaceUiConfig({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const uiConfigRows = parseUiConfigRows(data);
  const groups = groupUiConfigRows(uiConfigRows);

  if (uiConfigRows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-5 text-sm text-zinc-500">
        No UI configuration saved yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.id}>
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {group.label}
            </p>
            <p className="text-xs text-zinc-400">{group.description}</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {group.rows.map((row) => (
              <div
                key={row.key}
                className="grid gap-1 border-b border-zinc-100 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:items-center sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{row.label}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                    {row.key}
                  </p>
                </div>
                <p className="break-words text-sm text-zinc-700">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BusinessWorkspaceOnboardingFields({
  data,
}: {
  data: Record<string, unknown>;
}) {
  return (
    <div className="space-y-5">
      <BusinessWorkspaceOnboardingProgress data={data} />
      <BusinessWorkspaceUiConfig data={data} />
    </div>
  );
}

export function BusinessUserFeedbackSection({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const feedback = parseUserFeedback(data);

  return (
    <section>
      {feedback.hasFeedback ?
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <MessageSquareQuote className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoField label="Rating" value={feedback.ratingLabel} />
                <InfoField label="Would recommend" value={feedback.recommendLabel} />
                <InfoField label="Submitted" value={feedback.submittedAtLabel} />
              </div>
              <div className="mt-4 grid gap-3">
                <InfoField label="Feedback" value={feedback.feedback} />
                <InfoField
                  label="Next update suggestion"
                  value={feedback.suggestion}
                />
              </div>
            </div>
          </div>
        </div>
      : <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-800">
            No feedback submitted yet
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Owner feedback will appear here after it is saved on the business record.
          </p>
        </div>
      }
    </section>
  );
}

export function BusinessCatalogSection({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const catalog = parseCatalogSection(data);

  return (
    <section>
      <div className="grid gap-4 lg:grid-cols-2">
        <CatalogGroup
          icon={Droplets}
          title="Water types"
          items={catalog.waterTypes}
          emptyLabel="No water types configured"
        />
        <CatalogGroup
          icon={Wallet}
          title="Expense categories"
          items={catalog.expenseCategories}
          emptyLabel="No expense categories configured"
        />
        <CatalogGroup
          icon={Layers3}
          title="Inventory categories"
          items={catalog.inventoryCategories}
          emptyLabel="No inventory categories configured"
        />
        <CatalogGroup
          icon={Flag}
          title="Usage goals"
          items={catalog.usageGoals}
          emptyLabel="No usage goals selected"
        />
      </div>
    </section>
  );
}
