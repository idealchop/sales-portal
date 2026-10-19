import { resolveSmartRefillUserRole } from "./count-smartrefill-user-roles";

export type NewSalesRepJoiner = {
  id: string;
  displayName: string;
  email?: string;
  role?: string;
  team?: string;
  onboardingComplete: boolean;
  joinedAt: string | null;
};

export type NewBusinessJoiner = {
  id: string;
  name: string;
  ownerEmail?: string;
  planName?: string;
  onboardingComplete: boolean;
  joinedAt: string | null;
};

export type NewPlatformUserJoiner = {
  id: string;
  displayName?: string;
  email?: string;
  role: string;
  joinedAt: string | null;
};

/** New accounts whose `createdAt` falls on one Asia/Manila calendar day. */
export type NewRegistrationsToday = {
  /** `YYYY-MM-DD` in Asia/Manila. */
  dayKey: string;
  /** SmartRefill user accounts created that day. */
  smartrefill: number;
  /** Sales Portal accounts created that day. */
  salesPortal: number;
};

export type NewJoinersSummary = {
  salesReps: NewSalesRepJoiner[];
  businesses: NewBusinessJoiner[];
  platformUsers: NewPlatformUserJoiner[];
  registeredToday?: NewRegistrationsToday;
};

const MANILA_TZ = "Asia/Manila";

export function manilaDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function countJoinedOnManilaDay(
  rows: Array<{ joinedAt: string | null }>,
  dayKey: string,
): number {
  let count = 0;
  for (const row of rows) {
    if (!row.joinedAt) continue;
    const parsed = new Date(row.joinedAt);
    if (Number.isNaN(parsed.getTime())) continue;
    if (manilaDayKey(parsed) === dayKey) count += 1;
  }
  return count;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    return new Date((value as { _seconds: number })._seconds * 1000).toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

function sortByJoinedAtDesc<T extends { joinedAt: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    String(b.joinedAt ?? "").localeCompare(String(a.joinedAt ?? "")),
  );
}

export function buildNewJoiners(input: {
  salesDocs: Array<{ id: string; data: () => Record<string, unknown> }>;
  recentBusinesses: Array<{
    id: string;
    name: string;
    ownerEmail?: string;
    createdAt: string | null;
    onboardingComplete: boolean;
    planName?: string;
  }>;
  smartRefillUsers: Array<{ id: string; data: Record<string, unknown> }>;
  businessOwnerIds: Set<string>;
  limit?: number;
  now?: Date;
}): NewJoinersSummary {
  const limit = input.limit ?? 12;
  const dayKey = manilaDayKey(input.now ?? new Date());

  const salesReps = sortByJoinedAtDesc(
    input.salesDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: String(data.displayName || data.email || "Unknown"),
        email: typeof data.email === "string" ? data.email : undefined,
        role: typeof data.role === "string" ? data.role : undefined,
        team: typeof data.team === "string" ? data.team : undefined,
        onboardingComplete: data.onboardingCompleted === true,
        joinedAt: toIso(data.createdAt),
      };
    }),
  );

  const businesses = sortByJoinedAtDesc(
    input.recentBusinesses.map((row) => ({
      id: row.id,
      name: row.name,
      ownerEmail: row.ownerEmail,
      planName: row.planName,
      onboardingComplete: row.onboardingComplete,
      joinedAt: row.createdAt,
    })),
  );

  const platformUsers = sortByJoinedAtDesc(
    input.smartRefillUsers.map(({ id, data }) => {
      const role = resolveSmartRefillUserRole(id, data, input.businessOwnerIds);
      const profile =
        data.userProfile && typeof data.userProfile === "object" ?
          (data.userProfile as Record<string, unknown>) :
          {};
      const displayName =
        typeof profile.displayName === "string" ? profile.displayName :
          typeof data.displayName === "string" ? data.displayName :
            undefined;
      const email =
        typeof profile.email === "string" ? profile.email :
          typeof data.email === "string" ? data.email :
            undefined;

      return {
        id,
        displayName,
        email,
        role,
        joinedAt: toIso(data.createdAt),
      };
    }),
  );

  return {
    salesReps: salesReps.slice(0, limit),
    businesses: businesses.slice(0, limit),
    platformUsers: platformUsers.slice(0, limit),
    registeredToday: {
      dayKey,
      smartrefill: countJoinedOnManilaDay(platformUsers, dayKey),
      salesPortal: countJoinedOnManilaDay(salesReps, dayKey),
    },
  };
}
