export type DailyCountRow = { date: string; count: number };
export type DailyLoginRow = {
  date: string;
  sessions: number;
  uniqueUsers: number;
};
export type DailyTransactionRow = {
  date: string;
  count: number;
  amount: number;
};

export type UsageDailyRow = {
  date: string;
  name: string;
  sessions: number;
};

export type ChartTimeSeries = {
  ownerSignupsDaily: DailyCountRow[];
  workspacesDaily: DailyCountRow[];
  loginDaily: DailyLoginRow[];
  transactionsDaily: DailyTransactionRow[];
  deviceSessionsDaily: UsageDailyRow[];
  browserSessionsDaily: UsageDailyRow[];
};

export type ChartBusinessContext = {
  id: string;
  createdAt: string | null;
  healthTier: "high" | "medium" | "low";
  planName?: string;
  planCode?: string;
  paymentStatus?: string;
  price: number;
  customers: number;
  transactionsLast30Days: number;
  usageGoals: string[];
  gettingStarted: Record<string, boolean>;
};

export const CHART_SERIES_DAYS = 365;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function initDailyCountMap(daysBack: number, now: Date): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map.set(dayKey(d), 0);
  }
  return map;
}

export function buildDailyCountSeries(
  dates: Date[],
  daysBack: number,
  now: Date,
): DailyCountRow[] {
  const map = initDailyCountMap(daysBack, now);
  const startKey = dayKey(
    new Date(now.getTime() - (daysBack - 1) * 24 * 60 * 60 * 1000),
  );

  dates.forEach((date) => {
    const key = dayKey(date);
    if (key < startKey) return;
    if (!map.has(key)) map.set(key, 0);
    map.set(key, (map.get(key) || 0) + 1);
  });

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export function buildLoginDailySeries(input: {
  loginDaySessions: Map<string, number>;
  loginDayUsers: Map<string, Set<string>>;
  daysBack: number;
  now: Date;
}): DailyLoginRow[] {
  const { loginDaySessions, loginDayUsers, daysBack, now } = input;
  const map = initDailyCountMap(daysBack, now);
  const startKey = dayKey(
    new Date(now.getTime() - (daysBack - 1) * 24 * 60 * 60 * 1000),
  );

  loginDaySessions.forEach((sessions, date) => {
    if (date < startKey) return;
    if (!map.has(date)) return;
  });

  return [...map.keys()]
    .sort()
    .map((date) => ({
      date,
      sessions: loginDaySessions.get(date) || 0,
      uniqueUsers: loginDayUsers.get(date)?.size || 0,
    }));
}

export function buildTransactionDailySeries(input: {
  rows: Array<{ date: Date; amount: number }>;
  daysBack: number;
  now: Date;
}): DailyTransactionRow[] {
  const { rows, daysBack, now } = input;
  const map = new Map<string, { count: number; amount: number }>();
  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map.set(dayKey(d), { count: 0, amount: 0 });
  }

  const startKey = dayKey(
    new Date(now.getTime() - (daysBack - 1) * 24 * 60 * 60 * 1000),
  );

  rows.forEach(({ date, amount }) => {
    const key = dayKey(date);
    if (key < startKey || !map.has(key)) return;
    const bucket = map.get(key);
    if (!bucket) return;
    bucket.count += 1;
    bucket.amount += amount;
  });

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, ...value }));
}

export function flattenDailyUsage(
  map: Map<string, Map<string, number>>,
): UsageDailyRow[] {
  const rows: UsageDailyRow[] = [];
  map.forEach((names, date) => {
    names.forEach((sessions, name) => {
      rows.push({ date, name, sessions });
    });
  });
  return rows.sort((a, b) =>
    a.date === b.date ? a.name.localeCompare(b.name) : a.date.localeCompare(b.date),
  );
}
