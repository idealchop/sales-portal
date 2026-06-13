import type { BusinessSnapshot } from "./compute-sales-insights";
import {
  classifyHealthForSnapshot,
  isPaymentPending,
  isUpgradeOpportunity,
} from "./compute-sales-insights-helpers";

export type WorkspaceBehaviorProfile = {
  snapshot: BusinessSnapshot;
  ownerLastActiveDay?: string;
  daysSinceOwnerLogin: number | null;
  ownerInactive30d: boolean;
  healthTier: "high" | "medium" | "low";
  churnRiskScore: number;
  growthScore: number;
  churnSignals: string[];
  growthSignals: string[];
};

function daysBetween(dayKey: string, todayKey: string): number {
  const start = new Date(`${dayKey}T00:00:00.000Z`).getTime();
  const end = new Date(`${todayKey}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}

export function buildWorkspaceBehaviorProfiles(input: {
  businesses: BusinessSnapshot[];
  ownerLastActive: Map<string, string>;
  activeWindowStartKey: string;
  todayKey: string;
  soloOwnerBusinessIds: Set<string>;
}): WorkspaceBehaviorProfile[] {
  const { businesses, ownerLastActive, activeWindowStartKey, todayKey, soloOwnerBusinessIds } =
    input;

  return businesses.map((snapshot) => {
    const ownerLastActiveDay =
      snapshot.ownerId ? ownerLastActive.get(snapshot.ownerId) : undefined;
    const daysSinceOwnerLogin =
      ownerLastActiveDay ?
        daysBetween(ownerLastActiveDay, todayKey) :
        null;
    const ownerInactive30d =
      !ownerLastActiveDay || ownerLastActiveDay < activeWindowStartKey;
    const healthTier = classifyHealthForSnapshot(snapshot);

    const churnSignals: string[] = [];
    const growthSignals: string[] = [];
    let churnRiskScore = 0;
    let growthScore = 0;

    if (isPaymentPending(snapshot.paymentStatus)) {
      churnRiskScore += 45;
      churnSignals.push("Payment pending");
    }

    if (snapshot.customers > 0 && snapshot.transactionsLast30Days === 0) {
      churnRiskScore += 30;
      churnSignals.push("0 tx in 30d");
    }

    if (ownerInactive30d && snapshot.onboardingComplete) {
      churnRiskScore += 20;
      churnSignals.push("Owner inactive 30d");
    }

    if (healthTier === "low") {
      churnRiskScore += 15;
      churnSignals.push("Low health");
    }

    if (
      snapshot.onboardingComplete &&
      snapshot.gettingStartedCompleted < 3
    ) {
      churnRiskScore += 10;
      churnSignals.push("Low adoption");
    }

    if (isUpgradeOpportunity(snapshot)) {
      growthScore += 35;
      growthSignals.push("Starter upsell");
    }

    if (soloOwnerBusinessIds.has(snapshot.id) && snapshot.onboardingComplete) {
      growthScore += 25;
      growthSignals.push("Solo owner — add seats");
    }

    if (!snapshot.onboardingComplete) {
      growthScore += 20;
      growthSignals.push("Onboarding open");
    }

    if (
      snapshot.onboardingComplete &&
      snapshot.customers === 0 &&
      snapshot.gettingStartedCompleted >= 3
    ) {
      growthScore += 18;
      growthSignals.push("0 customers");
    }

    if (
      snapshot.onboardingComplete &&
      snapshot.gettingStartedCompleted >= 3 &&
      snapshot.gettingStartedCompleted < 7
    ) {
      growthScore += 12;
      growthSignals.push("Mid adoption");
    }

    if (snapshot.transactionsLast30Days >= 20 && healthTier === "high") {
      growthScore += 10;
      growthSignals.push("Strong tx (20+)");
    }

    return {
      snapshot,
      ownerLastActiveDay,
      daysSinceOwnerLogin,
      ownerInactive30d,
      healthTier,
      churnRiskScore,
      growthScore,
      churnSignals,
      growthSignals,
    };
  });
}

export function isChurnRiskProfile(profile: WorkspaceBehaviorProfile): boolean {
  return (
    profile.churnRiskScore >= 35 ||
    isPaymentPending(profile.snapshot.paymentStatus) ||
    (profile.snapshot.customers > 0 &&
      profile.snapshot.transactionsLast30Days === 0)
  );
}

export function isGrowthOpportunityProfile(
  profile: WorkspaceBehaviorProfile,
): boolean {
  return profile.growthScore >= 30;
}

export function isBehavioralReengagementProfile(
  profile: WorkspaceBehaviorProfile,
): boolean {
  return (
    (profile.ownerInactive30d || profile.snapshot.gettingStartedCompleted < 3) &&
    profile.snapshot.onboardingComplete &&
    !isPaymentPending(profile.snapshot.paymentStatus)
  );
}
