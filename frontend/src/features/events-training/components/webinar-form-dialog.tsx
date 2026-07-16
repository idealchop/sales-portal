"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
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
  createWebinar,
  formatPricePesos,
  parsePricePesosToCents,
  updateWebinar,
  uploadEventsTrainingImage,
} from "../lib/events-training-api";
import type { WebinarRecord, WebinarStatus } from "../lib/events-training-types";
import {
  inferPrivateAudience,
  privateAudienceAccess,
  type PrivateAudience,
} from "../lib/private-audience";
import {
  formatDateTimeLocal,
  inputClassName,
  labelClassName,
  parseDateTimeLocal,
  textareaClassName,
} from "../lib/form-styles";

type WebinarAudience = PrivateAudience | "premium";

const STATUS_OPTIONS: {
  value: WebinarStatus;
  label: string;
  hint: string;
}[] = [
  { value: "draft", label: "Draft", hint: "Not listed yet" },
  { value: "published", label: "Published", hint: "Live on Resources" },
  { value: "completed", label: "Completed", hint: "Session ended" },
  { value: "cancelled", label: "Cancelled", hint: "Called off" },
  { value: "archived", label: "Archived", hint: "Hidden from list" },
];

const AUDIENCE_OPTIONS: {
  value: WebinarAudience;
  label: string;
  hint: string;
}[] = [
  {
    value: "all",
    label: "All members",
    hint: "Any signed-in station member",
  },
  {
    value: "paid",
    label: "Paid plan",
    hint: "Grow or Scale",
  },
  {
    value: "scale",
    label: "Scale plan",
    hint: "Scale only",
  },
  {
    value: "premium",
    label: "Premium",
    hint: "Pay to unlock",
  },
];

function emptyForm(): Partial<WebinarRecord> {
  return {
    name: "",
    description: "",
    tags: [],
    speaker: "",
    host: "",
    startsAt: null,
    endsAt: null,
    timezone: "Asia/Manila",
    posterUrl: null,
    status: "draft",
    visibility: "private",
    priceCents: 0,
    currency: "PHP",
    allowedPlanCodes: [],
    allowAllMembers: true,
    capacity: null,
    autoAccept: false,
    joinLink: "",
    linkedVideoId: null,
    certificationEnabled: false,
  };
}

function resolveAudience(record: Partial<WebinarRecord>): WebinarAudience {
  if (record.visibility === "premium") return "premium";
  return inferPrivateAudience({
    allowAllMembers: record.allowAllMembers !== false,
    allowedPlanCodes: record.allowedPlanCodes ?? [],
  });
}

function accessFromAudience(
  audience: WebinarAudience,
  priceCents: number,
): Pick<
  WebinarRecord,
  "visibility" | "priceCents" | "allowAllMembers" | "allowedPlanCodes"
> {
  if (audience === "premium") {
    return {
      visibility: "premium",
      priceCents,
      allowAllMembers: false,
      allowedPlanCodes: [],
    };
  }
  const privateAccess = privateAudienceAccess(audience);
  return {
    visibility: "private",
    priceCents: 0,
    allowAllMembers: privateAccess.allowAllMembers,
    allowedPlanCodes: privateAccess.allowedPlanCodes,
  };
}

