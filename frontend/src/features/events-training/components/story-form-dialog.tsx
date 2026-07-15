"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Link2,
  Star,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  createTrainingVideo,
  fetchTutorialApps,
  fetchWebinars,
  formatPricePesos,
  parsePricePesosToCents,
  updateTrainingVideo,
  updateWebinar,
  uploadEventsTrainingImage,
} from "../lib/events-training-api";
import type {
  PlaybackProvider,
  TrainingVideoRecord,
  TutorialAppOption,
  VideoStatus,
  VideoVisibility,
  WebinarRecord,
} from "../lib/events-training-types";
import {
  TUTORIAL_TARGET_APPS,
  VIDEO_CATEGORY_PATHS,
  tutorialTargetAppLabel,
} from "../lib/events-training-types";
import {
  formatDateTimeLocal,
  inputClassName,
  labelClassName,
  parseDateTimeLocal,
  textareaClassName,
} from "../lib/form-styles";
import {
  detectPlaybackProvider,
  normalizePlaybackInput,
  toEmbedPlaybackUrl,
} from "../lib/playback-input";
import {
  inferPrivateAudience,
  privateAudienceAccess,
  PRIVATE_AUDIENCE_OPTIONS,
  type PrivateAudience,
} from "../lib/private-audience";
import { buildResourceVideoShareUrl } from "../lib/resource-share-url";
import { ShareableLinkField } from "./shareable-link-field";

type SourceMode = "url" | "embed";

const STORY_PATH = VIDEO_CATEGORY_PATHS.wrs_stories;
const WEBINAR_PATH = VIDEO_CATEGORY_PATHS.webinar;

const VISIBILITY_OPTIONS: {
  value: VideoVisibility;
  label: string;
  hint: string;
}[] = [
  {
    value: "public",
    label: "Public",
    hint: "Everyone can watch",
  },
  {
    value: "private",
    label: "Private",
    hint: "Members by access tier",
  },
  {
    value: "premium",
    label: "Premium",
    hint: "Pay to unlock",
  },
];

function emptyForm(): Partial<TrainingVideoRecord> {
  return {
    name: "",
    description: "",
    recordedAt: null,
    status: "draft",
    category: "wrs_stories",
    subcategory: null,
    appId: "smartrefill",
    appPages: [],
    webinarEventId: null,
    playbackProvider: "youtube",
    playbackUrl: "",
    thumbnailUrl: null,
    featured: false,
    visibility: "public",
    priceCents: 0,
    currency: "PHP",
    allowedPlanCodes: [],
    allowAllMembers: false,
    tags: [],
  };
}

function showEmbedPreviewNote(
  normalized: string,
  raw: string | null | undefined,
): boolean {
  return Boolean(normalized) && normalized !== (raw ?? "").trim();
}

function webinarHasEnded(webinar: WebinarRecord, now = Date.now()): boolean {
  if (webinar.status === "completed" || webinar.status === "cancelled") {
    return true;
  }
  if (!webinar.endsAt) return false;
  const ends = new Date(webinar.endsAt).getTime();
  return !Number.isNaN(ends) && ends <= now;
}

function formatWebinarOptionLabel(webinar: WebinarRecord): string {
  const ended = webinarHasEnded(webinar);
  const when = webinar.endsAt
    ? new Date(webinar.endsAt).toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : webinar.status;
  return `${webinar.name}${ended ? " · ended" : ""} · ${when}`;
}

