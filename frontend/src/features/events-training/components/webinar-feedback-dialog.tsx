"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MessageSquareQuote, Star, ThumbsUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchWebinarFeedback } from "../lib/events-training-api";
import type {
  WebinarFeedbackRecord,
  WebinarFeedbackSummary,
  WebinarRecord,
} from "../lib/events-training-types";
import {
  EMPTY_WEBINAR_FEEDBACK_SUMMARY,
  formatFeedbackExposureLabel,
  formatOverallRatingLabel,
  formatRecommendRateLabel,
} from "../lib/webinar-feedback-display";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-zinc-200"
          }`}
        />
      ))}
    </div>
  );
}

function OverallRatings({ summary }: { summary: WebinarFeedbackSummary }) {
  const maxCount = Math.max(1, ...summary.ratingCounts);
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
        Overall ratings
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {summary.averageRating == null ? "—" : summary.averageRating.toFixed(1)}
        </p>
        <div className="pb-0.5">
          <StarRating rating={Math.round(summary.averageRating ?? 0)} />
          <p className="mt-1 text-xs text-muted-foreground">
            {formatOverallRatingLabel(summary)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">
        {formatRecommendRateLabel(summary)}
      </p>
      {summary.count > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary.ratingCounts[stars - 1] ?? 0;
            const width = `${Math.round((count / maxCount) * 100)}%`;
            return (
              <li key={stars} className="flex items-center gap-2 text-xs">
                <span className="w-8 tabular-nums text-muted-foreground">
                  {stars}★
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width }}
                  />
                </div>
                <span className="w-6 text-right tabular-nums text-muted-foreground">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function FeedbackRow({ item }: { item: WebinarFeedbackRecord }) {
  const name = item.displayName || item.email || "Attendee";
  return (
    <li className="rounded-2xl border border-zinc-100 bg-white p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          {item.displayName && item.email ? (
            <p className="truncate text-xs text-muted-foreground">{item.email}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StarRating rating={item.rating} />
          <Badge
            className={
              item.recommend
                ? "bg-emerald-50 text-emerald-800"
                : "bg-zinc-100 text-zinc-700"
            }
          >
            <ThumbsUp className="mr-1 h-3 w-3" />
            {item.recommend ? "Recommends" : "Does not recommend"}
          </Badge>
          <Badge
            className={
              item.status === "visible"
                ? "bg-emerald-50 text-emerald-800"
                : item.status === "hidden"
                  ? "bg-zinc-100 text-zinc-700"
                  : "bg-amber-50 text-amber-950"
            }
          >
            {formatFeedbackExposureLabel(item.status)}
          </Badge>
        </div>
      </div>
      {item.feedback ? (
        <p className="mt-2 text-sm leading-5 text-foreground">{item.feedback}</p>
      ) : null}
      {item.recommendation ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Recommendation: {item.recommendation}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {formatWhen(item.updatedAt ?? item.createdAt)}
      </p>
    </li>
  );
}

export function WebinarFeedbackDialog({
  webinar,
  onClose,
}: {
  webinar: WebinarRecord;
  onClose: () => void;
}) {
  const [items, setItems] = useState<WebinarFeedbackRecord[]>([]);
  const [summary, setSummary] = useState<WebinarFeedbackSummary>(
    webinar.feedbackSummary ?? EMPTY_WEBINAR_FEEDBACK_SUMMARY,
  );
  const [publicSummary, setPublicSummary] = useState<WebinarFeedbackSummary>(
    EMPTY_WEBINAR_FEEDBACK_SUMMARY,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchWebinarFeedback(webinar.id)
      .then((payload) => {
        if (cancelled) return;
        setItems(payload.items);
        setSummary(payload.summary);
        setPublicSummary(payload.publicSummary ?? EMPTY_WEBINAR_FEEDBACK_SUMMARY);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load feedback.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [webinar.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="webinar-feedback-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              Ratings & feedback
            </p>
            <h3
              id="webinar-feedback-title"
              className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground"
            >
              {webinar.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? "Loading…"
                : `${formatOverallRatingLabel(summary)} internally · ${formatOverallRatingLabel(publicSummary)} on SmartRefill`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Approve ratings in Moderation before they appear on the public
              webinar page.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-full p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {loading ? (
            <div className="flex min-h-[12rem] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              Loading feedback…
            </div>
          ) : null}
          {!loading ? (
            <div className="space-y-4">
              <OverallRatings summary={summary} />
              {items.length === 0 ? (
                <div className="flex min-h-[10rem] flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                    <MessageSquareQuote className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    No feedback yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ratings appear here when attendees submit the form from the
                    webinar email. Use Moderation to show them on SmartRefill.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <FeedbackRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    window.document.body,
  );
}
