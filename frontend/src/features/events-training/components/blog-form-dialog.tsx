"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ImagePlus,
  Star,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  createWrsBlog,
  fetchTutorialApps,
  formatPricePesos,
  formatWrsBlogBodyHtml,
  parsePricePesosToCents,
  updateWrsBlog,
  uploadEventsTrainingImage,
} from "../lib/events-training-api";
import {
  buildArticlePreviewDocument,
  looksLikeHtml,
  resolveInsertTemplateBody,
} from "../lib/blog-preview";
import type {
  BlogStatus,
  TutorialAppOption,
  VideoVisibility,
  WrsBlogRecord,
} from "../lib/events-training-types";
import {
  TUTORIAL_TARGET_APPS,
  tutorialTargetAppLabel,
} from "../lib/events-training-types";
import {
  inferPrivateAudience,
  privateAudienceAccess,
  PRIVATE_AUDIENCE_OPTIONS,
  type PrivateAudience,
} from "../lib/private-audience";
import {
  inputClassName,
  labelClassName,
  textareaClassName,
} from "../lib/form-styles";

const STATUS_OPTIONS: {
  value: BlogStatus;
  label: string;
  hint: string;
}[] = [
  { value: "draft", label: "Draft", hint: "Not listed yet" },
  { value: "published", label: "Published", hint: "Live on Resources" },
  { value: "archived", label: "Archived", hint: "Hidden from list" },
];

const VISIBILITY_OPTIONS: {
  value: VideoVisibility;
  label: string;
  hint: string;
}[] = [
  { value: "public", label: "Public", hint: "Anyone can read" },
  { value: "private", label: "Private", hint: "Members by access tier" },
  { value: "premium", label: "Premium", hint: "Pay to unlock" },
];

function emptyForm(): Partial<WrsBlogRecord> {
  return {
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    authorName: "",
    heroImageUrl: null,
    status: "draft",
    appId: "smartrefill",
    visibility: "public",
    priceCents: 0,
    currency: "PHP",
    allowedPlanCodes: [],
    allowAllMembers: true,
    featured: false,
    tags: [],
    allowAnonymousComments: true,
  };
}

