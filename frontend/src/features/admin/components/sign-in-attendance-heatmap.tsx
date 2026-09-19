"use client";

import { cn } from "@/lib/utils";
import {
  signInHeatmapLevel,
  type SignInHeatmapModel,
} from "@/lib/admin/sign-in-attendance-heatmap";

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-[#eaf4d6]",
  1: "bg-[#b7e0a0]",
  2: "bg-[#7dbe7e]",
  3: "bg-[#3d9a4a]",
  4: "bg-[#216e39]",
};

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function formatDayTitle(date: string, count: number): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  const label = parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  if (count <= 0) return `No sign-in · ${label}`;
  return `Signed in · ${label}`;
}

export function SignInAttendanceHeatmap({
  model,
  loading,
}: {
  model: SignInHeatmapModel;
  loading?: boolean;
}) {
  const monthSlots = model.weeks.map((_, weekIndex) => {
    return model.monthLabels.find((row) => row.weekIndex === weekIndex)?.label ?? "";
  });

  return (
    <div className="overflow-x-auto">
      {loading ?
        <div className="flex h-[132px] items-center justify-center text-sm text-zinc-500">
          Loading sign-ins…
        </div>
      : <div className="inline-flex min-w-full items-start gap-2">
          <div
            className="grid shrink-0 grid-rows-7 gap-[3px] pt-[18px] text-[10px] leading-[11px] text-zinc-400"
            aria-hidden
          >
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={`wd-${index}`} className="h-[11px]">
                {label}
              </span>
            ))}
          </div>
          <div className="min-w-0">
            <div
              className="mb-1 grid gap-[3px] text-[10px] text-zinc-400"
              style={{
                gridTemplateColumns: `repeat(${model.weeks.length}, 11px)`,
              }}
            >
              {monthSlots.map((label, index) => (
                <span key={`mo-${index}`} className="whitespace-nowrap">
                  {label}
                </span>
              ))}
            </div>
            <div
              className="grid gap-[3px]"
              style={{
                gridTemplateColumns: `repeat(${model.weeks.length}, 11px)`,
              }}
              role="img"
              aria-label={`${model.signedInDays} sign-in days in ${model.year}`}
            >
              {model.weeks.map((week, weekIndex) => (
                <div key={`wk-${weekIndex}`} className="grid grid-rows-7 gap-[3px]">
                  {week.days.map((cell, dayIndex) => {
                    if (!cell.inYear || !cell.date) {
                      return (
                        <span
                          key={`c-${weekIndex}-${dayIndex}`}
                          className="h-[11px] w-[11px] rounded-[2px] bg-[#eaf4d6] opacity-50"
                        />
                      );
                    }
                    const level = signInHeatmapLevel(cell.count);
                    return (
                      <span
                        key={cell.date}
                        title={formatDayTitle(cell.date, cell.count)}
                        className={cn(
                          "h-[11px] w-[11px] rounded-[2px]",
                          LEVEL_CLASS[level],
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    </div>
  );
}
