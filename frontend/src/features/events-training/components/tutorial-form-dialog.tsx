"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Link2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  createTrainingVideo,
  fetchTutorialApps,
  updateTrainingVideo,
  uploadEventsTrainingImage,
} from "../lib/events-training-api";
import type {
  PlaybackProvider,
  TrainingVideoRecord,
  TutorialAppOption,
  VideoStatus,
} from "../lib/events-training-types";
import {
  TUTORIAL_TARGET_APPS,
  pagesForTutorialApp,
  tutorialPageLabel,
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

type SourceMode = "url" | "embed";

function emptyForm(): Partial<TrainingVideoRecord> {
  return {
    name: "",
    description: "",
    recordedAt: null,
    status: "draft",
    category: "tutorial",
    subcategory: null,
    appId: "smartrefill",
    appPages: ["dashboard"],
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

function normalizePages(
  pages: string[] | null | undefined,
  allowed: readonly string[],
  fallbackSubcategory?: string | null,
): string[] {
  const allowedSet = new Set(allowed);
  const fromArray = (pages ?? []).filter((page) => allowedSet.has(page));
  if (fromArray.length > 0) return [...new Set(fromArray)];
  if (fallbackSubcategory && allowedSet.has(fallbackSubcategory)) {
    return [fallbackSubcategory];
  }
  return [];
}

export function TutorialFormDialog({
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
  const [apps, setApps] = useState<TutorialAppOption[]>(TUTORIAL_TARGET_APPS);
  const [appsLoading, setAppsLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("url");
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingId = initial?.id ?? null;
  const defaultAppId = apps[0]?.id ?? "smartrefill";
  const appId = form.appId?.trim() || defaultAppId;
  const selectedApp =
    apps.find((app) => app.id === appId) ??
    ({ id: appId, label: tutorialTargetAppLabel(appId, apps), pages: [] } satisfies TutorialAppOption);
  const availablePages = pagesForTutorialApp(appId, apps);
  const selectedPages = normalizePages(form.appPages, availablePages);
  const normalizedPlaybackUrl = normalizePlaybackInput(form.playbackUrl ?? "");
  const embedUrl = toEmbedPlaybackUrl(
    (form.playbackProvider as PlaybackProvider) ?? "other",
    form.playbackUrl ?? "",
  );
  const detectedProvider = detectPlaybackProvider(form.playbackUrl ?? "");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAppsLoading(true);
    void fetchTutorialApps()
      .then((data) => {
        if (cancelled) return;
        if (data.length > 0) setApps(data);
      })
      .catch(() => {
        if (!cancelled) setApps(TUTORIAL_TARGET_APPS);
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
    const nextApps = apps;
    const nextDefault = nextApps[0]?.id ?? "smartrefill";
    if (initial) {
      const nextAppId = initial.appId?.trim() || nextDefault;
      const allowed = pagesForTutorialApp(nextAppId, nextApps);
      setForm({
        ...initial,
        category: "tutorial",
        appId: nextAppId,
        appPages: normalizePages(
          initial.appPages,
          allowed,
          initial.subcategory,
        ),
        visibility: "public",
        featured: false,
      });
      setTags(initial.tags ?? []);
      setShowMore(
        Boolean(initial.thumbnailUrl) || Boolean(initial.recordedAt),
      );
    } else {
      const allowed = pagesForTutorialApp(nextDefault, nextApps);
      setForm({
        ...emptyForm(),
        appId: nextDefault,
        appPages: allowed.includes("dashboard")
          ? ["dashboard"]
          : allowed.slice(0, 1),
      });
      setTags([]);
      setShowMore(false);
    }
    setTagDraft("");
    setSourceMode("url");
    setError(null);
  }, [open, initial, apps, appsLoading]);

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

  function togglePage(page: string) {
    setForm((current) => {
      const pages = normalizePages(current.appPages, availablePages);
      return {
        ...current,
        appPages: pages.includes(page)
          ? pages.filter((value) => value !== page)
          : [...pages, page],
      };
    });
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

  async function handleSave() {
    const playbackUrl = normalizePlaybackInput(form.playbackUrl ?? "");
    if (!form.name?.trim() || !playbackUrl) {
      setError("Title and video link are required.");
      return;
    }
    if (selectedPages.length === 0) {
      setError("Choose at least one Smart Refill page.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const playbackProvider =
      form.playbackProvider ?? detectPlaybackProvider(playbackUrl);
    const payload = {
      ...form,
      category: "tutorial" as const,
      subcategory: null,
      appId,
      appPages: selectedPages,
      playbackUrl,
      playbackProvider,
      visibility: "public" as const,
      featured: false,
      priceCents: 0,
      allowedPlanCodes: [],
      allowAllMembers: false,
      tags,
    };

    try {
      if (editingId) {
        await updateTrainingVideo(editingId, payload);
      } else {
        await createTrainingVideo(payload);
      }
      await onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === "TUTORIAL_PAGES_REQUIRED") {
          setError("Choose at least one Smart Refill page.");
        } else {
          setError(err.message || "Unable to save tutorial.");
        }
      } else {
        setError("Unable to save tutorial.");
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
        aria-labelledby="tutorial-form-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-2 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              Video tutorial
            </p>
            <h3
              id="tutorial-form-title"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground"
            >
              {editingId ? "Edit tutorial" : "New tutorial"}
            </h3>
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
                    title="Tutorial preview"
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
                Keep the title short and clear for station owners.
              </p>
            </div>
            <div>
              <label className={labelClassName} htmlFor="tutorial-title">
                Title
              </label>
              <input
                id="tutorial-title"
                className={inputClassName}
                placeholder="e.g. How to add a customer"
                value={form.name ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="tutorial-description">
                Description
              </label>
              <textarea
                id="tutorial-description"
                className={cn(textareaClassName, "min-h-[84px]")}
                placeholder="One or two sentences about what this tutorial covers"
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="tutorial-tags">
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
                  id="tutorial-tags"
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

          <section className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Show in {selectedApp.label}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Select the app from the catalog, then every page where this
                  tutorial should appear.
                </p>
              </div>
              {apps.length > 1 ? (
                <select
                  className={cn(inputClassName, "h-9 w-auto min-w-[10rem]")}
                  value={appId}
                  disabled={appsLoading || submitting}
                  onChange={(e) => {
                    const next = e.target.value;
                    const allowed = pagesForTutorialApp(next, apps);
                    setForm((p) => ({
                      ...p,
                      appId: next,
                      appPages: normalizePages(p.appPages, allowed),
                    }));
                  }}
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

            <div className="flex flex-wrap gap-2">
              {availablePages.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No pages configured for this app.
                </p>
              ) : (
                availablePages.map((page) => {
                  const active = selectedPages.includes(page);
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => togglePage(page)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                        active
                          ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-teal-300 hover:text-teal-800",
                      )}
                    >
                      {active ? <Check className="h-3.5 w-3.5" /> : null}
                      {tutorialPageLabel(page)}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Status</h4>
              <p className="text-xs text-muted-foreground">
                Drafts stay private to Sales Portal until you publish.
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
                  <label className={labelClassName} htmlFor="tutorial-recorded">
                    Recorded at
                  </label>
                  <input
                    id="tutorial-recorded"
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
                  <label className={labelClassName} htmlFor="tutorial-thumb">
                    Thumbnail
                  </label>
                  <label
                    htmlFor="tutorial-thumb"
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600 hover:border-teal-400 hover:bg-teal-50/40"
                  >
                    {form.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.thumbnailUrl}
                        alt=""
                        className="h-10 w-16 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-zinc-400 ring-1 ring-zinc-200">
                        <ImagePlus className="h-4 w-4" />
                      </span>
                    )}
                    <span>
                      {form.thumbnailUrl ? "Replace image" : "Upload image"}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Optional for YouTube
                      </span>
                    </span>
                    <input
                      id="tutorial-thumb"
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        void handleThumbnailChange(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-full px-5"
            disabled={submitting}
            onClick={() => void handleSave()}
          >
            {submitting
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Create tutorial"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function showEmbedPreviewNote(
  normalized: string,
  raw: string | null | undefined,
): boolean {
  return Boolean(normalized) && normalized !== (raw ?? "").trim();
}
