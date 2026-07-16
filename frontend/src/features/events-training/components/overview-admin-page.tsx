"use client";

import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type ComponentType,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clapperboard,
  GraduationCap,
  Loader2,
  MessageSquareWarning,
  PlayCircle,
  Star,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  acceptRegistration,
  declineRegistration,
  fetchEventsTrainingAnalytics,
  fetchModerationInbox,
  fetchRegistrations,
  fetchTrainingVideos,
  fetchWebinars,
  fetchWrsBlogs,
  moderateBlogComment,
  moderateVideoComment,
  updateVideoQuestion,
} from "../lib/events-training-api";
import type {
  EventsTrainingAnalyticsSummary,
  ModerationCommentItem,
  ModerationInbox,
  ModerationQuestionItem,
  RegistrationRecord,
  TrainingVideoRecord,
  WebinarRecord,
  WrsBlogRecord,
} from "../lib/events-training-types";
import {
  pickFeaturedBlogs,
  pickFeaturedStories,
  pickOverviewWebinars,
  pickRecentByCategory,
  pickRecentStoriesAndBlogs,
} from "../lib/overview-highlights";
import { inputClassName, textareaClassName } from "../lib/form-styles";
import { EventsTrainingAnalyticsPanel } from "./events-training-analytics-panel";

