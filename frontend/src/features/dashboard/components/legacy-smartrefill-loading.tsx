"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const LOAD_STAGES = [
  { at: 0, label: "Connecting to prod-smartrefill…" },
  { at: 18, label: "Reading station profiles…" },
  { at: 42, label: "Scanning deliveries & customers…" },
  { at: 68, label: "Building triage queue…" },
  { at: 88, label: "Almost ready…" },
] as const;

function stageLabel(progress: number): string {
  let label: string = LOAD_STAGES[0].label;
  for (const stage of LOAD_STAGES) {
    if (progress >= stage.at) label = stage.label;
  }
  return label;
}

/**
 * Indeterminate-but-advancing progress for the cold legacy analytics fetch
 * (typically 10–15s). Caps under 95% until the parent finishes loading.
 */
export function LegacySmartRefillLoading({
  className,
}: {
  className?: string;
}) {
  const [progress, setProgress] = useState(6);

  useEffect(() => {
    const started = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - started;
      // Ease toward ~92% over ~14s, then crawl slowly.
      const target = Math.min(92, 8 + (elapsed / 14_000) * 84);
      setProgress((current) => {
        const next = current + (target - current) * 0.22;
        return Math.min(94, Math.max(current + 0.35, next));
      });
    }, 200);

    return () => window.clearInterval(tick);
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 bg-[length:200%_100%]"
            style={{
              animationDelay: `${i * 120}ms`,
              animationDuration: "1.4s",
            }}
          />
        ))}
      </div>

      <div className="mx-auto w-full max-w-md space-y-3 rounded-xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-teal-700"
            aria-hidden
          />
          <span aria-live="polite">{stageLabel(progress)}</span>
        </div>
        <Progress value={progress} />
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>First load from prod-smartrefill</span>
          <span className="tabular-nums font-medium text-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Usually finishes in about 10–15 seconds.
        </p>
      </div>
    </div>
  );
}
