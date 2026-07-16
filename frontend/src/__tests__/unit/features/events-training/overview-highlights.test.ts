import { describe, expect, it } from "vitest";
import {
  pickFeaturedBlogs,
  pickFeaturedStories,
  pickOverviewWebinars,
  pickRecentByCategory,
  pickRecentStoriesAndBlogs,
} from "@/features/events-training/lib/overview-highlights";
import type {
  TrainingVideoRecord,
  WebinarRecord,
  WrsBlogRecord,
} from "@/features/events-training/lib/events-training-types";

function webinar(
  partial: Partial<WebinarRecord> & Pick<WebinarRecord, "id" | "name">,
): WebinarRecord {
  return {
    description: "",
    tags: [],
    speaker: "",
    host: "",
    startsAt: null,
    endsAt: null,
    timezone: "Asia/Manila",
    posterUrl: null,
    status: "published",
    visibility: "private",
    priceCents: 0,
    currency: "PHP",
    allowedPlanCodes: [],
    allowAllMembers: true,
    capacity: null,
    registrationCount: 0,
    joinLink: null,
    linkedVideoId: null,
    certificationEnabled: false,
    archivedAt: null,
    ...partial,
  };
}

function video(
  partial: Partial<TrainingVideoRecord> &
    Pick<TrainingVideoRecord, "id" | "name" | "category">,
): TrainingVideoRecord {
  return {
    description: "",
    recordedAt: null,
    status: "published",
    subcategory: null,
    appId: null,
    appPages: [],
    webinarEventId: null,
    playbackProvider: "youtube",
    playbackUrl: "https://youtu.be/x",
    playbackId: null,
    thumbnailUrl: null,
    featured: false,
    sortOrder: 0,
    visibility: "public",
    priceCents: 0,
    currency: "PHP",
    allowedPlanCodes: [],
    allowAllMembers: false,
    certificationEnabled: false,
    archivedAt: null,
    tags: [],
    ...partial,
  };
}

function blog(
  partial: Partial<WrsBlogRecord> & Pick<WrsBlogRecord, "id" | "title">,
): WrsBlogRecord {
  return {
    slug: partial.id,
    excerpt: "",
    body: "",
    heroImageUrl: null,
    status: "published",
    publishedAt: null,
    archivedAt: null,
    tags: [],
    allowAnonymousComments: true,
    ...partial,
  };
}

describe("overview-highlights", () => {
  const now = Date.parse("2026-07-15T12:00:00.000Z");

  it("picks ongoing then upcoming webinars", () => {
    const rows = pickOverviewWebinars(
      [
        webinar({
          id: "up-2",
          name: "Later",
          startsAt: "2026-07-20T10:00:00.000Z",
        }),
        webinar({
          id: "live",
          name: "Live now",
          startsAt: "2026-07-15T10:00:00.000Z",
          endsAt: "2026-07-15T14:00:00.000Z",
        }),
        webinar({
          id: "up-1",
          name: "Soon",
          startsAt: "2026-07-16T10:00:00.000Z",
        }),
        webinar({
          id: "done",
          name: "Done",
          status: "completed",
          startsAt: "2026-07-10T10:00:00.000Z",
        }),
      ],
      3,
      now,
    );
    expect(rows.map((row) => row.webinar.id)).toEqual(["live", "up-1", "up-2"]);
    expect(rows[0]?.lane).toBe("ongoing");
  });

  it("picks featured stories and blogs", () => {
    expect(
      pickFeaturedStories([
        video({
          id: "s1",
          name: "A",
          category: "wrs_stories",
          featured: true,
          recordedAt: "2026-07-01",
        }),
        video({
          id: "s2",
          name: "B",
          category: "wrs_stories",
          featured: false,
        }),
        video({
          id: "s3",
          name: "C",
          category: "wrs_stories",
          featured: true,
          recordedAt: "2026-07-10",
        }),
      ]).map((row) => row.id),
    ).toEqual(["s3", "s1"]);

    expect(
      pickFeaturedBlogs([
        blog({
          id: "b1",
          title: "Old",
          featured: true,
          publishedAt: "2026-01-01",
        }),
        blog({
          id: "b2",
          title: "New",
          featured: true,
          publishedAt: "2026-07-01",
        }),
        blog({ id: "b3", title: "Skip", featured: false }),
      ]).map((row) => row.id),
    ).toEqual(["b2", "b1"]);
  });

  it("picks most recent tutorials and recordings", () => {
    const videos = [
      video({
        id: "t1",
        name: "Tut old",
        category: "tutorial",
        recordedAt: "2026-01-01",
      }),
      video({
        id: "t2",
        name: "Tut new",
        category: "tutorial",
        recordedAt: "2026-07-01",
      }),
      video({
        id: "r1",
        name: "Rec",
        category: "webinar",
        recordedAt: "2026-06-01",
      }),
    ];
    expect(pickRecentByCategory(videos, "tutorial").map((r) => r.id)).toEqual([
      "t2",
      "t1",
    ]);
    expect(pickRecentByCategory(videos, "webinar").map((r) => r.id)).toEqual([
      "r1",
    ]);
  });

  it("picks top recent stories and articles combined", () => {
    const rows = pickRecentStoriesAndBlogs(
      [
        video({
          id: "s1",
          name: "Story old",
          category: "wrs_stories",
          recordedAt: "2026-02-01",
        }),
        video({
          id: "s2",
          name: "Story new",
          category: "wrs_stories",
          recordedAt: "2026-07-05",
        }),
      ],
      [
        blog({
          id: "b1",
          title: "Article mid",
          publishedAt: "2026-06-01",
        }),
        blog({
          id: "b2",
          title: "Archived",
          status: "archived",
          publishedAt: "2026-08-01",
        }),
      ],
      3,
    );
    expect(
      rows.map((row) =>
        row.kind === "story" ? `story:${row.item.id}` : `blog:${row.item.id}`,
      ),
    ).toEqual(["story:s2", "blog:b1", "story:s1"]);
  });
});
