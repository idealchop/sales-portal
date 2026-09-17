"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricHelpContent = {
  title: string;
  summary: string;
  how: string;
};

export function MetricHelpButton({
  content,
  className,
}: {
  content: MetricHelpContent;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-label={`Explain ${content.title}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "rounded-full border border-zinc-200 bg-white p-1 text-zinc-500 shadow-sm",
          "hover:border-zinc-300 hover:text-zinc-800",
          open && "border-teal-300 text-teal-700",
        )}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>

      {open ?
        <div
          id={panelId}
          role="dialog"
          aria-label={content.title}
          className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-lg border border-[var(--border)] bg-white p-3 shadow-lg sm:w-72"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">{content.title}</p>
            <button
              type="button"
              aria-label="Close explanation"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-600">{content.summary}</p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            How it&apos;s calculated
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">{content.how}</p>
        </div>
      : null}
    </div>
  );
}
