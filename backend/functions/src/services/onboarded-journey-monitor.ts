/**
 * Day 1–15 onboarded journey + post-journey subscription monitoring.
 * Flags only — never mutates lead stage.
 */

export type OnboardedMonitorFlag =
  | "journey_inactive_day8"
  | "recommend_move_to_cold"
  | "subscription_expiring_soon"
  | "subscription_grace_period"
  | "subscription_renew"
  | "subscription_change";

export type OnboardedJourneyPhase =
  | "day1_7"
  | "day8_14"
  | "day15_plus"
  | "graduated";

export type OnboardedMonitorSubscription = {
  status?: string;
  expiresAt?: string | null;
  changeType?: string | null;
  isCancellation?: boolean;
  cancelAtPeriodEnd?: boolean;
  createdAt?: string | null;
};

export type OnboardedMonitor = {
  journeyDay: number;
  journeyPhase: OnboardedJourneyPhase;
  isActive: boolean;
  gettingStartedCompleted: number;
  activityDayCount: number;
  onboardedAt: string | null;
  flags: OnboardedMonitorFlag[];
  subscription?: {
    status?: string;
    expiresAt?: string | null;
    changeType?: string | null;
  };
};

export type EvaluateOnboardedJourneyInput = {
  onboardedAt: string | null | undefined;
  gettingStartedCompleted: number;
  activityDayCount: number;
  /** Current (or best) subscription row for post-journey flags. */
  subscription?: OnboardedMonitorSubscription | null;
  /** Recent subscription change rows (renew / upgrade / cancel) within the window. */
  recentSubscriptionChanges?: OnboardedMonitorSubscription[];
  now?: Date;
};

const MS_DAY = 24 * 60 * 60 * 1000;
export const ONBOARDED_ACTIVE_GS_MIN = 3;
/** Active requires more than 7 distinct activity days. */
export const ONBOARDED_ACTIVE_ACTIVITY_DAYS_MIN = 8;
export const ONBOARDED_JOURNEY_DAY8 = 8;
export const ONBOARDED_JOURNEY_DAY15 = 15;
export const ONBOARDED_EXPIRING_SOON_DAYS = 7;
export const ONBOARDED_GRACE_PERIOD_DAYS = 7;
export const ONBOARDED_RECENT_CHANGE_DAYS = 30;

