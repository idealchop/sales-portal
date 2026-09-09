"use client";

import { ChevronDown, ImageIcon, Settings2, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { SmartRefillConfigPanel } from "@/features/dashboard/components/smartrefill-config-panel";
import {
  groupUiConfigRows,
  parseUiConfigRows,
  type KeyValueRow,
} from "@/lib/admin/business-workspace-config-display";
import { cn } from "@/lib/utils";

function ConfigCollapsibleSection({
  id,
  title,
  description,
  count,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  count?: number;
  icon: typeof Settings2;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-zinc-50/80"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-zinc-900">{title}</span>
            {typeof count === "number" ?
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">
                {count}
              </span>
            : null}
          </span>
          <span className="mt-0.5 block text-sm text-zinc-500">
            {description}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ?
        <div
          id={`${id}-panel`}
          role="region"
          aria-labelledby={`${id}-trigger`}
          className="border-t border-zinc-100 px-4 py-4 sm:px-5"
        >
          {children}
        </div>
      : null}
    </section>
  );
}

function UiConfigListTable({ rows }: { rows: KeyValueRow[] }) {
  const groups = useMemo(() => groupUiConfigRows(rows), [rows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-zinc-300" />
        <p className="mt-3 text-sm font-medium text-zinc-800">
          No UI configuration saved yet
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Client-persisted flags will appear here once the station saves prefs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.id}>
          <div className="mb-2 px-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {group.label}
            </p>
            <p className="text-xs text-zinc-400">{group.description}</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3 border-b border-zinc-200 bg-zinc-100/90 px-4 py-2.5 sm:grid">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                Flag
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                Value
              </p>
            </div>
            <ul>
              {group.rows.map((row) => (
                <li
                  key={row.key}
                  className="grid gap-1 border-b border-zinc-100 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:items-center sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      {row.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                      {row.key}
                    </p>
                  </div>
                  <p className="break-words text-sm text-zinc-700">{row.value}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BusinessConfigPanel({
  rootData,
}: {
  rootData: Record<string, unknown> | null;
}) {
  const uiConfigRows = useMemo(
    () => (rootData ? parseUiConfigRows(rootData) : []),
    [rootData],
  );

  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(["workspace-ui"]),
  );

  function toggle(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Config
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          Workspace UI flags and SmartRefill app settings · expand a section to
          browse
        </p>
      </div>

      {rootData ?
        <ConfigCollapsibleSection
          id="workspace-ui"
          title="Workspace UI config"
          description="Client-persisted flags for this station"
          count={uiConfigRows.length}
          icon={Settings2}
          open={openIds.has("workspace-ui")}
          onToggle={() => toggle("workspace-ui")}
        >
          <UiConfigListTable rows={uiConfigRows} />
        </ConfigCollapsibleSection>
      : <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
          Workspace root document is not loaded yet.
        </div>
      }

      <ConfigCollapsibleSection
        id="smartrefill-app"
        title="SmartRefill app config"
        description="Global product icons and subscription catalog links"
        icon={ImageIcon}
        open={openIds.has("smartrefill-app")}
        onToggle={() => toggle("smartrefill-app")}
      >
        <SmartRefillConfigPanel />
      </ConfigCollapsibleSection>
    </div>
  );
}
