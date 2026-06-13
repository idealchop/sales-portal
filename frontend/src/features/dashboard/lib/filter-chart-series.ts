import type {
  ChartBusinessContext,
  ChartTimeSeries,
} from "@/lib/dashboard/analytics";
import {
  dayKey,
  formatDateRangeLabel,
  isDateInRange,
  type DateRange,
} from "@/features/dashboard/lib/date-range";

function monthKey(date: Date): string {
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function shouldUseMonthlyBuckets(range: DateRange): boolean {
  const days =
    (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000);
  return days > 62;
}

function filterDaily<T extends { date: string }>(
  rows: T[],
  range: DateRange,
): T[] {
  return rows.filter((row) => isDateInRange(row.date, range));
}

export function aggregateDailyCounts(
  rows: { date: string; count: number }[],
  range: DateRange,
): { month: string; count: number }[] | { date: string; count: number }[] {
  const filtered = filterDaily(rows, range);
  if (shouldUseMonthlyBuckets(range)) {
    const buckets = new Map<string, number>();
    filtered.forEach((row) => {
      const key = monthKey(new Date(`${row.date}T12:00:00`));
      buckets.set(key, (buckets.get(key) || 0) + row.count);
    });
    return [...buckets.entries()].map(([month, count]) => ({ month, count }));
  }
  return filtered.map((row) => ({
    date: row.date.slice(5),
    count: row.count,
    fullDate: row.date,
  }));
}

export function aggregateLoginDaily(
  rows: ChartTimeSeries["loginDaily"],
  range: DateRange,
): { date: string; sessions: number; uniqueUsers: number }[] {
  return filterDaily(rows, range).map((row) => ({
    date: shouldUseMonthlyBuckets(range) ? row.date : row.date.slice(5),
    sessions: row.sessions,
    uniqueUsers: row.uniqueUsers,
    fullDate: row.date,
  }));
}

export function aggregateTransactionDaily(
  rows: ChartTimeSeries["transactionsDaily"],
  range: DateRange,
): { month: string; count: number; amount: number }[] | {
  date: string;
  count: number;
  amount: number;
}[] {
  const filtered = filterDaily(rows, range);
  if (shouldUseMonthlyBuckets(range)) {
    const buckets = new Map<string, { count: number; amount: number }>();
    filtered.forEach((row) => {
      const key = monthKey(new Date(`${row.date}T12:00:00`));
      const bucket = buckets.get(key) || { count: 0, amount: 0 };
      bucket.count += row.count;
      bucket.amount += row.amount;
      buckets.set(key, bucket);
    });
    return [...buckets.entries()].map(([month, value]) => ({
      month,
      ...value,
    }));
  }
  return filtered.map((row) => ({
    date: row.date.slice(5),
    count: row.count,
    amount: row.amount,
    fullDate: row.date,
  }));
}

export function aggregateUsageDaily(
  rows: ChartTimeSeries["deviceSessionsDaily"],
  range: DateRange,
): { name: string; sessions: number }[] {
  const totals = new Map<string, number>();
  rows
    .filter((row) => isDateInRange(row.date, range))
    .forEach((row) => {
      totals.set(row.name, (totals.get(row.name) || 0) + row.sessions);
    });
  return [...totals.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions);
}

export function filterBusinessesInRange(
  businesses: ChartBusinessContext[],
  range: DateRange,
): ChartBusinessContext[] {
  const endKey = dayKey(range.end);
  return businesses.filter((biz) => {
    if (!biz.createdAt) return true;
    return biz.createdAt.slice(0, 10) <= endKey;
  });
}

export function sumDailyCounts(
  rows: { date: string; count: number }[],
  range: DateRange,
): number {
  return filterDaily(rows, range).reduce((sum, row) => sum + row.count, 0);
}

export function sumLoginInRange(
  rows: ChartTimeSeries["loginDaily"],
  range: DateRange,
): { sessions: number; uniqueUsers: number } {
  const filtered = filterDaily(rows, range);
  const uniqueUsers = new Set<string>();
  let sessions = 0;
  filtered.forEach((row) => {
    sessions += row.sessions;
  });
  return { sessions, uniqueUsers: uniqueUsers.size || filtered.length };
}

export function sumTransactionsInRange(
  rows: ChartTimeSeries["transactionsDaily"],
  range: DateRange,
): { count: number; amount: number } {
  return filterDaily(rows, range).reduce(
    (acc, row) => ({
      count: acc.count + row.count,
      amount: acc.amount + row.amount,
    }),
    { count: 0, amount: 0 },
  );
}

export function buildDailyBreakdownRows(
  rows: { date: string; count: number }[],
  range: DateRange,
  valueLabel = "count",
): { label: string; value: string; detail?: string }[] {
  return filterDaily(rows, range)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((row) => ({
      label: row.date,
      value: `${row.count}`,
      detail: valueLabel,
    }));
}

export function buildLoginBreakdownRows(
  rows: ChartTimeSeries["loginDaily"],
  range: DateRange,
): { label: string; value: string; detail?: string }[] {
  return filterDaily(rows, range)
    .slice()
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 12)
    .map((row) => ({
      label: row.date,
      value: `${row.sessions} sessions`,
      detail: `${row.uniqueUsers} users`,
    }));
}

export function buildTransactionBreakdownRows(
  rows: ChartTimeSeries["transactionsDaily"],
  range: DateRange,
  formatAmount: (n: number) => string,
): { label: string; value: string; detail?: string }[] {
  return filterDaily(rows, range)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
    .map((row) => ({
      label: row.date,
      value: formatAmount(row.amount),
      detail: `${row.count.toLocaleString()} tx`,
    }));
}

export function rangeSubtitle(range: DateRange): string {
  return formatDateRangeLabel(range);
}
