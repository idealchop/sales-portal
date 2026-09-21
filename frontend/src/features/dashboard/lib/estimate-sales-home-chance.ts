import type { SalesHomeIntent } from "@/features/dashboard/lib/build-sales-home-focus";

export type SalesHomeChanceKind = "onboard" | "return" | "continue";

export type SalesHomeChance = {
  percent: number;
  kind: SalesHomeChanceKind;
  label: string;
  why: string;
};

export type SalesHomeChanceInput = {
  intent: SalesHomeIntent;
  stage?: string;
  assigned?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
  neverContacted?: boolean;
  contactedThisWeek?: boolean;
  attendedDemo?: boolean;
  stallReason?: string;
  warmAttempts?: number;
  followUpOverdue?: boolean;
  trialDays?: number | null;
  isGrace?: boolean;
  gettingStarted?: number;
  activityDays?: number;
  isActive?: boolean;
  daysSinceContact?: number | null;
  daysSinceLogin?: number | null;
  referred?: boolean;
};

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Heuristic chance they onboard / come back / stay.
 * Not a model — typical refill-station follow-up ranges, clamped in 5% steps.
 */
export function estimateSalesHomeChance(
  input: SalesHomeChanceInput,
): SalesHomeChance {
  const kind = chanceKind(input);
  const { score, why } = scoreChance(input, kind);
  return {
    percent: roundChance(score),
    kind,
    label: chanceLabel(kind),
    why,
  };
}

export function daysSinceIso(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round((nowMs - ms) / MS_DAY));
}

function chanceKind(input: SalesHomeChanceInput): SalesHomeChanceKind {
  if (input.intent === "quiet" || input.isGrace) return "return";
  if (input.intent === "plan_risk") return "return";
  if (input.intent === "trial") {
    return input.trialDays !== null && input.trialDays !== undefined && input.trialDays < 0 ?
      "return"
    : "continue";
  }
  if (input.stage === "onboarded") return "continue";
  if (input.intent === "setup" && input.stage === "registered") return "onboard";
  if (
    input.intent === "hello" ||
    input.intent === "close_deal" ||
    input.intent === "referred"
  ) {
    return "onboard";
  }
  if (input.intent === "setup") return "continue";
  return "onboard";
}

function chanceLabel(kind: SalesHomeChanceKind): string {
  if (kind === "onboard") return "Chance they onboard";
  if (kind === "return") return "Chance they come back";
  return "Chance they continue";
}

function scoreChance(
  input: SalesHomeChanceInput,
  kind: SalesHomeChanceKind,
): { score: number; why: string } {
  const drivers: string[] = [];
  let score = 22;

  if (input.intent === "close_deal") {
    score = 48;
    drivers.push("demo already happened");
  } else if (input.intent === "referred") {
    score = 38;
    drivers.push("someone already sent them in");
  } else if (input.intent === "hello" && input.stage === "onboarded") {
    score = 42;
    drivers.push("they are in, but 0 welcomes");
  } else if (input.intent === "hello") {
    score = 20;
    drivers.push("still waiting on a first hello");
  } else if (input.intent === "setup") {
    score = input.stage === "registered" ? 52 : 40;
    drivers.push(
      input.stage === "registered" ?
        "signed up, setup not finished"
      : "in the app with setup still open",
    );
  } else if (input.intent === "trial") {
    const days = input.trialDays;
    if (days === null || days === undefined) {
      score = 36;
      drivers.push("trial is winding down");
    } else if (days < 0) {
      score = 16;
      drivers.push("trial already ended");
    } else if (days === 0) {
      score = 24;
      drivers.push("last day of trial");
    } else if (days === 1) {
      score = 34;
      drivers.push("1 day of trial left");
    } else {
      score = 46;
      drivers.push(`${days} days of trial left`);
    }
  } else if (input.intent === "plan_risk" || input.isGrace) {
    score = input.isGrace ? 22 : 38;
    drivers.push(input.isGrace ? "plan already lapsed" : "plan ending this week");
  } else if (input.intent === "quiet") {
    score = 26;
    drivers.push("they went quiet");
  }

  if (input.attendedDemo && input.intent !== "close_deal") {
    score += 10;
    drivers.push("they sat through a demo");
  }
  if (input.referred && input.intent !== "referred") {
    score += 8;
  }
  if (input.assigned) {
    score += 6;
    drivers.push("someone owns the follow-up");
  }
  if (input.hasEmail) score += 3;
  if (input.hasPhone) score += 2;
  if (input.neverContacted && kind === "onboard") {
    score -= 6;
  }
  if (input.contactedThisWeek) {
    score += 10;
    drivers.push("we talked this week");
  }
  if ((input.daysSinceContact ?? 0) >= 14) {
    score -= 10;
    drivers.push("last talk was 2+ weeks ago");
  } else if ((input.daysSinceContact ?? 0) >= 8) {
    score -= 6;
  }
  if ((input.warmAttempts ?? 0) >= 3) {
    score -= 10;
    drivers.push("several attempts already");
  } else if ((input.warmAttempts ?? 0) >= 2) {
    score -= 6;
  }
  if (input.followUpOverdue) score -= 5;
  const stall = (input.stallReason || "").toLowerCase();
  if (stall.includes("budget") || stall.includes("price")) {
    score -= 8;
    drivers.push("budget is the stall");
  } else if (stall.includes("no response") || stall.includes("ghost")) {
    score -= 10;
  }
  if (input.isActive === false) score -= 8;
  if ((input.gettingStarted ?? 0) >= 3) score += 8;
  else if ((input.gettingStarted ?? 0) >= 1) score += 4;
  if ((input.activityDays ?? 0) >= 3) score += 6;
  if ((input.daysSinceLogin ?? 0) >= 14) {
    score -= 10;
    drivers.push("no sign-in for 2+ weeks");
  } else if ((input.daysSinceLogin ?? 0) >= 7) {
    score -= 5;
  }

  const unique = [...new Set(drivers)];
  return {
    score,
    why: unique.slice(0, 2).join(" · ") || "Based on where they are now",
  };
}

function roundChance(score: number): number {
  return Math.min(80, Math.max(10, Math.round(score / 5) * 5));
}
