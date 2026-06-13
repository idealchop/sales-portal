export type GlobalDatePreset =
  | "today"
  | "yesterday"
  | "last_week"
  | "this_month"
  | "ytd"
  | "custom";

export type BreakdownDatePreset =
  | "1week"
  | "30days"
  | "3months"
  | "1year"
  | "custom";

export type DateRange = {
  start: Date;
  end: Date;
};

export type DateRangeFilterState =
  | { preset: Exclude<GlobalDatePreset, "custom"> }
  | { preset: "custom"; start: string; end: string };

export type BreakdownFilterState =
  | { preset: Exclude<BreakdownDatePreset, "custom"> }
  | { preset: "custom"; start: string; end: string };

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isDateInRange(dateKey: string, range: DateRange): boolean {
  const startKey = dayKey(range.start);
  const endKey = dayKey(range.end);
  return dateKey >= startKey && dateKey <= endKey;
}

export function resolveGlobalDateRange(
  filter: DateRangeFilterState,
  now = new Date(),
): DateRange {
  const today = startOfDay(now);

  switch (filter.preset) {
    case "today":
      return { start: today, end: endOfDay(now) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: y, end: endOfDay(y) };
    }
    case "last_week": {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: endOfDay(now) };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: endOfDay(now) };
    }
    case "ytd": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: endOfDay(now) };
    }
    case "custom": {
      const start = startOfDay(new Date(filter.start));
      const end = endOfDay(new Date(filter.end));
      return start <= end ? { start, end } : { start: end, end: start };
    }
    default:
      return resolveGlobalDateRange({ preset: "this_month" }, now);
  }
}

export function resolveBreakdownDateRange(
  filter: BreakdownFilterState,
  now = new Date(),
): DateRange {
  const end = endOfDay(now);

  switch (filter.preset) {
    case "1week": {
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start: startOfDay(start), end };
    }
    case "30days": {
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return { start: startOfDay(start), end };
    }
    case "3months": {
      const start = new Date(end);
      start.setMonth(start.getMonth() - 3);
      return { start: startOfDay(start), end };
    }
    case "1year": {
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      return { start: startOfDay(start), end };
    }
    case "custom": {
      const start = startOfDay(new Date(filter.start));
      const customEnd = endOfDay(new Date(filter.end));
      return start <= customEnd ?
          { start, end: customEnd }
        : { start: customEnd, end: start };
    }
    default:
      return resolveBreakdownDateRange({ preset: "30days" }, now);
  }
}

export function formatDateRangeLabel(range: DateRange): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const startKey = dayKey(range.start);
  const endKey = dayKey(range.end);
  if (startKey === endKey) return fmt(range.start);
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

export const GLOBAL_PRESET_LABELS: Record<GlobalDatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_week: "Last week",
  this_month: "This month",
  ytd: "YTD",
  custom: "Custom",
};

export const BREAKDOWN_PRESET_LABELS: Record<BreakdownDatePreset, string> = {
  "1week": "1 week",
  "30days": "30 days",
  "3months": "3 months",
  "1year": "1 year",
  custom: "Custom",
};

export const DEFAULT_GLOBAL_FILTER: DateRangeFilterState = {
  preset: "this_month",
};

export const DEFAULT_BREAKDOWN_FILTER: BreakdownFilterState = {
  preset: "30days",
};
