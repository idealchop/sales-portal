import type { ChartBusinessContext, DashboardAnalytics } from "@/lib/dashboard/analytics";

/** Same bar as onboarded journey: meaningful setup, not the onboardingComplete flag. */
export const SETUP_COMPLETE_MIN_STEPS = 3;

export function countGettingStartedSteps(
  gettingStarted: Record<string, boolean> | undefined,
): number {
  if (!gettingStarted) return 0;
  return Object.values(gettingStarted).filter(Boolean).length;
}

/**
 * Workspaces that finished enough setup steps (≥3).
 * Avoids the near-100% `onboardingComplete` flag which only means the wizard was dismissed.
 */
export function computeSetupCompletion(
  businesses: ChartBusinessContext[],
): { completed: number; total: number; percent: number } {
  const total = businesses.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = businesses.filter(
    (biz) =>
      countGettingStartedSteps(biz.gettingStarted) >= SETUP_COMPLETE_MIN_STEPS,
  ).length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

/**
 * 30-day login retention: users who signed in recently ÷ all SmartRefill users.
 */
export function computeUserRetention(summary: DashboardAnalytics["summary"]): {
  percent: number;
  activeUsers: number;
  totalUsers: number;
} {
  const activeUsers = summary.activeLoginUsers;
  const totalUsers = summary.smartRefillUsers;
  return {
    activeUsers,
    totalUsers,
    percent:
      totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
  };
}
