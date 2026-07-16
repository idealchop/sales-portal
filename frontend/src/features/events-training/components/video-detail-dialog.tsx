"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrainingVideoRecord } from "../lib/events-training-types";
import {
  tutorialPageLabel,
  tutorialTargetAppLabel,
} from "../lib/events-training-types";
import { formatPricePesos } from "../lib/events-training-api";
import { toEmbedPlaybackUrl } from "../lib/playback-input";
import { buildResourceVideoShareUrl } from "../lib/resource-share-url";
import {
  inferPrivateAudience,
  privateAudienceLabel,
} from "../lib/private-audience";
import { ShareableLinkField } from "./shareable-link-field";

function formatOccurredAt(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
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

function formatTutorialPages(item: TrainingVideoRecord): string[] {
  const pages = [...new Set((item.appPages ?? []).filter(Boolean))];
  if (pages.length === 0 && item.subcategory) {
    return [tutorialPageLabel(item.subcategory)];
  }
  return pages.map(tutorialPageLabel);
}

export function VideoDetailDialog({
  item,
  onClose,
  onEdit,
}: {
  item: TrainingVideoRecord;
  onClose: () => void;
  onEdit: () => void;
}) {
  const embedUrl = toEmbedPlaybackUrl(item.playbackProvider, item.playbackUrl);
  const isTutorial = item.category === "tutorial";
  const pageLabels = isTutorial ? formatTutorialPages(item) : [];
  const shareUrl = buildResourceVideoShareUrl({
    videoId: item.id,
    category: item.category,
  });
  const privateAudience =
    !isTutorial && item.visibility === "private"
      ? inferPrivateAudience({
          allowAllMembers: item.allowAllMembers,
          allowedPlanCodes: item.allowedPlanCodes,
        })
      : null;

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
        aria-labelledby="video-detail-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              {isTutorial ? "Video tutorial" : "Training video"}
            </p>
            <h3
              id="video-detail-title"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground"
            >
              {item.name}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge
                className={cn(
                  item.status === "published" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-800",
                  item.status === "draft" &&
                    "border-amber-200 bg-amber-50 text-amber-800",
                  item.status === "archived" && "bg-zinc-100 text-zinc-600",
                )}
              >
                {item.status}
              </Badge>
              {isTutorial ? (
                <Badge className="border-teal-200 bg-teal-50 text-teal-800">
                  {tutorialTargetAppLabel(item.appId)}
                </Badge>
              ) : (
                <Badge className="bg-zinc-100 text-zinc-700">
                  {item.visibility}
                  {privateAudience
                    ? ` · ${privateAudienceLabel(privateAudience)}`
                    : ""}
                </Badge>
              )}
              {!isTutorial &&
              item.visibility === "premium" &&
              item.priceCents > 0 ? (
                <Badge>{formatPricePesos(item.priceCents)}</Badge>
              ) : null}
            </div>
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-2 pb-5">
          <div className="overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-zinc-200">
            {embedUrl ? (
              <div className="relative aspect-video w-full">
                <iframe
                  title={item.name}
                  src={embedUrl}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 px-4 text-center text-sm text-zinc-300">
                <p>Unable to embed this video source.</p>
                {item.playbackUrl ? (
                  <a
                    href={item.playbackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-teal-300 hover:underline"
                  >
                    Open original link <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            )}
          </div>

          {item.description ? (
            <p className="text-sm leading-relaxed text-zinc-700">
              {item.description}
            </p>
          ) : null}

          {shareUrl ? (
            <ShareableLinkField
              url={shareUrl}
              title={item.name}
              status={item.status}
              visibility={item.visibility}
            />
          ) : null}

          {isTutorial && pageLabels.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Appears on
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pageLabels.map((label) => (
                  <Badge
                    key={label}
                    className="border-teal-200 bg-teal-50 text-teal-800"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {item.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} className="bg-zinc-100 text-zinc-700">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-4 py-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Provider
              </p>
              <p className="mt-1 capitalize text-foreground">
                {item.playbackProvider}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Recorded
              </p>
              <p className="mt-1 text-foreground">
                {formatOccurredAt(item.recordedAt)}
              </p>
            </div>
            {item.playbackUrl ? (
              <div className="sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Source
                </p>
                <a
                  href={item.playbackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-teal-700 hover:underline"
                >
                  <span className="truncate">{item.playbackUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="button"
            className="rounded-full px-5"
            onClick={() => {
              onClose();
              onEdit();
            }}
          >
            <Pencil className="mr-1.5 h-4 w-4" /> Edit
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
