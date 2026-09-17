import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../config/firebase-admin", () => ({
  db: {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
          limit: () => ({ get: async () => ({ docs: [] }) }),
        }),
      }),
    }),
  },
}));

import {
  emptyWebinarFeedbackSummary,
  mapWebinarFeedbackDoc,
  summarizeWebinarFeedback,
} from "../../../../services/events-training/webinar-feedback-service";

describe("summarizeWebinarFeedback", () => {
  it("returns empty summary when there are no ratings", () => {
    expect(summarizeWebinarFeedback([])).toEqual(emptyWebinarFeedbackSummary());
  });

  it("averages ratings and recommend rate", () => {
    const summary = summarizeWebinarFeedback([
      { rating: 5, recommend: true },
      { rating: 4, recommend: true },
      { rating: 3, recommend: false },
    ]);
    expect(summary.count).toBe(3);
    expect(summary.averageRating).toBe(4);
    expect(summary.recommendCount).toBe(2);
    expect(summary.recommendRate).toBe(0.667);
    expect(summary.ratingCounts).toEqual([0, 0, 1, 1, 1]);
  });
});

describe("mapWebinarFeedbackDoc", () => {
  it("maps a submitted rating and skips invalid ratings", () => {
    const mapped = mapWebinarFeedbackDoc("fb_1", {
      eventId: "evt_1",
      eventName: "Part 2",
      email: "guest@example.com",
      displayName: "Guest",
      rating: 5,
      feedback: "Great session",
      recommend: true,
      recommendation: "Tell station owners",
      source: "webinar-email-token",
    });
    expect(mapped).toMatchObject({
      id: "fb_1",
      eventId: "evt_1",
      rating: 5,
      feedback: "Great session",
      recommend: true,
      status: "pending",
    });
    expect(mapWebinarFeedbackDoc("fb_2", { eventId: "evt_1", rating: 0 })).toBeNull();
    expect(mapWebinarFeedbackDoc("fb_3", { rating: 4 })).toBeNull();
  });

  it("treats missing status as pending until staff approve it", () => {
    expect(
      mapWebinarFeedbackDoc("fb_4", {
        eventId: "evt_1",
        rating: 4,
        status: "visible",
      })?.status,
    ).toBe("visible");
  });
});
