"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoStatus } from "../lib/events-training-types";
import { VIDEO_STATUSES } from "../lib/events-training-types";

const STATUS_META: Record<
  VideoStatus,
  { label: string; hint: string; trigger: string; active: string }
> = {
  draft: {
    label: "Draft",
    hint: "Not live",
    trigger:
      "border-amber-200/80 bg-amber-50/90 text-amber-900 hover:border-amber-300 hover:bg-amber-50",
    active: "bg-amber-50 text-amber-900",
  },
  published: {
    label: "Published",
    hint: "Live",
    trigger:
      "border-emerald-200/80 bg-emerald-50/90 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50",
    active: "bg-emerald-50 text-emerald-900",
  },
  archived: {
    label: "Archived",
    hint: "Hidden",
    trigger:
      "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100",
    active: "bg-zinc-100 text-zinc-800",
  },
};

export function VideoStatusPicker({
  value,
  disabled,
  onChange,
}: {
  value: VideoStatus;
  disabled?: boolean;
  onChange: (status: VideoStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const meta = STATUS_META[value];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium shadow-[0_1px_0_rgba(0,0,0,0.02)] transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/25",
          "disabled:cursor-wait disabled:opacity-60",
          meta.trigger,
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            value === "published" && "bg-emerald-500",
            value === "draft" && "bg-amber-500",
            value === "archived" && "bg-zinc-400",
          )}
        />
        {meta.label}
        <ChevronDown
          className={cn(
            "h-3 w-3 opacity-60 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label="Set status"
          className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[11.5rem] overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-1 shadow-lg shadow-zinc-900/10 ring-1 ring-black/5"
          onClick={(event) => event.stopPropagation()}
        >
          {VIDEO_STATUSES.map((status) => {
            const option = STATUS_META[status];
            const selected = status === value;
            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  if (!selected) onChange(status);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition",
                  selected ? option.active : "hover:bg-zinc-50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    status === "published" && "bg-emerald-500",
                    status === "draft" && "bg-amber-500",
                    status === "archived" && "bg-zinc-400",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
                {selected ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-teal-700" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
