const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_TIMEZONE = "Asia/Manila";

export type RoleActiveTimeBucket = {
  sinSum: number;
  cosSum: number;
  count: number;
};

export type RoleActiveTimeBuckets = {
  owners: RoleActiveTimeBucket;
  admins: RoleActiveTimeBucket;
  riders: RoleActiveTimeBucket;
};

export type RoleActiveTimeSummary = {
  owners: string;
  admins: string;
  riders: string;
  timezone: string;
  sampleCounts: { owners: number; admins: number; riders: number };
};

export function createRoleActiveTimeBuckets(): RoleActiveTimeBuckets {
  return {
    owners: { sinSum: 0, cosSum: 0, count: 0 },
    admins: { sinSum: 0, cosSum: 0, count: 0 },
    riders: { sinSum: 0, cosSum: 0, count: 0 },
  };
}

export function minutesOfDayInTimezone(
  date: Date,
  timezone = DEFAULT_TIMEZONE,
): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function recordRoleActiveTime(
  buckets: RoleActiveTimeBuckets,
  role: "owner" | "admin" | "rider",
  minutesOfDay: number,
): void {
  const bucketKey = role === "owner" ? "owners" : role === "admin" ? "admins" : "riders";
  const bucket = buckets[bucketKey];
  const angle = (minutesOfDay / MINUTES_PER_DAY) * 2 * Math.PI;
  bucket.sinSum += Math.sin(angle);
  bucket.cosSum += Math.cos(angle);
  bucket.count += 1;
}

function averageMinutesFromBucket(bucket: RoleActiveTimeBucket): number | null {
  if (bucket.count === 0) return null;

  const sinAvg = bucket.sinSum / bucket.count;
  const cosAvg = bucket.cosSum / bucket.count;
  let angle = Math.atan2(sinAvg, cosAvg);
  if (angle < 0) angle += 2 * Math.PI;

  return (angle / (2 * Math.PI)) * MINUTES_PER_DAY;
}

export function formatMinutesOfDay(minutes: number): string {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = Math.round(minutes % 60);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function summarizeRoleActiveTimes(
  buckets: RoleActiveTimeBuckets,
  timezone = DEFAULT_TIMEZONE,
): RoleActiveTimeSummary {
  const formatRole = (bucket: RoleActiveTimeBucket): string => {
    const avgMinutes = averageMinutesFromBucket(bucket);
    return avgMinutes === null ? "—" : formatMinutesOfDay(avgMinutes);
  };

  return {
    owners: formatRole(buckets.owners),
    admins: formatRole(buckets.admins),
    riders: formatRole(buckets.riders),
    timezone,
    sampleCounts: {
      owners: buckets.owners.count,
      admins: buckets.admins.count,
      riders: buckets.riders.count,
    },
  };
}

export function buildRoleActiveTimeBreakdownRows(
  summary: RoleActiveTimeSummary,
): Array<{ label: string; value: string; detail?: string }> {
  const timezoneLabel = summary.timezone.replace("_", " ");
  const roles = [
    { label: "Owners", key: "owners" as const },
    { label: "Admins", key: "admins" as const },
    { label: "Riders", key: "riders" as const },
  ];

  return roles.map(({ label, key }) => ({
    label,
    value: summary[key],
    detail:
      summary.sampleCounts[key] > 0 ?
        `${summary.sampleCounts[key]} login events (30d) · avg time in ${timezoneLabel}` :
        "No login events in the last 30 days",
  }));
}
