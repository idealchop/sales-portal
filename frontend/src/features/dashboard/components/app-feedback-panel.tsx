"use client";

import { format } from "date-fns";
import { MessageSquareQuote, Star, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaginatedList } from "@/components/paginated-list";
import type { AppFeedbackEntry, AppFeedbackSummary } from "@/lib/dashboard/analytics";

const FEEDBACK_PAGE_SIZE = 5;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating ?
              "fill-amber-400 text-amber-400"
            : "text-zinc-200"
          }`}
        />
      ))}
    </div>
  );
}

function FeedbackEntryCard({ entry }: { entry: AppFeedbackEntry }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {entry.businessName || "SmartRefill user"}
          </p>
          {entry.ownerEmail && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {entry.ownerEmail}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entry.rating && <StarRating rating={entry.rating} />}
          {entry.recommend !== undefined && (
            <Badge
              className={
                entry.recommend ?
                  "bg-emerald-100 text-emerald-800"
                : "bg-zinc-100 text-zinc-700"
              }
            >
              <ThumbsUp className="mr-1 h-3 w-3" />
              {entry.recommend ? "Recommends" : "Neutral"}
            </Badge>
          )}
          <Badge>
            {entry.source === "workspace" ? "In-app" : "Platform"}
          </Badge>
        </div>
      </div>

      {entry.feedback && (
        <p className="mt-3 text-sm text-foreground">
          &ldquo;{entry.feedback}&rdquo;
        </p>
      )}
      {entry.suggestion && (
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          <span className="font-medium text-foreground">Suggestion:</span>{" "}
          {entry.suggestion}
        </p>
      )}
      {entry.submittedAt && (
        <p className="mt-2 text-xs text-zinc-400">
          {format(new Date(entry.submittedAt), "MMM d, yyyy · h:mm a")}
        </p>
      )}
    </div>
  );
}

export function AppFeedbackPanel({
  appFeedback,
}: {
  appFeedback: AppFeedbackSummary;
}) {
  const maxRatingCount = Math.max(
    ...appFeedback.ratingDistribution.map((row) => row.count),
    1,
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">App feedback</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Ratings and comments from SmartRefill workspace owners.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--muted-foreground)]">
              Total responses
            </p>
            <p className="mt-2 text-3xl font-bold">
              {appFeedback.totalCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--muted-foreground)]">
              Average rating
            </p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-3xl font-bold">
                {appFeedback.averageRating ?? "—"}
              </p>
              {appFeedback.averageRating && (
                <StarRating rating={Math.round(appFeedback.averageRating)} />
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--muted-foreground)]">
              Would recommend
            </p>
            <p className="mt-2 text-3xl font-bold">
              {appFeedback.recommendRate !== null ?
                `${appFeedback.recommendRate}%`
              : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appFeedback.ratingDistribution
              .slice()
              .reverse()
              .map((row) => (
                <div key={row.rating} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium">{row.rating}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${(row.count / maxRatingCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-[var(--muted-foreground)]">
                    {row.count}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-5 w-5 text-[var(--primary)]" />
              <div>
                <CardTitle className="text-base">Recent feedback</CardTitle>
                <CardDescription>
                  Latest comments and feature suggestions.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {appFeedback.recentFeedback.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                No feedback submitted yet.
              </p>
            ) : (
              <PaginatedList
                items={appFeedback.recentFeedback}
                pageSize={FEEDBACK_PAGE_SIZE}
                className="space-y-4"
                renderItem={(entry) => (
                  <FeedbackEntryCard key={entry.id} entry={entry} />
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
