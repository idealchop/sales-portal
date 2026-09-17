"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SKELETON_ROWS = 8;

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 bg-[length:200%_100%]",
        className,
      )}
      style={{ animationDuration: "1.4s" }}
    />
  );
}

/** Table-shaped loading state for the lead pipeline list. */
export function LeadPipelineTableLoading({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="min-w-[200px] flex-1 space-y-1">
          <ShimmerBar className="h-3 w-14" />
          <ShimmerBar className="h-10 w-full" />
        </div>
        <div className="min-w-[140px] space-y-1">
          <ShimmerBar className="h-3 w-16" />
          <ShimmerBar className="h-10 w-full" />
        </div>
        <div className="min-w-[140px] space-y-1">
          <ShimmerBar className="h-3 w-12" />
          <ShimmerBar className="h-10 w-full" />
        </div>
        <div className="min-w-[110px] space-y-1">
          <ShimmerBar className="h-3 w-10" />
          <ShimmerBar className="h-10 w-full" />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden />
        <span>Loading lead pipeline from SmartRefill…</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-4 gap-3 border-b border-zinc-100 bg-zinc-50 px-3 py-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <ShimmerBar key={index} className="h-3 w-full" />
          ))}
        </div>
        <div className="divide-y divide-zinc-100">
          {Array.from({ length: SKELETON_ROWS }).map((_, row) => (
            <div
              key={row}
              className="grid grid-cols-2 items-start gap-3 px-3 py-4 sm:grid-cols-4"
            >
              <div className="space-y-2 sm:col-span-1">
                <ShimmerBar className="h-4 w-3/4" />
                <ShimmerBar className="h-3 w-2/3" />
                <ShimmerBar className="h-3 w-1/2" />
                <ShimmerBar className="mt-2 h-3 w-full" />
              </div>
              {Array.from({ length: 3 }).map((__, col) => (
                <ShimmerBar
                  key={col}
                  className={cn("h-4 w-full", col > 0 && "hidden sm:block")}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
