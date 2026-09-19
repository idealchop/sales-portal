export type SignInHeatmapCell = {
  date: string | null;
  count: number;
  inYear: boolean;
};

export type SignInHeatmapWeek = {
  days: SignInHeatmapCell[];
};

export type SignInHeatmapMonthLabel = {
  label: string;
  weekIndex: number;
};

export type SignInHeatmapModel = {
  year: number;
  weeks: SignInHeatmapWeek[];
  monthLabels: SignInHeatmapMonthLabel[];
  signedInDays: number;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function mondayOnOrBeforeUtc(date: Date): Date {
  const day = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const weekday = day.getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  day.setUTCDate(day.getUTCDate() - offset);
  return day;
}

export function loginDayCountsFromEvents(
  events: ReadonlyArray<{
    documentId: string;
    data: Record<string, unknown>;
  }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const fromData =
      typeof event.data.calendarDayUtc === "string" ?
        event.data.calendarDayUtc.trim()
      : "";
    const day = /^\d{4}-\d{2}-\d{2}$/.test(fromData) ? fromData : event.documentId;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function buildSignInHeatmap(
  counts: Map<string, number>,
  year: number,
): SignInHeatmapModel {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const start = mondayOnOrBeforeUtc(jan1);
  const endMonday = mondayOnOrBeforeUtc(dec31);
  const weekCount =
    Math.round((endMonday.getTime() - start.getTime()) / 86_400_000 / 7) + 1;

  const weeks: SignInHeatmapWeek[] = [];
  const monthLabels: SignInHeatmapMonthLabel[] = [];
  let signedInDays = 0;

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const days: SignInHeatmapCell[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = addUtcDays(start, weekIndex * 7 + weekday);
      const inYear = date.getUTCFullYear() === year;
      const key = utcDayKey(date);
      const count = inYear ? (counts.get(key) ?? 0) : 0;
      if (inYear && count > 0) signedInDays += 1;
      days.push({
        date: inYear ? key : null,
        count,
        inYear,
      });
    }
    weeks.push({ days });

    const firstOfMonth = days.find(
      (cell) => cell.inYear && cell.date?.endsWith("-01"),
    );
    if (!firstOfMonth?.date) continue;
    const month = Number(firstOfMonth.date.slice(5, 7)) - 1;
    monthLabels.push({ label: MONTH_LABELS[month] ?? "", weekIndex });
  }

  return { year, weeks, monthLabels, signedInDays };
}

export function signInHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 2;
  if (count === 2) return 3;
  return 4;
}
