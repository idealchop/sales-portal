"use client";

import {
  CheckCircle2,
  Circle,
  Droplets,
  Flag,
  Layers3,
  MessageSquareQuote,
  Settings2,
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

function KeyValueGrid({ rows }: { rows: { label: string; value: string }[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-5 text-sm text-zinc-500">
        No UI configuration saved yet.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-lg bg-white px-3.5 py-2.5 ring-1 ring-zinc-200/70"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {row.label}
          </p>
          <p className="mt-1 text-sm text-zinc-900">{row.value}</p>
        </div>
      ))}
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

export function BusinessWorkspaceOnboardingFields({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const gettingStarted = parseGettingStartedProgress(data);
  const quickTour = parseQuickTourProgress(data);
  const uiConfigRows = parseUiConfigRows(data);

  return (
    <div className="space-y-5">
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

      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100/80 text-zinc-500">
            <Settings2 className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-900">UI config</p>
            <p className="text-xs text-zinc-500">
              Client-persisted workspace UI flags
            </p>
          </div>
        </div>
        <KeyValueGrid rows={uiConfigRows} />
      </div>
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
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-1.5 h-8 w-0.5 shrink-0 rounded-full bg-teal-500/70" />
        <div>
          <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900">
            User feedback
          </h4>
          <p className="mt-1 text-sm text-zinc-500">
            Latest platform feedback snapshot for this workspace
          </p>
        </div>
      </div>

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
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-1.5 h-8 w-0.5 shrink-0 rounded-full bg-teal-500/70" />
        <div>
          <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900">
            Catalog
          </h4>
          <p className="mt-1 text-sm text-zinc-500">
            Workspace lookup data configured during onboarding
          </p>
        </div>
      </div>

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
