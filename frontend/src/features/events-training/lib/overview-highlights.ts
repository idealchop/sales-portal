import type {
  TrainingVideoRecord,
  WebinarRecord,
  WrsBlogRecord,
} from "./events-training-types";

export type OverviewWebinarLane = "ongoing" | "upcoming";

export type OverviewWebinarHighlight = {
  webinar: WebinarRecord;
  lane: OverviewWebinarLane;
};

const INACTIVE_WEBINAR = new Set(["draft", "cancelled", "archived", "completed"]);

function parseTs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? ts : null;
}

export function classifyWebinarLane(
  webinar: WebinarRecord,
  nowMs = Date.now(),
): OverviewWebinarLane | null {
  if (INACTIVE_WEBINAR.has(webinar.status)) return null;
  const start = parseTs(webinar.startsAt);
  if (start == null) return null;
  const end = parseTs(webinar.endsAt);

  if (start <= nowMs && (end == null || end >= nowMs)) return "ongoing";
  if (start > nowMs) return "upcoming";
  return null;
}

/** Top ongoing + upcoming webinars (ongoing first), capped. */
export function pickOverviewWebinars(
  webinars: WebinarRecord[],
  limit = 3,
  nowMs = Date.now(),
): OverviewWebinarHighlight[] {
  const ongoing: OverviewWebinarHighlight[] = [];
  const upcoming: OverviewWebinarHighlight[] = [];

  for (const webinar of webinars) {
    const lane = classifyWebinarLane(webinar, nowMs);
    if (lane === "ongoing") ongoing.push({ webinar, lane });
    if (lane === "upcoming") upcoming.push({ webinar, lane });
  }

  ongoing.sort(
    (a, b) =>
      (parseTs(a.webinar.startsAt) ?? 0) - (parseTs(b.webinar.startsAt) ?? 0),
  );
  upcoming.sort(
    (a, b) =>
      (parseTs(a.webinar.startsAt) ?? 0) - (parseTs(b.webinar.startsAt) ?? 0),
  );

  return [...ongoing, ...upcoming].slice(0, limit);
}

export function pickFeaturedStories(
  videos: TrainingVideoRecord[],
  limit = 3,
): TrainingVideoRecord[] {
  return [...videos]
    .filter(
      (item) =>
        item.category === "wrs_stories" &&
        item.featured === true &&
        item.status !== "archived",
    )
    .sort((a, b) => {
      const byStatus =
        Number(b.status === "published") - Number(a.status === "published");
      if (byStatus !== 0) return byStatus;
      return (b.recordedAt ?? "").localeCompare(a.recordedAt ?? "");
    })
    .slice(0, limit);
}

export function pickFeaturedBlogs(
  blogs: WrsBlogRecord[],
  limit = 3,
): WrsBlogRecord[] {
  return [...blogs]
    .filter(
      (item) => item.featured === true && item.status !== "archived",
    )
    .sort((a, b) => {
      const byStatus =
        Number(b.status === "published") - Number(a.status === "published");
      if (byStatus !== 0) return byStatus;
      return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    })
    .slice(0, limit);
}

export function pickRecentByCategory(
  videos: TrainingVideoRecord[],
  category: TrainingVideoRecord["category"],
  limit = 3,
): TrainingVideoRecord[] {
  return [...videos]
    .filter(
      (item) => item.category === category && item.status !== "archived",
    )
    .sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""))
    .slice(0, limit);
}

export type RecentStoryOrBlog =
  | { kind: "story"; item: TrainingVideoRecord; at: string }
  | { kind: "blog"; item: WrsBlogRecord; at: string };

/** Top N most recent stories and articles combined. */
export function pickRecentStoriesAndBlogs(
  videos: TrainingVideoRecord[],
  blogs: WrsBlogRecord[],
  limit = 3,
): RecentStoryOrBlog[] {
  const storyRows: RecentStoryOrBlog[] = videos
    .filter(
      (item) =>
        item.category === "wrs_stories" && item.status !== "archived",
    )
    .map((item) => ({
      kind: "story" as const,
      item,
      at: item.recordedAt ?? "",
    }));

  const blogRows: RecentStoryOrBlog[] = blogs
    .filter((item) => item.status !== "archived")
    .map((item) => ({
      kind: "blog" as const,
      item,
      at: item.publishedAt ?? "",
    }));

  return [...storyRows, ...blogRows]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
