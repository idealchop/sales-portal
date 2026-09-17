import { describe, expect, it } from "vitest";
import {
  formatOverallRatingLabel,
  formatRecommendRateLabel,
  formatFeedbackExposureLabel,
  isPendingWebinarFeedback,
} from "@/features/events-training/lib/webinar-feedback-display";

describe("webinar feedback display", () => {
  it("formats overall ratings and recommend rate", () => {
    expect(formatOverallRatingLabel(undefined)).toBe("No ratings yet");
    expect(
      formatOverallRatingLabel({ count: 1, averageRating: 5 }),
    ).toBe("5.0 · 1 rating");
    expect(
      formatOverallRatingLabel({ count: 12, averageRating: 4.6 }),
    ).toBe("4.6 · 12 ratings");
    expect(
      formatRecommendRateLabel({ count: 12, recommendRate: 0.667 }),
    ).toBe("67% recommend");
    expect(formatRecommendRateLabel({ count: 0, recommendRate: null })).toBe(
      "No recommendations yet",
    );
  });

  it("labels public exposure for moderation", () => {
    expect(formatFeedbackExposureLabel("pending")).toBe("Needs review");
    expect(formatFeedbackExposureLabel("visible")).toBe("Shown on SmartRefill");
    expect(formatFeedbackExposureLabel("hidden")).toBe("Hidden from page");
    expect(isPendingWebinarFeedback("pending")).toBe(true);
    expect(isPendingWebinarFeedback("visible")).toBe(false);
  });
});