export function StoryFormDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: TrainingVideoRecord | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<Partial<TrainingVideoRecord>>(emptyForm);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("url");
  const [showMore, setShowMore] = useState(false);
  const [isRecordedWebinar, setIsRecordedWebinar] = useState(false);
  const [webinars, setWebinars] = useState<WebinarRecord[]>([]);
  const [webinarsLoading, setWebinarsLoading] = useState(false);
  const [apps, setApps] = useState<TutorialAppOption[]>([
    ...TUTORIAL_TARGET_APPS,
  ]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [privateAudience, setPrivateAudience] =
    useState<PrivateAudience>("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingId = initial?.id ?? null;
  const visibility = (form.visibility ?? "public") as VideoVisibility;
  const defaultAppId = apps[0]?.id ?? "smartrefill";
  const publishAppId = form.appId?.trim() || defaultAppId;
  const selectedApp =
    apps.find((app) => app.id === publishAppId) ??
    ({
      id: publishAppId,
      label: tutorialTargetAppLabel(publishAppId, apps),
      pages: [],
    } satisfies TutorialAppOption);
  const destinationPath = isRecordedWebinar ? WEBINAR_PATH : STORY_PATH;
  const normalizedPlaybackUrl = normalizePlaybackInput(form.playbackUrl ?? "");
  const embedUrl = toEmbedPlaybackUrl(
    (form.playbackProvider as PlaybackProvider) ?? "other",
    form.playbackUrl ?? "",
  );
  const detectedProvider = detectPlaybackProvider(form.playbackUrl ?? "");
  const shareUrl = editingId
    ? buildResourceVideoShareUrl({
        videoId: editingId,
        category: isRecordedWebinar ? "webinar" : "wrs_stories",
      })
    : null;

  const webinarOptions = useMemo(() => {
    const now = Date.now();
    return [...webinars]
      .filter((webinar) => webinar.status !== "draft" && webinar.status !== "archived")
      .sort((a, b) => {
        const aEnded = webinarHasEnded(a, now) ? 0 : 1;
        const bEnded = webinarHasEnded(b, now) ? 0 : 1;
        if (aEnded !== bEnded) return aEnded - bEnded;
        return (b.endsAt ?? "").localeCompare(a.endsAt ?? "");
      });
  }, [webinars]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAppsLoading(true);
    void fetchTutorialApps()
      .then((rows) => {
        if (!cancelled && rows.length > 0) setApps(rows);
      })
      .catch(() => {
        /* keep fallback apps */
      })
      .finally(() => {
        if (!cancelled) setAppsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || appsLoading) return;
    const nextDefault = apps[0]?.id ?? "smartrefill";
    if (initial) {
      const recorded =
        initial.category === "webinar" || Boolean(initial.webinarEventId);
      setForm({
        ...initial,
        category: recorded ? "webinar" : "wrs_stories",
        subcategory: null,
        appId: initial.appId?.trim() || nextDefault,
        appPages: [],
        webinarEventId: initial.webinarEventId ?? null,
        visibility: initial.visibility ?? "public",
        allowAllMembers:
          initial.visibility === "private"
            ? initial.allowAllMembers !== false
            : false,
      });
      setIsRecordedWebinar(recorded);
      setTags(initial.tags ?? []);
      setPriceInput(
        initial.visibility === "premium" && initial.priceCents > 0
          ? (initial.priceCents / 100).toFixed(2)
          : "",
      );
      setPrivateAudience(
        inferPrivateAudience({
          allowAllMembers:
            initial.visibility === "private"
              ? initial.allowAllMembers !== false
              : true,
          allowedPlanCodes: initial.allowedPlanCodes ?? [],
        }),
      );
      setShowMore(
        Boolean(initial.thumbnailUrl) ||
          Boolean(initial.recordedAt) ||
          initial.featured === true,
      );
    } else {
      setForm({ ...emptyForm(), appId: nextDefault });
      setIsRecordedWebinar(false);
      setTags([]);
      setPriceInput("");
      setPrivateAudience("all");
      setShowMore(false);
    }
    setTagDraft("");
    setSourceMode("url");
    setError(null);
  }, [open, initial, apps, appsLoading]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setWebinarsLoading(true);
    void fetchWebinars()
      .then((data) => {
        if (!cancelled) setWebinars(data);
      })
      .catch(() => {
        if (!cancelled) setWebinars([]);
      })
      .finally(() => {
        if (!cancelled) setWebinarsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, submitting, onClose]);

  function applyPlaybackInput(value: string) {
    const detected = detectPlaybackProvider(value);
    setForm((p) => ({
      ...p,
      playbackUrl: value,
      playbackProvider: detected === "other" ? p.playbackProvider : detected,
    }));
  }

  function setVisibility(next: VideoVisibility) {
    setForm((p) => ({
      ...p,
      visibility: next,
      allowAllMembers: next === "private",
      priceCents: next === "premium" ? p.priceCents : 0,
      allowedPlanCodes: [],
    }));
    if (next === "private") setPrivateAudience("all");
    if (next !== "premium") setPriceInput("");
  }

  function applyPrivateAudience(next: PrivateAudience) {
    setPrivateAudience(next);
    const access = privateAudienceAccess(next);
    setForm((p) => ({
      ...p,
      allowAllMembers: access.allowAllMembers,
      allowedPlanCodes: access.allowedPlanCodes,
    }));
  }

  function setRecordedWebinar(enabled: boolean) {
    setIsRecordedWebinar(enabled);
    setForm((p) => ({
      ...p,
      category: enabled ? "webinar" : "wrs_stories",
      webinarEventId: enabled ? p.webinarEventId : null,
    }));
  }

  function addTagsFromDraft(raw: string = tagDraft) {
    const next = raw
      .split(/[,]+/)
      .map((value) => value.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    if (next.length === 0) return;
    setTags((current) => {
      const existing = new Set(current.map((tag) => tag.toLowerCase()));
      const added = next.filter((tag) => !existing.has(tag.toLowerCase()));
      return added.length > 0 ? [...current, ...added] : current;
    });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((value) => value !== tag));
  }

  async function handleThumbnailChange(file: File | null) {
    if (!file) return;
    setSubmitting(true);
    try {
      const url = await uploadEventsTrainingImage(file, "thumbnail");
      setForm((prev) => ({ ...prev, thumbnailUrl: url }));
    } catch {
      setError("Thumbnail upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function syncWebinarRecordingLink(
    videoId: string,
    nextWebinarId: string | null,
    previousWebinarId: string | null,
  ) {
    if (previousWebinarId && previousWebinarId !== nextWebinarId) {
      const previous = webinars.find((row) => row.id === previousWebinarId);
      if (!previous || previous.linkedVideoId === videoId) {
        await updateWebinar(previousWebinarId, { linkedVideoId: null });
      }
    }
    if (nextWebinarId) {
      await updateWebinar(nextWebinarId, { linkedVideoId: videoId });
    }
  }

  async function handleSave() {
    const playbackUrl = normalizePlaybackInput(form.playbackUrl ?? "");
    if (!form.name?.trim() || !playbackUrl) {
      setError("Title and video link are required.");
      return;
    }
    if (isRecordedWebinar && !form.webinarEventId) {
      setError("Select which webinar this recording belongs to.");
      return;
    }

    const priceCents =
      visibility === "premium" ? parsePricePesosToCents(priceInput) : 0;
    if (visibility === "premium" && priceCents <= 0) {
      setError("Premium videos need a price in PHP.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const playbackProvider =
      form.playbackProvider ?? detectPlaybackProvider(playbackUrl);
    const previousWebinarId = initial?.webinarEventId ?? null;
    const nextWebinarId = isRecordedWebinar
      ? (form.webinarEventId ?? null)
      : null;

    const access =
      visibility === "private"
        ? privateAudienceAccess(privateAudience)
        : { allowAllMembers: false, allowedPlanCodes: [] as string[] };

    const payload = {
      ...form,
      category: isRecordedWebinar ? ("webinar" as const) : ("wrs_stories" as const),
      subcategory: null,
      appId: publishAppId,
      appPages: [],
      webinarEventId: nextWebinarId,
      playbackUrl,
      playbackProvider,
      visibility,
      priceCents: visibility === "premium" ? priceCents : 0,
      allowedPlanCodes: access.allowedPlanCodes,
      allowAllMembers: access.allowAllMembers,
      tags,
    };

    try {
      const saved = editingId
        ? await updateTrainingVideo(editingId, payload)
        : await createTrainingVideo(payload);
      await syncWebinarRecordingLink(
        saved.id,
        nextWebinarId,
        previousWebinarId,
      );
      await onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === "PREMIUM_PRICE_REQUIRED") {
          setError("Premium videos need a price in PHP.");
        } else if (err.message === "PRIVATE_ACCESS_REQUIRED") {
          setError("Private videos need member access enabled.");
        } else if (err.message === "PUBLISH_APP_REQUIRED") {
          setError("Choose a valid app from the catalog to publish to.");
        } else {
          setError(err.message || "Unable to save story.");
        }
      } else {
        setError("Unable to save story.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-form-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-2 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              {isRecordedWebinar ? "Webinar recording" : "WRS Story"}
            </p>
            <h3
              id="story-form-title"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground"
            >
              {editingId
                ? isRecordedWebinar
                  ? "Edit recording"
                  : "Edit story"
                : isRecordedWebinar
                  ? "New recording"
                  : "New story"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRecordedWebinar
                ? "Link this recording to a live webinar so viewers can watch after it ends."
                : "Stories appear on Smart Refill Resources for station owners."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-full p-0"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close form"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {error ? (
            <p className="rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Video</h4>
                <p className="text-xs text-muted-foreground">
                  Paste a link — provider is detected automatically.
                </p>
              </div>
              <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-0.5">
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    sourceMode === "url"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setSourceMode("url")}
                >
                  Link
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    sourceMode === "embed"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setSourceMode("embed")}
                >
                  Embed
                </button>
              </div>
            </div>

            {sourceMode === "embed" ? (
              <textarea
                className={cn(textareaClassName, "min-h-[110px] font-mono text-xs")}
                placeholder="Paste iframe embed HTML"
                value={form.playbackUrl ?? ""}
                onChange={(e) => applyPlaybackInput(e.target.value)}
              />
            ) : (
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  className={cn(inputClassName, "pl-10")}
                  placeholder="YouTube, Loom, or Vimeo URL"
                  value={form.playbackUrl ?? ""}
                  onChange={(e) => applyPlaybackInput(e.target.value)}
                />
              </div>
            )}

            {normalizedPlaybackUrl ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge className="border-teal-200 bg-teal-50 capitalize text-teal-800">
                  {detectedProvider}
                </Badge>
                {showEmbedPreviewNote(normalizedPlaybackUrl, form.playbackUrl) ? (
                  <span className="truncate">
                    Saving as {normalizedPlaybackUrl}
                  </span>
                ) : null}
              </div>
            ) : null}

            {embedUrl ? (
              <div className="overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-zinc-200">
                <div className="relative aspect-video w-full">
                  <iframe
                    title="Story preview"
                    src={embedUrl}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Details</h4>
              <p className="text-xs text-muted-foreground">
                A short title and summary work best on the Resources feed.
              </p>
            </div>
            <div>
              <label className={labelClassName} htmlFor="story-title">
                Title
              </label>
              <input
                id="story-title"
                className={inputClassName}
                placeholder="e.g. Owner success with Smart Refill"
                value={form.name ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="story-description">
                Description
              </label>
              <textarea
                id="story-description"
                className={cn(textareaClassName, "min-h-[84px]")}
                placeholder="One or two sentences about this story"
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="story-tags">
                Tags
              </label>
              <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/60 px-2 py-1.5 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/15">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="gap-1 border-teal-200 bg-white pr-1 text-teal-800"
                  >
                    {tag}
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-teal-50"
                      aria-label={`Remove ${tag}`}
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  id="story-tags"
                  className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
                  placeholder={tags.length === 0 ? "Add tags" : "Add another"}
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTagsFromDraft();
                    } else if (
                      e.key === "Backspace" &&
                      !tagDraft &&
                      tags.length > 0
                    ) {
                      removeTag(tags[tags.length - 1]!);
                    }
                  }}
                  onBlur={() => addTagsFromDraft()}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Who can watch
              </h4>
              <p className="text-xs text-muted-foreground">
                Choose how this video is unlocked on Resources.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {VISIBILITY_OPTIONS.map((option) => {
                const active = visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left transition",
                      active
                        ? "border-teal-600 bg-teal-50 shadow-sm"
                        : "border-zinc-200 bg-white hover:border-zinc-300",
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            {visibility === "premium" ? (
              <div>
                <label className={labelClassName} htmlFor="story-price">
                  Price (PHP)
                </label>
                <input
                  id="story-price"
                  className={inputClassName}
                  inputMode="decimal"
                  placeholder="e.g. 199"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Viewers pay this amount to unlock
                  {priceInput.trim()
                    ? ` (${formatPricePesos(parsePricePesosToCents(priceInput) || 0)})`
                    : ""}
                  .
                </p>
              </div>
            ) : null}
            {visibility === "private" ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Who can view
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Narrow Private access for signed-in station members.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {PRIVATE_AUDIENCE_OPTIONS.map((option) => {
                    const active = privateAudience === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => applyPrivateAudience(option.value)}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition",
                          active
                            ? "border-sky-500 bg-sky-50 shadow-sm"
                            : "border-zinc-200 bg-white hover:border-zinc-300",
                        )}
                      >
                        <span className="block text-sm font-semibold text-foreground">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs text-sky-900">
                  {privateAudience === "all"
                    ? "Visible to all signed-in Smart Refill members (owners, admins, and riders)."
                    : privateAudience === "paid"
                      ? "Visible to stations on Grow or Scale (paid) subscriptions."
                      : "Visible only to stations on a Scale subscription."}
                </p>
              </div>
            ) : null}
          </section>

          {shareUrl ? (
            <ShareableLinkField
              url={shareUrl}
              title={form.name}
              status={form.status ?? "draft"}
              visibility={visibility}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 text-xs text-muted-foreground">
              A shareable Resources link will appear after you create this story.
            </p>
          )}

          <section className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Publishes to
                </h4>
                <p className="text-xs text-muted-foreground">
                  Choose the product app from Firestore{" "}
                  <code className="rounded bg-white px-1">apps</code>.
                </p>
              </div>
              {apps.length > 1 ? (
                <select
                  className={cn(inputClassName, "h-9 w-auto min-w-[10rem]")}
                  value={publishAppId}
                  disabled={appsLoading || submitting}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, appId: e.target.value }))
                  }
                >
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge className="border-teal-200 bg-white text-teal-800">
                  {appsLoading ? "Loading…" : selectedApp.label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-foreground">
              {isRecordedWebinar ? "Webinar recordings" : "WRS Stories"} in{" "}
              {selectedApp.label}{" "}
              <code className="rounded-md bg-white px-1.5 py-0.5 text-xs text-zinc-600 ring-1 ring-zinc-200">
                {publishAppId === "smartrefill"
                  ? destinationPath
                  : `apps/${publishAppId}`}
              </code>
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30"
                checked={isRecordedWebinar}
                onChange={(e) => setRecordedWebinar(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  This is a recorded webinar
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Link it to a webinar event so ended sessions can play this
                  recording.
                </span>
              </span>
            </label>

            {isRecordedWebinar ? (
              <div>
                <label className={labelClassName} htmlFor="story-webinar">
                  Related webinar
                </label>
                <select
                  id="story-webinar"
                  className={inputClassName}
                  value={form.webinarEventId ?? ""}
                  disabled={webinarsLoading || submitting}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      webinarEventId: e.target.value || null,
                    }))
                  }
                >
                  <option value="">
                    {webinarsLoading
                      ? "Loading webinars…"
                      : "Select a webinar event"}
                  </option>
                  {webinarOptions.map((webinar) => (
                    <option key={webinar.id} value={webinar.id}>
                      {formatWebinarOptionLabel(webinar)}
                    </option>
                  ))}
                </select>
                {webinarOptions.length === 0 && !webinarsLoading ? (
                  <p className="mt-1.5 text-xs text-amber-700">
                    No published webinars yet. Create one under Webinars first.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Ended webinars are listed first.
                  </p>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() =>
                setForm((p) => ({ ...p, featured: !(p.featured === true) }))
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                form.featured
                  ? "border-amber-400 bg-amber-50 text-amber-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-amber-300",
              )}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  form.featured && "fill-amber-500 text-amber-500",
                )}
              />
              {form.featured ? "Featured on feed" : "Mark as featured"}
            </button>
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Status</h4>
              <p className="text-xs text-muted-foreground">
                Drafts stay in Sales Portal until you publish.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "draft", label: "Draft", hint: "Not live" },
                  { value: "published", label: "Published", hint: "Live" },
                  { value: "archived", label: "Archived", hint: "Hidden" },
                ] as const
              ).map((option) => {
                const active = (form.status ?? "draft") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        status: option.value as VideoStatus,
                      }))
                    }
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left transition",
                      active
                        ? "border-teal-600 bg-teal-50 shadow-sm"
                        : "border-zinc-200 bg-white hover:border-zinc-300",
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-foreground"
              onClick={() => setShowMore((value) => !value)}
            >
              {showMore ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              More options
            </button>
            {showMore ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClassName} htmlFor="story-recorded">
                    Recorded at
                  </label>
                  <input
                    id="story-recorded"
                    className={inputClassName}
                    type="datetime-local"
                    value={formatDateTimeLocal(form.recordedAt ?? null)}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        recordedAt: parseDateTimeLocal(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className={labelClassName} htmlFor="story-thumbnail">
                    Thumbnail
                  </label>
                  <label
                    htmlFor="story-thumbnail"
                    className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-600 hover:border-teal-400 hover:bg-teal-50/40"
                  >
                    <ImagePlus className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {form.thumbnailUrl ? "Replace image" : "Upload image"}
                    </span>
                  </label>
                  <input
                    id="story-thumbnail"
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      void handleThumbnailChange(e.target.files?.[0] ?? null)
                    }
                  />
                  {form.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.thumbnailUrl}
                      alt=""
                      className="mt-2 h-16 w-28 rounded-md object-cover ring-1 ring-zinc-200"
                    />
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Optional — YouTube often provides one automatically.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-100 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleSave()}
          >
            {submitting
              ? "Saving…"
              : editingId
                ? "Save changes"
                : isRecordedWebinar
                  ? "Create recording"
                  : "Create story"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
