import type {
  WebinarFeedbackStatus,
  WebinarFeedbackSummary,
} from "./events-training-types";

export const EMPTY_WEBINAR_FEEDBACK_SUMMARY: WebinarFeedbackSummary = {
  count: 0,
  averageRating: null,
  recommendCount: 0,
  recommendRate: null,
  ratingCounts: [0, 0, 0, 0, 0],
};

export function formatOverallRatingLabel(
  summary: Pick<WebinarFeedbackSummary, "count" | "averageRating"> | undefined,
): string {
  if (!summary?.count || summary.averageRating == null) return "No ratings yet";
  const noun = summary.count === 1 ? "rating" : "ratings";
  return `${summary.averageRating.toFixed(1)} · ${summary.count} ${noun}`;
}

export function formatRecommendRateLabel(
  summary: Pick<WebinarFeedbackSummary, "count" | "recommendRate"> | undefined,
): string {
  if (!summary?.count || summary.recommendRate == null) {
    return "No recommendations yet";
  }
  return `${Math.round(summary.recommendRate * 100)}% recommend`;
}

export function formatFeedbackExposureLabel(
  status: WebinarFeedbackStatus | undefined,
): string {
  if (status === "visible") return "Shown on SmartRefill";
  if (status === "hidden") return "Hidden from page";
  return "Needs review";
}

export function isPendingWebinarFeedback(
  status: WebinarFeedbackStatus | undefined,
): boolean {
  return status !== "visible" && status !== "hidden";
}
