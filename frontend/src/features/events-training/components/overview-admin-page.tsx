"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Loader2,
  MessageSquareWarning,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  acceptRegistration,
  declineRegistration,
  fetchModerationInbox,
  fetchRegistrations,
  fetchWebinars,
  moderateBlogComment,
  moderateVideoComment,
  updateVideoQuestion,
} from "../lib/events-training-api";
import type {
  ModerationCommentItem,
  ModerationInbox,
  ModerationQuestionItem,
  RegistrationRecord,
  WebinarRecord,
} from "../lib/events-training-types";
import { pickOverviewWebinars } from "../lib/overview-highlights";
import { textareaClassName } from "../lib/form-styles";
import { EventsTrainingPageHeader } from "./events-training-page-header";

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

function FocusTile({
  label,
  value,
  hint,
  href,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
  tone?: "default" | "warn";
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        tone === "warn"
          ? "rounded-xl border border-amber-200 bg-amber-50/60 p-4 transition hover:border-amber-300"
          : "rounded-xl border border-zinc-200/80 bg-white p-4 transition hover:border-teal-200"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div
          className={
            tone === "warn"
              ? "rounded-lg bg-white p-2 text-amber-700 shadow-sm"
              : "rounded-lg bg-teal-50 p-2 text-teal-700"
          }
        >
          {icon}
        </div>
      </div>
    </Link>
  );
}

export function OverviewAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [webinars, setWebinars] = useState<WebinarRecord[]>([]);
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
    () => pickOverviewWebinars(webinars, 4),
    [webinars],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [regs, events, moderation] = await Promise.all([
        fetchRegistrations({ status: "pending" }),
        fetchWebinars(),
        fetchModerationInbox(),
      ]);
      setRegistrations(regs);
      setWebinars(events);
      setInbox(moderation);
    } catch {
      setError("Unable to load the overview.");
    } finally {
      setLoading(false);
    }
  }, []);

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
                status: "answered" as const,
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
  const waitingCount = openPending.length + moderationTodos.length;

  return (
    <div className="space-y-8">
      <EventsTrainingPageHeader
        eyebrow="Ops · now"
        title="Overview"
        description="Clear sign-ups and moderation first. No Gemini on this page."
        actions={
          <Link
            href="/events-training/analytics"
            className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
          >
            Analytics
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {error ? (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <FocusTile
          label="Pending sign-ups"
          value={loading ? "…" : String(openPending.length)}
          hint={openPending.length > 0 ? "Needs accept / decline" : "Queue clear"}
          href="/events-training/registrations"
          icon={<Users className="h-4 w-4" />}
          tone={openPending.length > 0 ? "warn" : "default"}
        />
        <FocusTile
          label="Moderation"
          value={loading ? "…" : String(moderationTodos.length)}
          hint={
            moderationTodos.length > 0
              ? "Questions & flagged comments"
              : "Inbox clear"
          }
          href="/events-training/moderation"
          icon={<MessageSquareWarning className="h-4 w-4" />}
          tone={moderationTodos.length > 0 ? "warn" : "default"}
        />
        <FocusTile
          label="Live & upcoming"
          value={loading ? "…" : String(liveWebinars.length)}
          hint="Sessions on Resources"
          href="/events-training/webinars"
          icon={<Clapperboard className="h-4 w-4" />}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">To do</h3>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Loading…"
              : waitingCount === 0
                ? "Queues are clear"
                : `${waitingCount} waiting`}
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
                          {item.displayName || item.email || "Member"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {webinar?.name ?? "Webinar"}
                          {item.createdAt
                            ? ` · ${formatWhen(item.createdAt)}`
                            : ""}
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
                    <div
                      key={`q-${item.contentId}-${item.id}`}
                      className="space-y-2 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-sky-50 text-sky-900">
                          Question
                        </Badge>
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className="bg-rose-50 text-rose-900">
                        Flagged
                      </Badge>
                      <span className="truncate text-xs text-muted-foreground">
                        {item.contentTitle}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-foreground">{item.text}</p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 h-8 rounded-full"
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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Live & upcoming webinars
          </h3>
          <Link
            href="/events-training/webinars"
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
          >
            Manage webinars
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white divide-y divide-zinc-100">
          {loading ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!loading && liveWebinars.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              No upcoming or ongoing webinars.
            </p>
          ) : null}
          {liveWebinars.map(({ webinar, lane }) => (
            <div
              key={webinar.id}
              className="flex items-start gap-3 px-4 py-3"
            >
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200">
                {webinar.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={webinar.posterUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    <Clapperboard className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {webinar.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge
                    className={
                      lane === "ongoing"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-sky-50 text-sky-900"
                    }
                  >
                    {lane === "ongoing" ? "Ongoing" : "Upcoming"}
                  </Badge>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatWhen(webinar.startsAt) ||
                      (webinar.speaker ? webinar.speaker : "Scheduled")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