export function BlogFormDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: WrsBlogRecord | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<Partial<WrsBlogRecord>>(emptyForm);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [privateAudience, setPrivateAudience] =
    useState<PrivateAudience>("all");
  const [apps, setApps] = useState<TutorialAppOption[]>([
    ...TUTORIAL_TARGET_APPS,
  ]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingId = initial?.id ?? null;
  const status = (form.status ?? "draft") as BlogStatus;
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

  const previewDoc = useMemo(
    () =>
      buildArticlePreviewDocument({
        title: form.title ?? "",
        excerpt: form.excerpt ?? "",
        body: form.body ?? "",
        authorName: form.authorName ?? "",
        heroImageUrl: form.heroImageUrl,
      }),
    [form.title, form.excerpt, form.body, form.authorName, form.heroImageUrl],
  );
  const bodyIsHtml = looksLikeHtml(form.body ?? "");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAppsLoading(true);
    void fetchTutorialApps()
      .then((rows) => {
        if (!cancelled && rows.length > 0) setApps(rows);
      })
      .catch(() => {
        /* keep fallback */
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
      const nextVisibility = initial.visibility ?? "public";
      setForm({
        ...initial,
        appId: initial.appId?.trim() || nextDefault,
        visibility: nextVisibility,
        priceCents: initial.priceCents ?? 0,
        allowAllMembers:
          nextVisibility === "private"
            ? initial.allowAllMembers !== false
            : false,
      });
      setTags(initial.tags ?? []);
      setPriceInput(
        nextVisibility === "premium" && (initial.priceCents ?? 0) > 0
          ? ((initial.priceCents ?? 0) / 100).toFixed(2)
          : "",
      );
      setPrivateAudience(
        inferPrivateAudience({
          allowAllMembers:
            nextVisibility === "private"
              ? initial.allowAllMembers !== false
              : true,
          allowedPlanCodes: initial.allowedPlanCodes ?? [],
        }),
      );
      setShowMore(
        Boolean(initial.slug) ||
          (initial.tags?.length ?? 0) > 0 ||
          initial.allowAnonymousComments === false,
      );
    } else {
      setForm({ ...emptyForm(), appId: nextDefault });
      setTags([]);
      setPriceInput("");
      setPrivateAudience("all");
      setShowMore(false);
    }
    setTagDraft("");
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

  async function handleHeroChange(file: File | null) {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const url = await uploadEventsTrainingImage(file, "blog-hero");
      setForm((prev) => ({ ...prev, heroImageUrl: url }));
    } catch {
      setError("Hero image upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInsertTemplate() {
    const current = (form.body ?? "").trim();
    setError(null);

    // Empty body → starter template (local).
    if (!current) {
      setForm((p) => ({ ...p, body: resolveInsertTemplateBody("") }));
      return;
    }

    setFormatting(true);
    try {
      const result = await formatWrsBlogBodyHtml({
        body: current,
        title: form.title ?? "",
      });
      setForm((p) => ({ ...p, body: result.html }));
    } catch {
      // Offline / API not deployed yet — local HTML formatter.
      setForm((p) => ({ ...p, body: resolveInsertTemplateBody(current) }));
    } finally {
      setFormatting(false);
    }
  }

  async function handleSave() {
    if (!form.title?.trim()) {
      setError("Title is required.");
      return;
    }
    const priceCents =
      visibility === "premium" ? parsePricePesosToCents(priceInput) : 0;
    if (visibility === "premium" && priceCents <= 0) {
      setError("Premium articles need a price in PHP.");
      return;
    }

    const access =
      visibility === "private"
        ? privateAudienceAccess(privateAudience)
        : { allowAllMembers: false, allowedPlanCodes: [] as string[] };

    setSubmitting(true);
    setError(null);
    const payload = {
      ...form,
      appId: publishAppId,
      visibility,
      priceCents: visibility === "premium" ? priceCents : 0,
      allowAllMembers: access.allowAllMembers,
      allowedPlanCodes: access.allowedPlanCodes,
      tags,
      currency: "PHP",
    };

    try {
      if (editingId) {
        await updateWrsBlog(editingId, payload);
      } else {
        await createWrsBlog(payload);
      }
      await onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === "PREMIUM_PRICE_REQUIRED") {
          setError("Premium articles need a price in PHP.");
        } else if (err.message === "PRIVATE_ACCESS_REQUIRED") {
          setError("Choose who can read this article.");
        } else if (err.message === "PUBLISH_APP_REQUIRED") {
          setError("Choose a valid app from the catalog to publish to.");
        } else {
          setError(err.message || "Unable to save article.");
        }
      } else {
        setError("Unable to save article.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6">
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
        aria-labelledby="blog-form-title"
        className="relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              Article
            </p>
            <h3
              id="blog-form-title"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground"
            >
              {editingId ? "Edit article" : "New article"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Write HTML or plain text — preview updates as you type.
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {error ? (
            <p className="mb-4 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <section className="space-y-3">
                <div>
                  <label className={labelClassName} htmlFor="blog-title">
                    Title
                  </label>
                  <input
                    id="blog-title"
                    className={inputClassName}
                    placeholder="Article title"
                    value={form.title ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={labelClassName} htmlFor="blog-author">
                    Author
                  </label>
                  <input
                    id="blog-author"
                    className={inputClassName}
                    placeholder="e.g. Cecilio Sasuman"
                    value={form.authorName ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, authorName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={labelClassName} htmlFor="blog-excerpt">
                    Excerpt
                  </label>
                  <textarea
                    id="blog-excerpt"
                    className={cn(textareaClassName, "min-h-[72px]")}
                    placeholder="Short summary for listing cards"
                    value={form.excerpt ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, excerpt: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <p className={labelClassName}>Hero image</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative h-16 w-28 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
                      {form.heroImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.heroImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <ImagePlus className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer">
                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium">
                        {form.heroImageUrl ? "Replace" : "Upload"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={submitting}
                        onChange={(e) =>
                          void handleHeroChange(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    {form.heroImageUrl ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
                        onClick={() =>
                          setForm((p) => ({ ...p, heroImageUrl: null }))
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Body
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {(form.body ?? "").trim()
                        ? "AI formats your current draft into clean HTML without changing the story."
                        : "Insert a starter HTML outline, or paste plain text and format it."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full px-2.5 text-xs"
                      disabled={submitting || formatting}
                      onClick={() => void handleInsertTemplate()}
                    >
                      {formatting
                        ? "Formatting…"
                        : (form.body ?? "").trim()
                          ? "AI format as HTML"
                          : "Insert template"}
                    </Button>
                    <Badge
                      className={cn(
                        bodyIsHtml
                          ? "bg-teal-50 text-teal-800"
                          : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {bodyIsHtml ? "HTML detected" : "Plain text"}
                    </Badge>
                  </div>
                </div>
                <textarea
                  id="blog-body"
                  className={cn(
                    textareaClassName,
                    "min-h-[22rem] font-mono text-[13px] leading-relaxed",
                  )}
                  placeholder="Paste your story, then click AI format as HTML"
                  value={form.body ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, body: e.target.value }))
                  }
                  spellCheck={false}
                  disabled={formatting}
                />
              </section>

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
                  {selectedApp.label} articles{" "}
                  <code className="rounded-md bg-white px-1.5 py-0.5 text-xs text-zinc-600 ring-1 ring-zinc-200">
                    {publishAppId === "smartrefill"
                      ? "/resources/blogs"
                      : `apps/${publishAppId}`}
                  </code>
                </p>
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
                  <h4 className="text-sm font-semibold text-foreground">
                    Visibility
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Who can open this article when it is published.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {VISIBILITY_OPTIONS.map((option) => {
                    const active = visibility === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            visibility: option.value,
                            ...(option.value !== "premium"
                              ? { priceCents: 0 }
                              : null),
                          }))
                        }
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition",
                          active
                            ? "border-teal-600 bg-teal-50 shadow-sm"
                            : "border-zinc-200 bg-white hover:border-zinc-300",
                        )}
                      >
                        <span className="block text-sm font-semibold">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {visibility === "private" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {PRIVATE_AUDIENCE_OPTIONS.map((option) => {
                      const active = privateAudience === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPrivateAudience(option.value)}
                          className={cn(
                            "rounded-xl border px-2.5 py-2 text-left transition",
                            active
                              ? "border-teal-600 bg-teal-50"
                              : "border-zinc-200 bg-white",
                          )}
                        >
                          <span className="block text-xs font-semibold">
                            {option.label}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">
                            {option.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {visibility === "premium" ? (
                  <div>
                    <label className={labelClassName} htmlFor="blog-price">
                      Price (PHP)
                    </label>
                    <input
                      id="blog-price"
                      className={inputClassName}
                      inputMode="decimal"
                      placeholder="e.g. 199"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                    />
                    {priceInput.trim() ? (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Unlock for{" "}
                        {formatPricePesos(parsePricePesosToCents(priceInput))}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Status
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Published articles appear in {selectedApp.label}
                    {publishAppId === "smartrefill" ? (
                      <>
                        {" "}
                        on{" "}
                        <code className="rounded bg-zinc-100 px-1">
                          /resources/blogs
                        </code>
                      </>
                    ) : null}
                    .
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const active = status === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({ ...p, status: option.value }))
                        }
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition",
                          active
                            ? "border-teal-600 bg-teal-50 shadow-sm"
                            : "border-zinc-200 bg-white hover:border-zinc-300",
                        )}
                      >
                        <span className="block text-sm font-semibold">
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
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
                  onClick={() => setShowMore((value) => !value)}
                >
                  {showMore ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Slug, tags &amp; comments
                </button>
                {showMore ? (
                  <div className="mt-3 space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
                    <div>
                      <label className={labelClassName} htmlFor="blog-slug">
                        Slug
                      </label>
                      <input
                        id="blog-slug"
                        className={inputClassName}
                        placeholder="auto-generated if empty"
                        value={form.slug ?? ""}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, slug: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className={labelClassName} htmlFor="blog-tags">
                        Tags
                      </label>
                      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/15">
                        {tags.map((tag) => (
                          <Badge
                            key={tag}
                            className="gap-1 border-teal-200 bg-teal-50 pr-1 text-teal-800"
                          >
                            {tag}
                            <button
                              type="button"
                              className="rounded-full p-0.5 hover:bg-teal-100"
                              aria-label={`Remove ${tag}`}
                              onClick={() => removeTag(tag)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <input
                          id="blog-tags"
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
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30"
                        checked={form.allowAnonymousComments !== false}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            allowAnonymousComments: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          Allow anonymous comments
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Guests can comment without signing in.
                        </span>
                      </span>
                    </label>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="lg:sticky lg:top-0 lg:self-start">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/60 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200/80 bg-white px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Eye className="h-4 w-4 text-teal-700" />
                    Live preview
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Updates as you type
                  </span>
                </div>
                <iframe
                  title="Article preview"
                  sandbox=""
                  srcDoc={previewDoc}
                  className="h-[min(70vh,44rem)] w-full bg-white"
                />
              </div>
            </aside>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-5 py-3.5 sm:px-6">
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
                : "Create article"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
