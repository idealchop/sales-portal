import { toIsoString } from "../sales-serializer";
import {
  purchasesCollection,
  registrationsCollection,
  schedulesCollection,
  videosCollection,
  webinarsCollection,
} from "./events-training-db";

export type AnalyticsDayPoint = {
  date: string;
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  cancelled: number;
};

export type AnalyticsRevenueDayPoint = {
  date: string;
  count: number;
  revenueCents: number;
};

export type AnalyticsNamedCount = {
  key: string;
  label: string;
  count: number;
};

/** Named content row for leaderboards (videos, webinars). */
export type AnalyticsContentRank = {
  key: string;
  label: string;
  count: number;
  /** Category / status chip, e.g. Story, Tutorial, Recording. */
  category?: string;
};

export type EventsTrainingAnalyticsSummary = {
  periodDays: number;
  webinars: {
    total: number;
    published: number;
    archived: number;
    draft: number;
    completed: number;
    cancelled: number;
    registrations: number;
    pending: number;
    accepted: number;
    declined: number;
    cancelledRegs: number;
  };
  videos: {
    total: number;
    published: number;
    archived: number;
    draft: number;
    totalViews: number;
    totalPurchases: number;
    totalComments: number;
    totalQuestions: number;
    byCategory: AnalyticsNamedCount[];
  };
  revenue: {
    paidPurchaseCount: number;
    revenueCents: number;
    currency: string;
  };
  engagement: {
    scheduleCount: number;
    enabledSchedules: number;
  };
  series: {
    registrationsDaily: AnalyticsDayPoint[];
    revenueDaily: AnalyticsRevenueDayPoint[];
  };
  breakdowns: {
    registrationStatus: AnalyticsNamedCount[];
    webinarStatus: AnalyticsNamedCount[];
    videoStatus: AnalyticsNamedCount[];
    videoEngagement: AnalyticsNamedCount[];
  };
  rankings: {
    topVideosByViews: AnalyticsContentRank[];
    topVideosByComments: AnalyticsContentRank[];
    topVideosByPurchases: AnalyticsContentRank[];
    topWebinarsByRegistrations: AnalyticsContentRank[];
  };
};

export function clampPeriodDays(raw: unknown, fallback = 30): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(90, Math.max(1, Math.round(n)));
}

function withinDays(iso: string | null, days: number): boolean {
  if (!iso) return true;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return true;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return ts >= cutoff;
}

/** UTC calendar day keys covering the last `days` days (oldest → newest). */
export function buildUtcDayKeys(days: number, now = new Date()): string[] {
  const safeDays = clampPeriodDays(days);
  const keys: string[] = [];
  const end = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  for (let i = safeDays - 1; i >= 0; i -= 1) {
    keys.push(new Date(end - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }
  return keys;
}

export function isoToUtcDayKey(iso: string | null): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toISOString().slice(0, 10);
}

function statusLabel(status: string): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function videoCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    wrs_stories: "Story",
    webinar: "Recording",
    tutorial: "Tutorial",
  };
  return labels[category] ?? statusLabel(category || "other");
}

