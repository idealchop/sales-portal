"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SalesHomeStationRow } from "@/features/dashboard/lib/build-sales-home-focus";
import { cn } from "@/lib/utils";

function chanceTone(percent: number): {
  text: string;
  rail: string;
} {
  if (percent >= 50) {
    return { text: "text-teal-800", rail: "bg-teal-50" };
  }
  if (percent >= 30) {
    return { text: "text-amber-800", rail: "bg-amber-50" };
  }
  return { text: "text-red-800", rail: "bg-red-50" };
}

function chanceVerb(kind: SalesHomeStationRow["chance"]["kind"]): string {
  if (kind === "onboard") return "Onboard";
  if (kind === "return") return "Come back";
  return "Continue";
}

function displayWhatIf(text: string): string {
  const trimmed = text.replace(/^if nobody acts\s*[—:\-]\s*/i, "").replace(/^if\s+/i, "");
  if (!trimmed) return text;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function GapBar({
  nowLevel,
  shouldLevel,
}: {
  nowLevel: number;
  shouldLevel: number;
}) {
  const nowPct = Math.max(8, Math.min(100, (nowLevel / 4) * 100));
  const shouldPct = Math.max(8, Math.min(100, (shouldLevel / 4) * 100));
  return (
    <div
      className="relative mt-2 h-1.5 rounded-full bg-zinc-100"
      aria-label={`Now ${nowLevel} of 4, should be ${shouldLevel} of 4`}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-zinc-400"
        style={{ width: `${nowPct}%` }}
      />
      <span
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-600 ring-2 ring-white"
        style={{ left: `${shouldPct}%` }}
      />
    </div>
  );
}

export function SalesHomeStationList({
  rows,
  emptyMessage,
  busyId,
  onEmail,
}: {
  rows: SalesHomeStationRow[];
  emptyMessage: string;
  busyId?: string | null;
  onEmail?: (row: SalesHomeStationRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const busy = busyId === row.id || Boolean(row.leadId && busyId === row.leadId);
        const mailto =
          !row.hasLead && row.email ?
            `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(`Checking in — ${row.businessName}`)}`
          : null;
        const route = row.links[0];
        const tone = chanceTone(row.chance.percent);
        return (
          <li
            key={row.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
          >
            <div className="flex flex-col sm:flex-row">
              <div
                className={cn(
                  "flex items-baseline justify-between gap-3 px-4 py-3 sm:w-40 sm:shrink-0 sm:flex-col sm:items-start sm:justify-center sm:px-5 sm:py-5",
                  tone.rail,
                )}
              >
                <p
                  className={cn(
                    "text-3xl font-medium tabular-nums leading-none",
                    tone.text,
                  )}
                >
                  {row.chance.percent}%
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                  {chanceVerb(row.chance.kind)}
                </p>
              </div>

              <div className="min-w-0 flex-1 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900">
                    {row.businessName}
                  </p>
                  {row.assignedToYou ?
                    <Badge className="bg-teal-50 text-teal-800">Yours</Badge>
                  : null}
                  <Badge className="bg-zinc-100 text-zinc-600">
                    {row.stageLabel}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Now
                    </p>
                    <p className="mt-1 text-sm text-zinc-900">{row.now}</p>
                  </div>
                  <div className="rounded-xl bg-teal-50/80 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-teal-800">
                      Should be
                    </p>
                    <p className="mt-1 text-sm text-zinc-900">{row.shouldBe}</p>
                  </div>
                </div>
                <GapBar nowLevel={row.nowLevel} shouldLevel={row.shouldLevel} />

                <dl className="mt-4 grid gap-1 text-xs text-zinc-600">
                  <div className="grid gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                    <dt className="text-zinc-400">If nobody acts</dt>
                    <dd>{displayWhatIf(row.whatIf)}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                    <dt className="text-zinc-400">Why this chance</dt>
                    <dd>{row.chance.why}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {row.hasLead && row.email && onEmail ?
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => onEmail(row)}
                    >
                      <Mail className="mr-1 h-3.5 w-3.5" />
                      Email
                    </Button>
                  : null}
                  {mailto ?
                    <a
                      href={mailto}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-dark)]"
                    >
                      <Mail className="mr-1 h-3.5 w-3.5" />
                      Email
                    </a>
                  : null}
                  {route ?
                    <Link
                      href={route.href}
                      className="text-xs font-medium text-teal-700 hover:underline"
                    >
                      {route.label} →
                    </Link>
                  : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
