"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type CalendarViewMode = "month" | "week" | "day";

export type CalendarFollowUpEvent = {
  id: string;
  dayKey: string;
  title: string;
  timeLabel: string;
  subtitle?: string;
};

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Local calendar day key from an ISO timestamp. */
export function followUpDayKey(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return toDayKey(date);
}

export function followUpTimeLabel(iso?: string | null): string {
  if (!iso) return "All day";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "All day";
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) return "All day";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const VIEW_OPTIONS: Array<{ id: CalendarViewMode; label: string }> = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

export function ActionFollowUpCalendar({
  events,
  selectedDay,
  onSelectDay,
}: {
  events: CalendarFollowUpEvent[];
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}) {
  const todayKey = toDayKey(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());

  const countsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const event of events) {
      map[event.dayKey] = (map[event.dayKey] ?? 0) + 1;
    }
    return map;
  }, [events]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarFollowUpEvent[]>();
    for (const event of events) {
      const list = map.get(event.dayKey) ?? [];
      list.push(event);
      map.set(event.dayKey, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
    }
    return map;
  }, [events]);

  const activeDay = selectedDay || todayKey;

  const headerLabel = useMemo(() => {
    if (viewMode === "month") {
      return cursor.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const start = startOfWeek(cursor);
      const end = addDays(start, 6);
      const startLabel = start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const endLabel = end.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startLabel} – ${endLabel}`;
    }
    return parseDayKey(activeDay).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [activeDay, cursor, viewMode]);

  function shiftCursor(delta: number) {
    setCursor((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") {
        next.setMonth(next.getMonth() + delta);
        return next;
      }
      if (viewMode === "week") {
        next.setDate(next.getDate() + delta * 7);
        return next;
      }
      const day = addDays(parseDayKey(activeDay), delta);
      onSelectDay(toDayKey(day));
      return day;
    });
  }

  function goToday() {
    const now = new Date();
    setCursor(now);
    onSelectDay(todayKey);
  }

  const monthCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const total = daysInMonth(year, month);
    const pad = first.getDay();
    const slots: Array<{ day: number; key: string } | null> = [];
    for (let i = 0; i < pad; i += 1) slots.push(null);
    for (let day = 1; day <= total; day += 1) {
      slots.push({ day, key: toDayKey(new Date(year, month, day)) });
    }
    while (slots.length % 7 !== 0) slots.push(null);
    return slots;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      return { date, key: toDayKey(date) };
    });
  }, [cursor]);

  const dayEvents = eventsByDay.get(activeDay) ?? [];

  return (
    <div className="flex h-full min-h-[28rem] flex-col rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Schedule
          </p>
          <p className="text-sm font-semibold text-zinc-900">{headerLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setViewMode(option.id);
                  if (option.id === "day" && !selectedDay) {
                    onSelectDay(todayKey);
                  }
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium",
                  viewMode === option.id ?
                    "bg-teal-600 text-white"
                  : "text-zinc-600 hover:bg-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"
            aria-label="Previous"
            onClick={() => shiftCursor(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            onClick={goToday}
          >
            Today
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"
            aria-label="Next"
            onClick={() => shiftCursor(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === "month" ?
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {WEEKDAYS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-7 gap-1">
            {monthCells.map((cell, index) => {
              if (!cell) {
                return <div key={`empty-${index}`} className="min-h-12" />;
              }
              const count = countsByDay[cell.key] ?? 0;
              const selected = selectedDay === cell.key;
              const isToday = cell.key === todayKey;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => onSelectDay(selected ? null : cell.key)}
                  className={cn(
                    "relative flex min-h-12 flex-col items-center justify-center rounded-lg border text-sm transition",
                    selected ?
                      "border-teal-600 bg-teal-600 text-white"
                    : isToday ?
                      "border-teal-300 bg-teal-50 text-teal-900"
                    : count > 0 ?
                      "border-amber-200 bg-amber-50/70 text-zinc-900 hover:border-teal-300"
                    : "border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  <span className="font-medium tabular-nums">{cell.day}</span>
                  {count > 0 ?
                    <span
                      className={cn(
                        "mt-0.5 text-[9px] font-semibold tabular-nums",
                        selected ? "text-teal-50" : "text-amber-800",
                      )}
                    >
                      {count}
                    </span>
                  : null}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Click a day to filter tasks · amber days have follow-ups
          </p>
        </div>
      : null}

      {viewMode === "week" ?
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {weekDays.map(({ date, key }) => {
            const dayEvents = eventsByDay.get(key) ?? [];
            const selected = selectedDay === key;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDay(selected ? null : key)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition",
                  selected ?
                    "border-teal-600 bg-teal-50"
                  : isToday ?
                    "border-teal-200 bg-white"
                  : "border-zinc-200 bg-white hover:border-teal-200",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">
                    {date.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <span className="text-[10px] font-medium tabular-nums text-zinc-500">
                    {dayEvents.length} task{dayEvents.length === 1 ? "" : "s"}
                  </span>
                </div>
                {dayEvents.length === 0 ?
                  <p className="mt-1 text-xs text-zinc-400">No follow-ups</p>
                : <ul className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <li
                        key={event.id}
                        className="truncate text-xs text-zinc-600"
                      >
                        <span className="font-medium text-zinc-800">
                          {event.timeLabel}
                        </span>{" "}
                        · {event.title}
                      </li>
                    ))}
                    {dayEvents.length > 3 ?
                      <li className="text-[10px] text-zinc-400">
                        +{dayEvents.length - 3} more
                      </li>
                    : null}
                  </ul>
                }
              </button>
            );
          })}
        </div>
      : null}

      {viewMode === "day" ?
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          {dayEvents.length === 0 ?
            <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-3 py-8 text-center text-sm text-zinc-500">
              No follow-ups scheduled for this day.
            </p>
          : <ul className="space-y-2 overflow-y-auto">
              {dayEvents.map((event) => (
                <li
                  key={event.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">
                    {event.timeLabel}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-900">
                    {event.title}
                  </p>
                  {event.subtitle ?
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {event.subtitle}
                    </p>
                  : null}
                </li>
              ))}
            </ul>
          }
        </div>
      : null}
    </div>
  );
}