export function countGettingStartedDone(
  gettingStarted: Record<string, unknown> | null | undefined,
): number {
  if (!gettingStarted || typeof gettingStarted !== "object") return 0;
  return Object.values(gettingStarted).filter(
    (value) => value === true || value === "true" || value === 1,
  ).length;
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** 1-based journey day from onboardedAt; 1 if same calendar day / missing → treat as day 1. */
export function computeJourneyDay(
  onboardedAt: string | null | undefined,
  now: Date = new Date(),
): number {
  const start = parseIsoDate(onboardedAt ?? null);
  if (!start) return 1;
  const startUtc = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const nowUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const diff = Math.floor((nowUtc - startUtc) / MS_DAY);
  return Math.max(1, diff + 1);
}

export function isOnboardedActive(input: {
  gettingStartedCompleted: number;
  activityDayCount: number;
}): boolean {
  return (
    input.gettingStartedCompleted >= ONBOARDED_ACTIVE_GS_MIN &&
    input.activityDayCount >= ONBOARDED_ACTIVE_ACTIVITY_DAYS_MIN
  );
}

function isInGracePeriod(
  sub: OnboardedMonitorSubscription,
  now: Date,
): boolean {
  if (sub.status === "grace_period") return true;
  const expiresAt = parseIsoDate(sub.expiresAt ?? null);
  if (!expiresAt) return false;
  const graceEnd = new Date(expiresAt);
  graceEnd.setUTCDate(graceEnd.getUTCDate() + ONBOARDED_GRACE_PERIOD_DAYS);
  return now > expiresAt && now <= graceEnd;
}

function isExpiringWithinDays(
  sub: OnboardedMonitorSubscription,
  now: Date,
  days: number,
): boolean {
  const expiresAt = parseIsoDate(sub.expiresAt ?? null);
  if (!expiresAt) return false;
  const ms = expiresAt.getTime() - now.getTime();
  return ms > 0 && ms <= days * MS_DAY;
}

function isWithinRecentDays(
  iso: string | null | undefined,
  now: Date,
  days: number,
): boolean {
  const date = parseIsoDate(iso ?? null);
  if (!date) return false;
  return now.getTime() - date.getTime() <= days * MS_DAY;
}

function collectSubscriptionFlags(
  subscription: OnboardedMonitorSubscription | null | undefined,
  recentChanges: OnboardedMonitorSubscription[],
  now: Date,
): OnboardedMonitorFlag[] {
  const flags: OnboardedMonitorFlag[] = [];
  const current = subscription ?? undefined;

  if (current && isInGracePeriod(current, now)) {
    flags.push("subscription_grace_period");
  } else if (
    current &&
    isExpiringWithinDays(current, now, ONBOARDED_EXPIRING_SOON_DAYS)
  ) {
    flags.push("subscription_expiring_soon");
  }

  let sawRenew = false;
  let sawChange = false;
  for (const row of recentChanges) {
    if (!isWithinRecentDays(row.createdAt, now, ONBOARDED_RECENT_CHANGE_DAYS)) {
      continue;
    }
    if (row.changeType === "renew") {
      sawRenew = true;
      continue;
    }
    const isChange =
      Boolean(row.changeType) ||
      row.isCancellation === true ||
      row.cancelAtPeriodEnd === true ||
      row.status === "cancelled" ||
      row.status === "canceled";
    if (isChange) sawChange = true;
  }

  // Also surface renew/change from current row metadata when recent.
  if (current && isWithinRecentDays(current.createdAt, now, ONBOARDED_RECENT_CHANGE_DAYS)) {
    if (current.changeType === "renew") sawRenew = true;
    else if (
      Boolean(current.changeType) ||
      current.isCancellation === true ||
      current.cancelAtPeriodEnd === true
    ) {
      sawChange = true;
    }
  }

  if (sawRenew) flags.push("subscription_renew");
  if (sawChange) flags.push("subscription_change");
  return flags;
}

/**
 * Evaluate onboarded journey + subscription monitor flags.
 * Does not mutate stage — Day 15+ cold is recommend-only.
 */
export function evaluateOnboardedJourney(
  input: EvaluateOnboardedJourneyInput,
): OnboardedMonitor {
  const now = input.now ?? new Date();
  const gettingStartedCompleted = Math.max(
    0,
    Math.floor(Number(input.gettingStartedCompleted) || 0),
  );
  const activityDayCount = Math.max(
    0,
    Math.floor(Number(input.activityDayCount) || 0),
  );
  const onboardedAt = input.onboardedAt?.trim() || null;
  const journeyDay = computeJourneyDay(onboardedAt, now);
  const isActive = isOnboardedActive({
    gettingStartedCompleted,
    activityDayCount,
  });

  let journeyPhase: OnboardedJourneyPhase;
  if (isActive) {
    journeyPhase = "graduated";
  } else if (journeyDay < ONBOARDED_JOURNEY_DAY8) {
    journeyPhase = "day1_7";
  } else if (journeyDay < ONBOARDED_JOURNEY_DAY15) {
    journeyPhase = "day8_14";
  } else {
    journeyPhase = "day15_plus";
  }

  const flags: OnboardedMonitorFlag[] = [];

  if (!isActive && journeyPhase === "day8_14") {
    flags.push("journey_inactive_day8");
  }
  if (!isActive && journeyPhase === "day15_plus") {
    flags.push("recommend_move_to_cold");
  }

  const beyondJourney =
    journeyPhase === "graduated" || journeyPhase === "day15_plus";
  if (beyondJourney) {
    flags.push(
      ...collectSubscriptionFlags(
        input.subscription,
        input.recentSubscriptionChanges ?? [],
        now,
      ),
    );
  }

  const sub = input.subscription;
  return {
    journeyDay,
    journeyPhase,
    isActive,
    gettingStartedCompleted,
    activityDayCount,
    onboardedAt,
    flags,
    subscription: sub ?
      {
        status: sub.status,
        expiresAt: sub.expiresAt ?? null,
        changeType: sub.changeType ?? null,
      } :
      undefined,
  };
}

/** Build monitor from persisted lead snapshot fields (list fast path). */
export function evaluateOnboardedJourneyFromSnapshot(
  snapshot: {
    onboardedAt?: string | null;
    gettingStartedCompleted?: number;
    activityDayCount?: number;
    subscriptionStatus?: string | null;
    subscriptionExpiresAt?: string | null;
    subscriptionChangeType?: string | null;
    registeredAt?: string | null;
    gatheredAt?: string | null;
  },
  now?: Date,
): OnboardedMonitor {
  const onboardedAt =
    snapshot.onboardedAt ||
    snapshot.registeredAt ||
    snapshot.gatheredAt ||
    null;
  return evaluateOnboardedJourney({
    onboardedAt,
    gettingStartedCompleted: snapshot.gettingStartedCompleted ?? 0,
    activityDayCount: snapshot.activityDayCount ?? 0,
    subscription: {
      status: snapshot.subscriptionStatus ?? undefined,
      expiresAt: snapshot.subscriptionExpiresAt ?? null,
      changeType: snapshot.subscriptionChangeType ?? null,
    },
    now,
  });
}

export function readWorkspaceOnboardedAt(
  data: Record<string, unknown>,
): string | null {
  const root = data.workspaceOnboardedAt;
  if (typeof root === "string" && root.trim()) {
    const iso = parseIsoDate(root);
    if (iso) return iso.toISOString();
  }
  if (root && typeof root === "object" && "toDate" in root) {
    try {
      return (root as { toDate: () => Date }).toDate().toISOString();
    } catch {
      /* ignore */
    }
  }
  const uiConfig = data.uiConfig;
  if (uiConfig && typeof uiConfig === "object") {
    const nested = (uiConfig as Record<string, unknown>).workspaceOnboardedAt;
    if (typeof nested === "string" && nested.trim()) {
      const iso = parseIsoDate(nested);
      if (iso) return iso.toISOString();
    }
    if (nested && typeof nested === "object" && "toDate" in nested) {
      try {
        return (nested as { toDate: () => Date }).toDate().toISOString();
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}