const TODO_LIMIT = 6;

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function OverviewAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [periodDays, setPeriodDays] = useState(30);
  const [analytics, setAnalytics] =
    useState<EventsTrainingAnalyticsSummary | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [webinars, setWebinars] = useState<WebinarRecord[]>([]);
  const [videos, setVideos] = useState<TrainingVideoRecord[]>([]);
  const [blogs, setBlogs] = useState<WrsBlogRecord[]>([]);
  const [inbox, setInbox] = useState<ModerationInbox | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const webinarById = useMemo(() => {
    const map = new Map<string, WebinarRecord>();
    for (const webinar of webinars) map.set(webinar.id, webinar);
    return map;
  }, [webinars]);

  const liveWebinars = useMemo(
    () => pickOverviewWebinars(webinars, 3),
    [webinars],
  );
  const featuredStories = useMemo(
    () => pickFeaturedStories(videos, 3),
    [videos],
  );
  const featuredArticles = useMemo(() => pickFeaturedBlogs(blogs, 3), [blogs]);
  const recentStoriesAndArticles = useMemo(
    () => pickRecentStoriesAndBlogs(videos, blogs, 3),
    [videos, blogs],
  );
  const recentTutorials = useMemo(
    () => pickRecentByCategory(videos, "tutorial", 3),
    [videos],
  );
  const recentRecordings = useMemo(
    () => pickRecentByCategory(videos, "webinar", 3),
    [videos],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, regs, events, moderation, allVideos, allBlogs] =
        await Promise.all([
          fetchEventsTrainingAnalytics(periodDays),
          fetchRegistrations({ status: "pending" }),
          fetchWebinars(),
          fetchModerationInbox(),
          fetchTrainingVideos(),
          fetchWrsBlogs(),
        ]);
      setAnalytics(analyticsData);
      setRegistrations(regs);
      setWebinars(events);
      setInbox(moderation);
      setVideos(allVideos);
      setBlogs(allBlogs);
    } catch {
      setError("Unable to load the overview.");
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin" && profile?.role !== "manager") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [load, profile?.role, profileLoading, router]);

  const pendingRegs = useMemo(
    () =>
      [...registrations]
        .filter((item) => item.status === "pending")
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [registrations],
  );

  const moderationTodos = useMemo(() => {
    const questions = (inbox?.questions ?? [])
      .filter((item) => item.status === "open")
      .map((item) => ({ kind: "question" as const, item }));
    const comments = (inbox?.comments ?? [])
      .filter((item) => item.status === "flagged")
      .map((item) => ({ kind: "comment" as const, item }));
    return [...questions, ...comments].sort((a, b) =>
      (b.item.createdAt ?? "").localeCompare(a.item.createdAt ?? ""),
    );
  }, [inbox]);

  async function handleAccept(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await acceptRegistration(id);
      setRegistrations((current) =>
        current.map((row) => (row.id === id ? { ...row, ...updated } : row)),
      );
    } catch {
      setError("Unable to accept registration.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await declineRegistration(id);
      setRegistrations((current) =>
        current.map((row) => (row.id === id ? { ...row, ...updated } : row)),
      );
    } catch {
      setError("Unable to decline registration.");
    } finally {
      setBusyId(null);
    }
  }

  async function submitAnswer(item: ModerationQuestionItem) {
    const key = `${item.contentId}:${item.id}`;
    const answer = (answerDrafts[key] ?? "").trim();
    if (!answer) {
      setError("Answer text is required.");
      return;
    }
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await updateVideoQuestion(item.contentId, item.id, {
        answer,
        status: "answered",
      });
      setInbox((current) => {
        if (!current) return current;
        const questions = current.questions.map((row) =>
          row.id === item.id && row.contentId === item.contentId
            ? {
                ...row,
                ...updated,
                kind: "question" as const,
                contentKind: "video" as const,
                contentId: item.contentId,
                contentTitle: item.contentTitle,
              }
            : row,
        );
        return {
          ...current,
          questions,
          counts: {
            ...current.counts,
            openQuestions: questions.filter((q) => q.status === "open").length,
          },
        };
      });
      setAnswerDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    } catch {
      setError("Unable to answer question.");
    } finally {
      setBusyId(null);
    }
  }

  async function approveComment(item: ModerationCommentItem) {
    setBusyId(item.id);
    setError(null);
    try {
      if (item.contentKind === "blog") {
        await moderateBlogComment(item.contentId, item.id, "visible");
      } else {
        await moderateVideoComment(item.contentId, item.id, "visible");
      }
      setInbox((current) => {
        if (!current) return current;
        const comments = current.comments.map((row) =>
          row.id === item.id && row.contentId === item.contentId
            ? { ...row, status: "visible" as const }
            : row,
        );
        return {
          ...current,
          comments,
          counts: {
            ...current.counts,
            flaggedComments: comments.filter((c) => c.status === "flagged")
              .length,
          },
        };
      });
    } catch {
      setError("Unable to approve comment.");
    } finally {
      setBusyId(null);
    }
  }

  const openPending = pendingRegs.filter((row) => row.status === "pending");
  const visibleRegs = openPending.slice(0, TODO_LIMIT);
  const visibleModeration = moderationTodos.slice(0, TODO_LIMIT);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Overview
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Clear to-dos, then review performance.
          </p>
        </div>
        <select
          aria-label="Analytics period"
          className={cn(inputClassName, "w-auto min-w-[9.5rem]")}
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">To do</h3>
          <p className="text-xs text-muted-foreground">
            {openPending.length + moderationTodos.length === 0
              ? "Queues are clear"
              : `${openPending.length + moderationTodos.length} waiting`}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/80 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-700" />
                <h4 className="text-sm font-semibold">Registrations</h4>
                {openPending.length > 0 ? (
                  <Badge className="bg-amber-500 text-white">
                    {openPending.length}
                  </Badge>
                ) : null}
              </div>
              <Link
                href="/events-training/registrations"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
              >
                Full queue
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-zinc-100">
              {loading ? (
                <p className="px-4 py-8 text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : null}
              {!loading && visibleRegs.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground">
                  No pending sign-ups.
                </p>
              ) : null}
              {visibleRegs.map((item) => {
                const webinar = webinarById.get(item.eventId);
                const busy = busyId === item.id;
                return (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.email || item.userId || "Unknown member"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {webinar?.name || "Webinar"}
                          {item.createdAt ? ` · ${formatWhen(item.createdAt)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-full px-3"
                          disabled={busy}
                          onClick={() => void handleAccept(item.id)}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full px-3"
                          disabled={busy}
                          onClick={() => void handleDecline(item.id)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {openPending.length > TODO_LIMIT ? (
                <div className="px-4 py-2.5 text-xs text-muted-foreground">
                  +{openPending.length - TODO_LIMIT} more in the full queue
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4 text-teal-700" />
                <h4 className="text-sm font-semibold">Moderation</h4>
                {moderationTodos.length > 0 ? (
                  <Badge className="bg-rose-500 text-white">
                    {moderationTodos.length}
                  </Badge>
                ) : null}
              </div>
              <Link
                href="/events-training/moderation"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
              >
                Full inbox
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-zinc-100">
              {loading ? (
                <p className="px-4 py-8 text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : null}
              {!loading && visibleModeration.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground">
                  No open questions or flagged comments.
                </p>
              ) : null}
              {visibleModeration.map((entry) => {
                if (entry.kind === "question") {
                  const item = entry.item;
                  const key = `${item.contentId}:${item.id}`;
                  const busy = busyId === item.id;
                  return (
                    <div key={`q-${item.contentId}-${item.id}`} className="space-y-2 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-sky-50 text-sky-900">Question</Badge>
                        <span className="truncate text-xs text-muted-foreground">
                          {item.contentTitle}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{item.text}</p>
                      <textarea
                        className={cn(textareaClassName, "min-h-[72px]")}
                        placeholder="Write a short answer…"
                        value={answerDrafts[key] ?? ""}
                        disabled={busy}
                        onChange={(e) =>
                          setAnswerDrafts((current) => ({
                            ...current,
                            [key]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-full"
                        disabled={busy}
                        onClick={() => void submitAnswer(item)}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Post answer"
                        )}
                      </Button>
                    </div>
                  );
                }

                const item = entry.item;
                const busy = busyId === item.id;
                return (
                  <div
                    key={`c-${item.contentId}-${item.id}`}
                    className="px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className="bg-amber-50 text-amber-950">
                            Flagged
                          </Badge>
                          <span className="truncate text-xs text-muted-foreground">
                            {item.contentTitle}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-foreground">{item.text}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 shrink-0 rounded-full"
                        disabled={busy}
                        onClick={() => void approveComment(item)}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {moderationTodos.length > TODO_LIMIT ? (
                <div className="px-4 py-2.5 text-xs text-muted-foreground">
                  +{moderationTodos.length - TODO_LIMIT} more in moderation
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Highlights</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live webinars, featured content, and recently published training
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <HighlightCard
            title="Live & upcoming webinars"
            href="/events-training/webinars"
            icon={Clapperboard}
            loading={loading}
            empty="No upcoming or ongoing webinars."
          >
            {liveWebinars.map(({ webinar, lane }) => (
              <HighlightRow
                key={webinar.id}
                title={webinar.name}
                meta={
                  formatWhen(webinar.startsAt) ||
                  (webinar.speaker ? webinar.speaker : "Scheduled")
                }
                badge={lane === "ongoing" ? "Ongoing" : "Upcoming"}
                badgeClass={
                  lane === "ongoing"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-sky-50 text-sky-900"
                }
                imageUrl={webinar.posterUrl}
              />
            ))}
          </HighlightCard>

          <HighlightCard
            title="Featured stories"
            href="/events-training/videos"
            icon={PlayCircle}
            loading={loading}
            empty="No featured stories yet."
          >
            {featuredStories.map((item) => (
              <HighlightRow
                key={item.id}
                title={item.name}
                meta={item.status}
                badge="Featured"
                badgeClass="bg-amber-50 text-amber-900"
                imageUrl={item.thumbnailUrl}
                starred
              />
            ))}
          </HighlightCard>

          <HighlightCard
            title="Featured articles"
            href="/events-training/blogs"
            icon={BookOpen}
            loading={loading}
            empty="No featured articles yet."
          >
            {featuredArticles.map((item) => (
              <HighlightRow
                key={item.id}
                title={item.title}
                meta={
                  item.authorName?.trim()
                    ? `${item.authorName} · ${item.status}`
                    : item.status
                }
                badge="Featured"
                badgeClass="bg-amber-50 text-amber-900"
                imageUrl={item.heroImageUrl}
                starred
              />
            ))}
          </HighlightCard>

          <HighlightCard
            title="Recent stories & articles"
            href="/events-training/videos"
            icon={BookOpen}
            loading={loading}
            empty="No stories or articles yet."
          >
            {recentStoriesAndArticles.map((row) =>
              row.kind === "story" ? (
                <HighlightRow
                  key={`story-${row.item.id}`}
                  title={row.item.name}
                  meta={
                    row.at
                      ? formatWhen(row.at) || row.item.status
                      : row.item.status
                  }
                  badge="Story"
                  badgeClass="bg-violet-50 text-violet-900"
                  imageUrl={row.item.thumbnailUrl}
                />
              ) : (
                <HighlightRow
                  key={`blog-${row.item.id}`}
                  title={row.item.title}
                  meta={
                    row.at
                      ? formatWhen(row.at) ||
                        (row.item.authorName?.trim()
                          ? `${row.item.authorName} · ${row.item.status}`
                          : row.item.status)
                      : row.item.authorName?.trim()
                        ? `${row.item.authorName} · ${row.item.status}`
                        : row.item.status
                  }
                  badge="Article"
                  badgeClass="bg-sky-50 text-sky-900"
                  imageUrl={row.item.heroImageUrl}
                />
              ),
            )}
          </HighlightCard>

          <HighlightCard
            title="Recent tutorials"
            href="/events-training/tutorials"
            icon={GraduationCap}
            loading={loading}
            empty="No tutorials yet."
          >
            {recentTutorials.map((item) => (
              <HighlightRow
                key={item.id}
                title={item.name}
                meta={
                  item.recordedAt
                    ? formatWhen(item.recordedAt) || item.status
                    : item.status
                }
                badge={item.status}
                badgeClass="bg-zinc-100 text-zinc-700"
                imageUrl={item.thumbnailUrl}
              />
            ))}
          </HighlightCard>

          <HighlightCard
            title="Recent webinar recordings"
            href="/events-training/videos"
            icon={Clapperboard}
            loading={loading}
            empty="No webinar recordings yet."
          >
            {recentRecordings.map((item) => (
              <HighlightRow
                key={item.id}
                title={item.name}
                meta={
                  item.recordedAt
                    ? formatWhen(item.recordedAt) || item.status
                    : item.status
                }
                badge={item.status}
                badgeClass="bg-zinc-100 text-zinc-700"
                imageUrl={item.thumbnailUrl}
              />
            ))}
          </HighlightCard>
        </div>
      </section>

      <section id="analytics" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Analytics</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Trends and breakdowns for the selected period
            </p>
          </div>
          <Link
            href="/events-training/analytics"
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
          >
            Open full analytics
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <EventsTrainingAnalyticsPanel data={analytics} loading={loading} />
      </section>
    </div>
  );
}

function HighlightCard({
  title,
  href,
  icon: Icon,
  loading,
  empty,
  children,
}: {
  title: string;
  href: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  loading: boolean;
  empty: string;
  children: ReactNode;
}) {
  const hasItems = Children.count(children) > 0;

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-teal-700" />
          <h4 className="truncate text-sm font-semibold">{title}</h4>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="divide-y divide-zinc-100">
        {loading ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {!loading && !hasItems ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">{empty}</p>
        ) : null}
        {!loading ? children : null}
      </div>
    </div>
  );
}

function HighlightRow({
  title,
  meta,
  badge,
  badgeClass,
  imageUrl,
  starred,
}: {
  title: string;
  meta: string;
  badge: string;
  badgeClass: string;
  imageUrl?: string | null;
  starred?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">
            <PlayCircle className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge className={cn("capitalize", badgeClass)}>
            {starred ? (
              <Star className="mr-1 h-3 w-3 fill-amber-500 text-amber-500" />
            ) : null}
            {badge}
          </Badge>
          <span className="truncate text-xs text-muted-foreground">{meta}</span>
        </div>
      </div>
    </div>
  );
}