function countByKey(
  rows: Array<{ key: string; label?: string }>,
): AnalyticsNamedCount[] {
  const map = new Map<string, AnalyticsNamedCount>();
  for (const row of rows) {
    const existing = map.get(row.key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(row.key, {
        key: row.key,
        label: row.label ?? statusLabel(row.key),
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Rank named items by count (zeros excluded), capped. Exported for unit tests. */
export function rankContentByCount(
  rows: Array<{ key: string; label: string; count: number; category?: string }>,
  limit = 5,
): AnalyticsContentRank[] {
  return [...rows]
    .filter((row) => row.count > 0 && row.key)
    .sort(
      (a, b) =>
        b.count - a.count || a.label.localeCompare(b.label),
    )
    .slice(0, Math.max(1, limit))
    .map((row) => ({
      key: row.key,
      label: row.label.trim() || "Untitled",
      count: row.count,
      ...(row.category ? { category: row.category } : {}),
    }));
}

export async function getEventsTrainingAnalytics(
  periodDays = 30,
): Promise<EventsTrainingAnalyticsSummary> {
  const days = clampPeriodDays(periodDays);
  const dayKeys = buildUtcDayKeys(days);

  const [eventsSnap, videosSnap, regsSnap, purchasesSnap, schedulesSnap] =
    await Promise.all([
      webinarsCollection().get(),
      videosCollection().get(),
      registrationsCollection().get(),
      purchasesCollection().where("status", "==", "paid").get(),
      schedulesCollection().get(),
    ]);

  type DocRow = { id: string } & Record<string, unknown>;
  const events: DocRow[] = eventsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
  const videos: DocRow[] = videosSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
  const regs = regsSnap.docs.map((d) => {
    const data = d.data();
    return {
      eventId: String(data.eventId || ""),
      status: String(data.status || "unknown"),
      createdAt: toIsoString(data.createdAt),
    };
  });
  const purchases = purchasesSnap.docs.map((d) => {
    const data = d.data();
    return {
      videoId: String(data.videoId || data.contentId || ""),
      priceCents: Number(data.priceCents) || 0,
      paidAt: toIsoString(data.paidAt),
      createdAt: toIsoString(data.createdAt),
    };
  });
  const schedules = schedulesSnap.docs.map((d) => d.data());

  const recentRegs = regs.filter((r) => withinDays(r.createdAt, days));
  const recentPurchases = purchases.filter((p) =>
    withinDays(p.paidAt || p.createdAt, days),
  );

  const registrationsDaily: AnalyticsDayPoint[] = dayKeys.map((date) => ({
    date,
    total: 0,
    pending: 0,
    accepted: 0,
    declined: 0,
    cancelled: 0,
  }));
  const regIndex = new Map(registrationsDaily.map((row) => [row.date, row]));
  for (const reg of recentRegs) {
    const key = isoToUtcDayKey(reg.createdAt);
    if (!key) continue;
    const bucket = regIndex.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (reg.status === "pending") bucket.pending += 1;
    else if (reg.status === "accepted") bucket.accepted += 1;
    else if (reg.status === "declined") bucket.declined += 1;
    else if (reg.status === "cancelled") bucket.cancelled += 1;
  }

  const revenueDaily: AnalyticsRevenueDayPoint[] = dayKeys.map((date) => ({
    date,
    count: 0,
    revenueCents: 0,
  }));
  const revenueIndex = new Map(revenueDaily.map((row) => [row.date, row]));
  for (const purchase of recentPurchases) {
    const key = isoToUtcDayKey(purchase.paidAt || purchase.createdAt);
    if (!key) continue;
    const bucket = revenueIndex.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.revenueCents += Number(purchase.priceCents) || 0;
  }

  const videoCategories = countByKey(
    videos.map((v) => {
      const key = String(v.category || "other");
      const labels: Record<string, string> = {
        wrs_stories: "Stories",
        webinar: "Recordings",
        tutorial: "Tutorials",
      };
      return { key, label: labels[key] ?? statusLabel(key) };
    }),
  );

  const totalViews = videos.reduce((sum, v) => sum + (Number(v.viewCount) || 0), 0);
  const totalComments = videos.reduce(
    (sum, v) => sum + (Number(v.commentCount) || 0),
    0,
  );
  const totalQuestions = videos.reduce(
    (sum, v) => sum + (Number(v.questionCount) || 0),
    0,
  );
  const totalPurchases = videos.reduce(
    (sum, v) => sum + (Number(v.purchaseCount) || 0),
    0,
  );

  const videoNameById = new Map(
    videos.map((v) => [
      String(v.id),
      String(v.name || "").trim() || "Untitled video",
    ]),
  );
  const videoCategoryById = new Map(
    videos.map((v) => [
      String(v.id),
      videoCategoryLabel(String(v.category || "other")),
    ]),
  );
  const webinarNameById = new Map(
    events.map((e) => [
      String(e.id),
      String(e.name || "").trim() || "Untitled webinar",
    ]),
  );

  const regsByWebinar = new Map<string, number>();
  for (const reg of recentRegs) {
    if (!reg.eventId) continue;
    regsByWebinar.set(reg.eventId, (regsByWebinar.get(reg.eventId) || 0) + 1);
  }

  const purchasesByVideo = new Map<string, number>();
  for (const purchase of recentPurchases) {
    if (!purchase.videoId) continue;
    purchasesByVideo.set(
      purchase.videoId,
      (purchasesByVideo.get(purchase.videoId) || 0) + 1,
    );
  }

  const topVideosByViews = rankContentByCount(
    videos.map((v) => ({
      key: String(v.id),
      label: String(v.name || "").trim() || "Untitled video",
      count: Number(v.viewCount) || 0,
      category: videoCategoryLabel(String(v.category || "other")),
    })),
    5,
  );
  const topVideosByComments = rankContentByCount(
    videos.map((v) => ({
      key: String(v.id),
      label: String(v.name || "").trim() || "Untitled video",
      count: Number(v.commentCount) || 0,
      category: videoCategoryLabel(String(v.category || "other")),
    })),
    5,
  );
  const topVideosByPurchases = rankContentByCount(
    [...purchasesByVideo.entries()].map(([videoId, count]) => ({
      key: videoId,
      label: videoNameById.get(videoId) ?? "Untitled video",
      count,
      category: videoCategoryById.get(videoId),
    })),
    5,
  );
  // Fall back to catalog purchaseCount when period unlocks have no videoId.
  const topVideosByPurchasesResolved =
    topVideosByPurchases.length > 0
      ? topVideosByPurchases
      : rankContentByCount(
          videos.map((v) => ({
            key: String(v.id),
            label: String(v.name || "").trim() || "Untitled video",
            count: Number(v.purchaseCount) || 0,
            category: videoCategoryLabel(String(v.category || "other")),
          })),
          5,
        );

  const topWebinarsByRegistrations = rankContentByCount(
    [...regsByWebinar.entries()].map(([eventId, count]) => ({
      key: eventId,
      label: webinarNameById.get(eventId) ?? "Untitled webinar",
      count,
      category: "Webinar",
    })),
    5,
  );

  return {
    periodDays: days,
    webinars: {
      total: events.length,
      published: events.filter((e) => e.status === "published").length,
      archived: events.filter((e) => e.status === "archived").length,
      draft: events.filter((e) => e.status === "draft").length,
      completed: events.filter((e) => e.status === "completed").length,
      cancelled: events.filter((e) => e.status === "cancelled").length,
      registrations: recentRegs.length,
      pending: recentRegs.filter((r) => r.status === "pending").length,
      accepted: recentRegs.filter((r) => r.status === "accepted").length,
      declined: recentRegs.filter((r) => r.status === "declined").length,
      cancelledRegs: recentRegs.filter((r) => r.status === "cancelled").length,
    },
    videos: {
      total: videos.length,
      published: videos.filter((v) => v.status === "published").length,
      archived: videos.filter((v) => v.status === "archived").length,
      draft: videos.filter((v) => v.status === "draft").length,
      totalViews,
      totalPurchases,
      totalComments,
      totalQuestions,
      byCategory: videoCategories,
    },
    revenue: {
      paidPurchaseCount: recentPurchases.length,
      revenueCents: recentPurchases.reduce(
        (sum, p) => sum + (Number(p.priceCents) || 0),
        0,
      ),
      currency: "PHP",
    },
    engagement: {
      scheduleCount: schedules.length,
      enabledSchedules: schedules.filter((s) => s.enabled === true).length,
    },
    series: {
      registrationsDaily,
      revenueDaily,
    },
    breakdowns: {
      registrationStatus: [
        { key: "pending", label: "Pending", count: recentRegs.filter((r) => r.status === "pending").length },
        { key: "accepted", label: "Accepted", count: recentRegs.filter((r) => r.status === "accepted").length },
        { key: "declined", label: "Declined", count: recentRegs.filter((r) => r.status === "declined").length },
        { key: "cancelled", label: "Cancelled", count: recentRegs.filter((r) => r.status === "cancelled").length },
      ].filter((row) => row.count > 0),
      webinarStatus: countByKey(
        events.map((e) => ({ key: String(e.status || "unknown") })),
      ),
      videoStatus: countByKey(
        videos.map((v) => ({ key: String(v.status || "unknown") })),
      ),
      videoEngagement: [
        { key: "views", label: "Views", count: totalViews },
        { key: "comments", label: "Comments", count: totalComments },
        { key: "questions", label: "Questions", count: totalQuestions },
        { key: "purchases", label: "Unlocks", count: totalPurchases },
      ].filter((row) => row.count > 0),
    },
    rankings: {
      topVideosByViews,
      topVideosByComments,
      topVideosByPurchases: topVideosByPurchasesResolved,
      topWebinarsByRegistrations,
    },
  };
}
