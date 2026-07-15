"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  EyeOff,
  Flag,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  fetchModerationInbox,
  moderateBlogComment,
  moderateVideoComment,
  updateVideoQuestion,
} from "../lib/events-training-api";
import type {
  CommentStatus,
  ModerationCommentItem,
  ModerationInbox,
  ModerationQuestionItem,
  QuestionStatus,
} from "../lib/events-training-types";
import { textareaClassName } from "../lib/form-styles";

type View = "todo" | "questions" | "comments";

const COMMENT_ACTIONS: {
  status: CommentStatus;
  label: string;
  icon: typeof Check;
  activeClass: string;
}[] = [
  {
    status: "visible",
    label: "Approve",
    icon: Check,
    activeClass: "border-emerald-500/80 bg-emerald-50 text-emerald-900",
  },
  {
    status: "hidden",
    label: "Hide",
    icon: EyeOff,
    activeClass: "border-zinc-400 bg-zinc-100 text-zinc-800",
  },
  {
    status: "flagged",
    label: "Flag",
    icon: Flag,
    activeClass: "border-amber-500/80 bg-amber-50 text-amber-950",
  },
];

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

function contentBadge(kind: "video" | "blog") {
  return kind === "blog" ? "Blog" : "Video";
}

export function ModerationAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [view, setView] = useState<View>("todo");
  const [inbox, setInbox] = useState<ModerationInbox | null>(null);
  const [search, setSearch] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInbox(await fetchModerationInbox());
    } catch {
      setError("Unable to load the moderation inbox.");
      setInbox(null);
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
    void loadInbox();
  }, [loadInbox, profile?.role, profileLoading, router]);

  const query = search.trim().toLowerCase();

  const openQuestions = useMemo(() => {
    const items = (inbox?.questions ?? []).filter((item) => item.status === "open");
    if (!query) return items;
    return items.filter(
      (item) =>
        item.text.toLowerCase().includes(query) ||
        item.contentTitle.toLowerCase().includes(query) ||
        (item.displayName ?? "").toLowerCase().includes(query),
    );
  }, [inbox?.questions, query]);

  const flaggedComments = useMemo(() => {
    const items = (inbox?.comments ?? []).filter(
      (item) => item.status === "flagged",
    );
    if (!query) return items;
    return items.filter(
      (item) =>
        item.text.toLowerCase().includes(query) ||
        item.contentTitle.toLowerCase().includes(query) ||
        (item.displayName ?? "").toLowerCase().includes(query),
    );
  }, [inbox?.comments, query]);

  const allQuestions = useMemo(() => {
    const items = [...(inbox?.questions ?? [])].sort((a, b) => {
      const rank = (status: QuestionStatus) =>
        status === "open" ? 0 : status === "answered" ? 1 : 2;
      const byStatus = rank(a.status) - rank(b.status);
      if (byStatus !== 0) return byStatus;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
    if (!query) return items;
    return items.filter(
      (item) =>
        item.text.toLowerCase().includes(query) ||
        item.contentTitle.toLowerCase().includes(query) ||
        (item.displayName ?? "").toLowerCase().includes(query) ||
        (item.answer ?? "").toLowerCase().includes(query),
    );
  }, [inbox?.questions, query]);

  const allComments = useMemo(() => {
    const items = [...(inbox?.comments ?? [])].sort((a, b) => {
      const aFlag = a.status === "flagged" ? 0 : 1;
      const bFlag = b.status === "flagged" ? 0 : 1;
      if (aFlag !== bFlag) return aFlag - bFlag;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
    if (!query) return items;
    return items.filter(
      (item) =>
        item.text.toLowerCase().includes(query) ||
        item.contentTitle.toLowerCase().includes(query) ||
        (item.displayName ?? "").toLowerCase().includes(query),
    );
  }, [inbox?.comments, query]);

  const counts = inbox?.counts ?? {
    openQuestions: 0,
    flaggedComments: 0,
    comments: 0,
    questions: 0,
  };
  const todoCount = counts.openQuestions + counts.flaggedComments;

  async function setCommentStatus(
    item: ModerationCommentItem,
    status: CommentStatus,
  ) {
    setBusyId(item.id);
    setError(null);
    try {
      if (item.contentKind === "blog") {
        await moderateBlogComment(item.contentId, item.id, status);
      } else {
        await moderateVideoComment(item.contentId, item.id, status);
      }
      setInbox((current) => {
        if (!current) return current;
        const comments = current.comments.map((row) =>
          row.id === item.id && row.contentId === item.contentId
            ? { ...row, status }
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
      setError("Unable to update comment.");
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
      setAnswerDrafts((prev) => ({ ...prev, [key]: "" }));
    } catch {
      setError("Unable to answer question.");
    } finally {
      setBusyId(null);
    }
  }

  async function setQuestionStatus(
    item: ModerationQuestionItem,
    status: QuestionStatus,
  ) {
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await updateVideoQuestion(item.contentId, item.id, {
        status,
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
    } catch {
      setError("Unable to update question.");
    } finally {
      setBusyId(null);
    }
  }

  function renderQuestionCard(item: ModerationQuestionItem, emphasize: boolean) {
    const key = `${item.contentId}:${item.id}`;
    return (
      <li
        key={key}
        className={cn(
          "rounded-2xl border bg-white px-4 py-4 shadow-sm",
          emphasize
            ? "border-amber-200 bg-amber-50/20"
            : "border-zinc-200/80",
        )}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-sky-50 text-sky-900">Question</Badge>
            <Badge className="bg-zinc-100 text-zinc-700">
              {contentBadge(item.contentKind)}
            </Badge>
            <Badge
              className={cn(
                "capitalize",
                item.status === "open" &&
                  "border-amber-200 bg-amber-50 text-amber-950",
                item.status === "answered" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-800",
                item.status === "closed" && "bg-zinc-100 text-zinc-600",
              )}
            >
              {item.status}
            </Badge>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-800">
            {item.contentTitle}
          </p>
          <p className="text-sm font-medium leading-relaxed text-foreground">
            {item.text}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.displayName || item.userId}
            {item.createdAt ? ` · ${formatWhen(item.createdAt)}` : ""}
          </p>

          {item.answer ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
                Answer
              </p>
              <p className="mt-1.5 text-sm text-foreground">{item.answer}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <textarea
                className={cn(
                  textareaClassName,
                  "min-h-[96px] rounded-2xl bg-white",
                )}
                placeholder="Type your answer here…"
                value={answerDrafts[key] ?? ""}
                onChange={(e) =>
                  setAnswerDrafts((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  disabled={busyId === item.id}
                  onClick={() => void submitAnswer(item)}
                >
                  {busyId === item.id ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Post answer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={busyId === item.id}
                  onClick={() => void setQuestionStatus(item, "closed")}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
          {item.answer && item.status !== "closed" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={busyId === item.id}
              onClick={() => void setQuestionStatus(item, "closed")}
            >
              Mark closed
            </Button>
          ) : null}
        </div>
      </li>
    );
  }

  function renderCommentCard(item: ModerationCommentItem) {
    return (
      <li
        key={`${item.contentKind}:${item.contentId}:${item.id}`}
        className={cn(
          "rounded-2xl border bg-white px-4 py-4 shadow-sm",
          item.status === "flagged"
            ? "border-amber-200 bg-amber-50/20"
            : "border-zinc-200/80",
        )}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-violet-50 text-violet-900">Comment</Badge>
              <Badge className="bg-zinc-100 text-zinc-700">
                {contentBadge(item.contentKind)}
              </Badge>
              <Badge
                className={cn(
                  "capitalize",
                  item.status === "visible" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-800",
                  item.status === "hidden" && "bg-zinc-100 text-zinc-600",
                  item.status === "flagged" &&
                    "border-amber-200 bg-amber-50 text-amber-950",
                )}
              >
                {item.status}
              </Badge>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-800">
              {item.contentTitle}
            </p>
            <p className="text-sm leading-relaxed text-zinc-800">{item.text}</p>
            <p className="text-xs text-muted-foreground">
              {item.displayName || "Anonymous"} · {item.authorType}
              {item.createdAt ? ` · ${formatWhen(item.createdAt)}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5 lg:justify-end">
            {COMMENT_ACTIONS.map((action) => {
              const Icon = action.icon;
              const active = item.status === action.status;
              return (
                <Button
                  key={action.status}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn("rounded-full", active && action.activeClass)}
                  disabled={busyId === item.id || active}
                  onClick={() => void setCommentStatus(item, action.status)}
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      </li>
    );
  }

  function renderEmpty(title: string, hint: string) {
    return (
      <div className="flex min-h-[16rem] flex-col items-center justify-center px-4 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">
          <MessageSquareText className="h-6 w-6" />
        </div>
        <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
            Action queue
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Moderation
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Answer open questions and review flagged comments from every video
            and blog in one place — no picking content first.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={loading}
          onClick={() => void loadInbox()}
        >
          <RefreshCw
            className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-teal-900/5 bg-gradient-to-b from-white via-white to-teal-50/30 shadow-[0_18px_50px_-28px_rgba(15,118,110,0.35)]">
        <div className="border-b border-zinc-100 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full max-w-lg rounded-full bg-zinc-100/80 p-1">
              {(
                [
                  ["todo", "To do", todoCount],
                  ["questions", "All questions", counts.questions],
                  ["comments", "All comments", counts.comments],
                ] as const
              ).map(([id, label, count]) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-white text-teal-900 shadow-sm ring-1 ring-teal-900/5"
                        : "text-zinc-500 hover:text-zinc-800",
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        active
                          ? id === "todo" && count > 0
                            ? "bg-amber-100 text-amber-950"
                            : "bg-zinc-100 text-zinc-600"
                          : "text-zinc-400",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                className="h-10 w-full rounded-full border border-zinc-200/90 bg-white pl-10 pr-9 text-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                placeholder="Search across every video & blog…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search moderation inbox"
              />
              {search ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-3 py-4 sm:px-5">
          {error ? (
            <p className="mb-3 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
              Loading questions and comments across all content…
            </div>
          ) : null}

          {!loading && view === "todo" ? (
            openQuestions.length === 0 && flaggedComments.length === 0 ? (
              renderEmpty(
                "Nothing needs attention",
                "Open questions and flagged comments from every video and blog will appear here.",
              )
            ) : (
              <div className="space-y-8">
                <section className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2 px-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      Open questions
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {openQuestions.length} across all videos
                    </p>
                  </div>
                  {openQuestions.length === 0 ? (
                    <p className="rounded-2xl bg-zinc-50 px-4 py-6 text-center text-sm text-muted-foreground">
                      No open questions right now.
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {openQuestions.map((item) =>
                        renderQuestionCard(item, true),
                      )}
                    </ul>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2 px-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      Flagged comments
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {flaggedComments.length} across all content
                    </p>
                  </div>
                  {flaggedComments.length === 0 ? (
                    <p className="rounded-2xl bg-zinc-50 px-4 py-6 text-center text-sm text-muted-foreground">
                      No flagged comments. Use{" "}
                      <button
                        type="button"
                        className="font-medium text-teal-800 underline-offset-2 hover:underline"
                        onClick={() => setView("comments")}
                      >
                        All comments
                      </button>{" "}
                      to Approve / Hide posts across every video.
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {flaggedComments.map((item) => renderCommentCard(item))}
                    </ul>
                  )}
                </section>
              </div>
            )
          ) : null}

          {!loading && view === "questions" ? (
            allQuestions.length === 0 ? (
              renderEmpty(
                "No questions yet",
                "Member Q&A from every training video will show up here.",
              )
            ) : (
              <ul className="space-y-2.5">
                {allQuestions.map((item) =>
                  renderQuestionCard(item, item.status === "open"),
                )}
              </ul>
            )
          ) : null}

          {!loading && view === "comments" ? (
            allComments.length === 0 ? (
              renderEmpty(
                "No comments yet",
                "Video and blog comments from Resources will show up here for Approve / Hide / Flag.",
              )
            ) : (
              <ul className="space-y-2.5">
                {allComments.map((item) => renderCommentCard(item))}
              </ul>
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}
