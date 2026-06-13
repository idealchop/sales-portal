"use client";

import { cn } from "@/lib/utils";
import type {
  BreakdownDatePreset,
  BreakdownFilterState,
  DateRangeFilterState,
  GlobalDatePreset,
} from "@/features/dashboard/lib/date-range";
import {
  BREAKDOWN_PRESET_LABELS,
  GLOBAL_PRESET_LABELS,
} from "@/features/dashboard/lib/date-range";

type DateRangeFilterProps = {
  variant: "global";
  value: DateRangeFilterState;
  onChange: (value: DateRangeFilterState) => void;
};

type BreakdownRangeFilterProps = {
  variant: "breakdown";
  value: BreakdownFilterState;
  onChange: (value: BreakdownFilterState) => void;
};

type Props = DateRangeFilterProps | BreakdownRangeFilterProps;

const GLOBAL_PRESETS: GlobalDatePreset[] = [
  "today",
  "yesterday",
  "last_week",
  "this_month",
  "ytd",
  "custom",
];

const BREAKDOWN_PRESETS: BreakdownDatePreset[] = [
  "1week",
  "30days",
  "3months",
  "1year",
  "custom",
];

export function DateRangeFilter(props: Props) {
  const preset = props.value.preset;
  const showCustom = preset === "custom";

  if (props.variant === "global") {
    return (
      <DateRangeFilterInner
        presets={GLOBAL_PRESETS}
        labels={GLOBAL_PRESET_LABELS}
        preset={preset}
        showCustom={showCustom}
        customStart={props.value.preset === "custom" ? props.value.start : ""}
        customEnd={props.value.preset === "custom" ? props.value.end : ""}
        onSelectPreset={(key) => {
          if (key === "custom") {
            const today = new Date().toISOString().slice(0, 10);
            props.onChange({ preset: "custom", start: today, end: today });
            return;
          }
          props.onChange({ preset: key });
        }}
        onCustomChange={(start, end) => {
          props.onChange({ preset: "custom", start, end });
        }}
      />
    );
  }

  return (
    <DateRangeFilterInner
      presets={BREAKDOWN_PRESETS}
      labels={BREAKDOWN_PRESET_LABELS}
      preset={preset}
      showCustom={showCustom}
      customStart={props.value.preset === "custom" ? props.value.start : ""}
      customEnd={props.value.preset === "custom" ? props.value.end : ""}
      onSelectPreset={(key) => {
        if (key === "custom") {
          const today = new Date().toISOString().slice(0, 10);
          props.onChange({ preset: "custom", start: today, end: today });
          return;
        }
        props.onChange({ preset: key });
      }}
      onCustomChange={(start, end) => {
        props.onChange({ preset: "custom", start, end });
      }}
    />
  );
}

function DateRangeFilterInner<T extends string>({
  presets,
  labels,
  preset,
  showCustom,
  customStart,
  customEnd,
  onSelectPreset,
  onCustomChange,
}: {
  presets: T[];
  labels: Record<T, string>;
  preset: string;
  showCustom: boolean;
  customStart: string;
  customEnd: string;
  onSelectPreset: (key: T) => void;
  onCustomChange: (start: string, end: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectPreset(key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              preset === key ?
                "bg-[var(--primary)] text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            From
            <input
              type="date"
              value={customStart}
              onChange={(event) => onCustomChange(event.target.value, customEnd)}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-foreground"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            To
            <input
              type="date"
              value={customEnd}
              onChange={(event) => onCustomChange(customStart, event.target.value)}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-foreground"
            />
          </label>
        </div>
      )}
    </div>
  );
}