function formatScheduleSummary(
  startsAt: string | null,
  endsAt: string | null,
): string | null {
  if (!startsAt) return null;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const startLabel = start.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endsAt) return startLabel;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return startLabel;
  const endLabel = end.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startLabel} → ${endLabel}`;
}

export function WebinarFormDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: WebinarRecord | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<Partial<WebinarRecord>>(emptyForm);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [capacityInput, setCapacityInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [audience, setAudience] = useState<WebinarAudience>("all");
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingId = initial?.id ?? null;
  const status = (form.status ?? "draft") as WebinarStatus;
  const scheduleSummary = formatScheduleSummary(
    form.startsAt ?? null,
    form.endsAt ?? null,
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({ ...initial });
      setTags(initial.tags ?? []);
      setCapacityInput(
        initial.capacity != null && Number.isFinite(initial.capacity)
          ? String(initial.capacity)
          : "",
      );
      setAudience(resolveAudience(initial));
      setPriceInput(
        initial.visibility === "premium" && initial.priceCents > 0
          ? (initial.priceCents / 100).toFixed(2)
          : "",
      );
      setShowMore(
        (initial.tags?.length ?? 0) > 0 ||
          initial.capacity != null ||
          initial.autoAccept === true ||
          initial.certificationEnabled,
      );
    } else {
      setForm(emptyForm());
      setTags([]);
      setCapacityInput("");
      setAudience("all");
      setPriceInput("");
      setShowMore(false);
    }
    setTagDraft("");
    setError(null);
  }, [open, initial]);

  function applyAudience(next: WebinarAudience) {
    setAudience(next);
    const priceCents =
      next === "premium" ? parsePricePesosToCents(priceInput) : 0;
    setForm((prev) => ({
      ...prev,
      ...accessFromAudience(next, priceCents),
    }));
    if (next !== "premium") setPriceInput("");
  }

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

  async function handlePosterChange(file: File | null) {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const url = await uploadEventsTrainingImage(file, "poster");
      setForm((prev) => ({ ...prev, posterUrl: url }));
    } catch {
      setError("Poster upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      setError("Title is required.");
      return;
    }
    if (form.startsAt && form.endsAt) {
      const start = new Date(form.startsAt).getTime();
      const end = new Date(form.endsAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        setError("End time must be after the start time.");
        return;
      }
    }

    const capacityTrimmed = capacityInput.trim();
    const capacity =
      capacityTrimmed === "" ? null : Number(capacityTrimmed);
    if (capacity != null && (!Number.isFinite(capacity) || capacity < 0)) {
      setError("Capacity must be a non-negative number, or left empty.");
      return;
    }

    const priceCents =
      audience === "premium" ? parsePricePesosToCents(priceInput) : 0;
    if (audience === "premium" && priceCents <= 0) {
      setError("Premium webinars need a price in PHP.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const access = accessFromAudience(audience, priceCents);
    const payload = {
      ...form,
      ...access,
      tags,
      capacity,
      joinLink: (form.joinLink ?? "").trim() || null,
      timezone: form.timezone || "Asia/Manila",
      currency: "PHP",
    };

    try {
      if (editingId) {
        await updateWebinar(editingId, payload);
      } else {
        await createWebinar(payload);
      }
      await onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === "PREMIUM_PRICE_REQUIRED") {
          setError("Premium webinars need a price in PHP.");
        } else if (err.message === "PRIVATE_ACCESS_REQUIRED") {
          setError("Choose who can register for this webinar.");
        } else {
          setError(err.message || "Unable to save webinar.");
        }
      } else {
        setError("Unable to save webinar.");
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
        aria-labelledby="webinar-form-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-2 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              Live webinar
            </p>
            <h3
              id="webinar-form-title"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground"
            >
              {editingId ? "Edit webinar" : "New webinar"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule a live session for Smart Refill Resources station owners.
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
            <div>
              <h4 className="text-sm font-semibold text-foreground">Details</h4>
              <p className="text-xs text-muted-foreground">
                A clear title and speaker help owners decide whether to join.
              </p>
            </div>
            <div>
              <label className={labelClassName} htmlFor="webinar-title">
                Title
              </label>
              <input
                id="webinar-title"
                className={inputClassName}
                placeholder="e.g. Growing your station with Smart Refill"
                value={form.name ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="webinar-description">
                Description
              </label>
              <textarea
                id="webinar-description"
                className={cn(textareaClassName, "min-h-[88px]")}
                placeholder="What attendees will learn in this session"
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="webinar-speaker">
                  Speaker
                </label>
                <input
                  id="webinar-speaker"
                  className={inputClassName}
                  placeholder="Who presents"
                  value={form.speaker ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, speaker: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelClassName} htmlFor="webinar-host">
                  Host
                </label>
                <input
                  id="webinar-host"
                  className={inputClassName}
                  placeholder="Who moderates"
                  value={form.host ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, host: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <p className={labelClassName}>Poster</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative h-20 w-36 overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200">
                  {form.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.posterUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-400">
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px]">Optional</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <label className="inline-flex cursor-pointer">
                    <span className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-zinc-300">
                      {form.posterUrl ? "Replace image" : "Upload image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={submitting}
                      onChange={(e) =>
                        void handlePosterChange(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {form.posterUrl ? (
                    <button
                      type="button"
                      className="block text-xs font-medium text-zinc-500 hover:text-zinc-800"
                      onClick={() =>
                        setForm((p) => ({ ...p, posterUrl: null }))
                      }
                    >
                      Remove poster
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Optional cover for the Resources listing.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Visibility
              </h4>
              <p className="text-xs text-muted-foreground">
                Who can see and register for this live session.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map((option) => {
                const active = audience === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => applyAudience(option.value)}
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
            {audience === "premium" ? (
              <div>
                <label className={labelClassName} htmlFor="webinar-price">
                  Price (PHP)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    ₱
                  </span>
                  <input
                    id="webinar-price"
                    className={cn(inputClassName, "pl-8")}
                    inputMode="decimal"
                    placeholder="e.g. 199"
                    value={priceInput}
                    onChange={(e) => {
                      setPriceInput(e.target.value);
                      setForm((p) => ({
                        ...p,
                        visibility: "premium",
                        priceCents: parsePricePesosToCents(e.target.value),
                        allowAllMembers: false,
                        allowedPlanCodes: [],
                      }));
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Amount owners pay to unlock registration
                  {priceInput.trim()
                    ? ` (${formatPricePesos(parsePricePesosToCents(priceInput) || 0)})`
                    : ""}
                  .
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs text-sky-900">
                {audience === "all"
                  ? "Visible to all signed-in Smart Refill members (owners, admins, and riders)."
                  : audience === "paid"
                    ? "Visible to stations on Grow or Scale (paid) subscriptions."
                    : "Visible only to stations on a Scale subscription."}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Schedule &amp; join
              </h4>
              <p className="text-xs text-muted-foreground">
                Times use the station owners&apos; local listing (Asia/Manila).
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="webinar-starts">
                  Starts at
                </label>
                <input
                  id="webinar-starts"
                  className={inputClassName}
                  type="datetime-local"
                  value={formatDateTimeLocal(form.startsAt ?? null)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      startsAt: parseDateTimeLocal(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClassName} htmlFor="webinar-ends">
                  Ends at
                </label>
                <input
                  id="webinar-ends"
                  className={inputClassName}
                  type="datetime-local"
                  value={formatDateTimeLocal(form.endsAt ?? null)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      endsAt: parseDateTimeLocal(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            {scheduleSummary ? (
              <p className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-xs text-teal-900">
                Listed as <span className="font-medium">{scheduleSummary}</span>
              </p>
            ) : null}
            <div>
              <label className={labelClassName} htmlFor="webinar-join">
                Join link
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="webinar-join"
                  className={cn(inputClassName, "pl-10")}
                  placeholder="Zoom, Meet, or YouTube Live URL"
                  value={form.joinLink ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, joinLink: e.target.value }))
                  }
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Shared with accepted registrants after you publish.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Status</h4>
              <p className="text-xs text-muted-foreground">
                Published webinars appear on{" "}
                <code className="rounded bg-zinc-100 px-1">/resources/webinars</code>
                .
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
              onClick={() => setShowMore((value) => !value)}
            >
              {showMore ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Capacity, tags &amp; certification
            </button>
            {showMore ? (
              <div className="mt-3 space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
                <div>
                  <label className={labelClassName} htmlFor="webinar-capacity">
                    Capacity
                  </label>
                  <input
                    id="webinar-capacity"
                    className={inputClassName}
                    inputMode="numeric"
                    placeholder="Leave empty for unlimited"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Caps accepted registrations when set.
                  </p>
                </div>
                <div>
                  <label className={labelClassName} htmlFor="webinar-tags">
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
                      id="webinar-tags"
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
                    checked={form.autoAccept === true}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        autoAccept: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      Auto-accept registrations
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Station owners skip the pending queue and get the join
                      link as soon as they register (still respects capacity).
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30"
                    checked={form.certificationEnabled === true}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        certificationEnabled: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      Offer certification
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Allows issuing certificates after the session for accepted
                      attendees.
                    </span>
                  </span>
                </label>
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
                : "Create webinar"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
