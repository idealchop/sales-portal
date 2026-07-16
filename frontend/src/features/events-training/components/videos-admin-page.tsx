"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Film,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPagination } from "@/components/list-pagination";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { ApiError } from "@/lib/api-client";
import { useAdminCatalogCollection } from "@/hooks/use-admin-catalog-collection";
import {
  createTrainingVideo,
  deleteTrainingVideo,
  fetchTrainingVideos,
  formatPricePesos,
  parsePricePesosToCents,
  updateTrainingVideo,
  uploadEventsTrainingImage,
} from "../lib/events-training-api";
import {
  DEFAULT_TRAINING_VIDEO_PAGE_SIZE,
  TRAINING_VIDEO_PAGE_SIZE_OPTIONS,
  countTrainingVideosByStatus,
  filterTrainingVideos,
  uniqueTrainingVideoAppIds,
  uniqueTrainingVideoProviders,
  type TrainingVideoAppFilter,
  type TrainingVideoPageSize,
  type TrainingVideoProviderFilter,
  type TrainingVideoStatusFilter,
} from "../lib/filter-training-videos";
import {
  PLAYBACK_PROVIDERS,
  VIDEO_CATEGORIES,
  VIDEO_CATEGORY_LABELS,
  VIDEO_CATEGORY_PATHS,
  pagesForTutorialApp,
  tutorialPageLabel,
  tutorialTargetAppLabel,
  VIDEO_STATUSES,
  VIDEO_VISIBILITY_LABELS,
  VIDEO_VISIBILITY_OPTIONS,
  WEBINAR_SUBCATEGORIES,
} from "../lib/events-training-types";
import type {
  PlaybackProvider,
  TrainingVideoRecord,
  TutorialTargetAppId,
  VideoCategory,
  VideoStatus,
  VideoVisibility,
} from "../lib/events-training-types";
import {
  formatDateTimeLocal,
  inputClassName,
  labelClassName,
  parseDateTimeLocal,
  sectionTitleClassName,
  textareaClassName,
} from "../lib/form-styles";
import {
  detectPlaybackProvider,
  normalizePlaybackInput,
} from "../lib/playback-input";
import { buildResourceVideoShareUrl } from "../lib/resource-share-url";
import {
  inferPrivateAudience,
  privateAudienceLabel,
} from "../lib/private-audience";
import { TutorialFormDialog } from "./tutorial-form-dialog";
import { StoryFormDialog } from "./story-form-dialog";
import { VideoDetailDialog } from "./video-detail-dialog";
import { VideoStatusPicker } from "./video-status-picker";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

type SourceMode = "url" | "embed";

type VideosAdminPageProps = {
  /** When set, only manage that category (dedicated CMS tab). */
  lockedCategory?: VideoCategory;
};

const emptyForm = (
  lockedCategory?: VideoCategory,
): Partial<TrainingVideoRecord> => ({
  name: "",
  description: "",
  recordedAt: null,
  status: "draft",
  category: lockedCategory ?? "webinar",
  subcategory:
    lockedCategory === "tutorial" || lockedCategory === "wrs_stories"
      ? null
      : "business-growth",
  appId: lockedCategory === "tutorial" ? "smartrefill" : null,
  appPages: lockedCategory === "tutorial" ? ["dashboard"] : [],
  webinarEventId: null,
  playbackProvider: "youtube",
  playbackUrl: "",
  thumbnailUrl: null,
  featured: false,
  sortOrder: 0,
  visibility: "public",
  priceCents: 0,
  currency: "PHP",
  allowedPlanCodes: [],
  allowAllMembers: false,
  certificationEnabled: false,
  tags: [],
});

function planCodeFromDoc(data: Record<string, unknown>, documentId: string): string {
  const code = typeof data.code === "string" ? data.code.trim() : "";
  return code || documentId;
}

function planLabelFromDoc(data: Record<string, unknown>, code: string): string {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  return name ? `${name} (${code})` : code;
}

function categoryLabel(category: VideoCategory): string {
  return VIDEO_CATEGORY_LABELS[category] ?? category;
}

function categoryPath(category: VideoCategory): string {
  return VIDEO_CATEGORY_PATHS[category] ?? "/resources";
}

function labelTutorialPage(page: string | null | undefined): string {
  if (!page) return "—";
  return tutorialPageLabel(page);
}

function normalizeTutorialAppPages(
  pages: string[] | null | undefined,
  appId: string | null | undefined,
  fallbackSubcategory?: string | null,
): string[] {
  const allowed = pagesForTutorialApp(appId);
  const fromArray = (pages ?? []).filter((page) => allowed.includes(page));
  if (fromArray.length > 0) return [...new Set(fromArray)];
  if (fallbackSubcategory && allowed.includes(fallbackSubcategory)) {
    return [fallbackSubcategory];
  }
  return [];
}

function formatTutorialPages(pages: string[]): string {
  if (pages.length === 0) return "No pages";
  return pages.map((page) => labelTutorialPage(page)).join(", ");
}

function resolveTutorialAppId(
  appId: string | null | undefined,
): TutorialTargetAppId {
  const trimmed = appId?.trim();
  return trimmed || "smartrefill";
}

function pageCopy(lockedCategory?: VideoCategory) {
  if (lockedCategory === "tutorial") {
    return {
      title: "Video tutorials",
      description:
        "How-to and product tutorials published to Smart Refill Resources.",
      addLabel: "Add tutorial",
      formCreateTitle: "Add tutorial",
      formEditTitle: "Edit tutorial",
      listTitle: "All tutorials",
      emptyTitle: "No tutorials yet",
      emptyHint:
        "Add a YouTube URL or paste an embed to publish a video tutorial.",
    };
  }
  if (lockedCategory === "wrs_stories") {
    return {
      title: "WRS Stories",
      description:
        "Owner success stories and webinar recordings published to Smart Refill Resources.",
      addLabel: "Add story",
      formCreateTitle: "Add story",
      formEditTitle: "Edit story",
      listTitle: "All stories & recordings",
      emptyTitle: "No stories yet",
      emptyHint:
        "Paste a YouTube or Loom link to publish a story, or mark it as a recorded webinar.",
    };
  }
  return {
    title: "Videos",
    description:
      "WRS Stories and webinar recordings published to Smart Refill Resources.",
    addLabel: "Add video",
    formCreateTitle: "Add video",
    formEditTitle: "Edit video",
    listTitle: "All videos",
    emptyTitle: "No videos yet",
    emptyHint:
      "Add a YouTube URL or paste an embed to publish a story or recording.",
  };
}

export function VideosAdminPage({ lockedCategory }: VideosAdminPageProps = {}) {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [items, setItems] = useState<TrainingVideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<TrainingVideoRecord | null>(
    null,
  );
  const [form, setForm] = useState<Partial<TrainingVideoRecord>>(() =>
    emptyForm(lockedCategory),
  );
  const [priceInput, setPriceInput] = useState("");
  const [selectedPlanCodes, setSelectedPlanCodes] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingVideoRecord | null>(
    null,
  );
  const [sourceMode, setSourceMode] = useState<SourceMode>("url");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<TrainingVideoStatusFilter>("all");
  const [appFilter, setAppFilter] = useState<TrainingVideoAppFilter>("all");
  const [providerFilter, setProviderFilter] =
    useState<TrainingVideoProviderFilter>("all");
  const [pageSize, setPageSize] = useState<TrainingVideoPageSize>(
    DEFAULT_TRAINING_VIDEO_PAGE_SIZE,
  );
  const [shareCopiedId, setShareCopiedId] = useState<string | null>(null);
  const copy = pageCopy(lockedCategory);
  const categoryOptions = lockedCategory
    ? [lockedCategory]
    : VIDEO_CATEGORIES.filter((c) => c !== "tutorial");
  const {
    documents: planDocs,
    isLoading: plansLoading,
  } = useAdminCatalogCollection("subscription_plans", formOpen);

  const subscriptionPlans = planDocs
    .map((doc) => {
      const code = planCodeFromDoc(doc.data, doc.documentId);
      return {
        code,
        label: planLabelFromDoc(doc.data, code),
        isActive: doc.data.isActive !== false,
      };
    })
    .filter((plan) => plan.isActive)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchTrainingVideos(
        lockedCategory === "tutorial"
          ? { category: "tutorial" }
          : undefined,
      );
      setItems(
        lockedCategory === "tutorial"
          ? all.filter((item) => item.category === "tutorial")
          : lockedCategory === "wrs_stories"
            ? all.filter(
                (item) =>
                  item.category === "wrs_stories" || item.category === "webinar",
              )
            : all.filter((item) => item.category !== "tutorial"),
      );
    } catch {
      setError(
        lockedCategory === "tutorial"
          ? "Unable to load tutorials."
          : lockedCategory === "wrs_stories"
            ? "Unable to load stories."
            : "Unable to load videos.",
      );
    } finally {
      setLoading(false);
    }
  }, [lockedCategory]);

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin" && profile?.role !== "manager") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [load, profile?.role, profileLoading, router]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(lockedCategory));
    setPriceInput("");
    setSelectedPlanCodes([]);
    setTags([]);
    setTagDraft("");
    setError(null);
    setSourceMode("url");
    setShowAdvanced(false);
  }

  function openCreate() {
    resetForm();
    if (lockedCategory === "tutorial") setShowAdvanced(true);
    setEditingId(null);
    setFormOpen(true);
  }

  function closeForm() {
    resetForm();
    setFormOpen(false);
  }

  function openDedicatedEdit(item: TrainingVideoRecord) {
    setViewingItem(null);
    startEdit(item);
  }

  useEffect(() => {
    if (
      !formOpen ||
      lockedCategory === "tutorial" ||
      lockedCategory === "wrs_stories"
    ) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        setEditingId(null);
        setForm(emptyForm(lockedCategory));
        setPriceInput("");
        setSelectedPlanCodes([]);
        setTags([]);
        setTagDraft("");
        setError(null);
        setSourceMode("url");
        setShowAdvanced(false);
        setFormOpen(false);
      }
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [formOpen, lockedCategory, submitting]);

  function startEdit(item: TrainingVideoRecord) {
    setEditingId(item.id);
    const isTutorial = (lockedCategory ?? item.category) === "tutorial";
    const appId = isTutorial ? resolveTutorialAppId(item.appId) : null;
    setForm({
      ...item,
      allowAllMembers: item.allowAllMembers === true,
      category: lockedCategory ?? item.category,
      subcategory: isTutorial ? null : item.subcategory,
      appId,
      appPages: isTutorial
        ? normalizeTutorialAppPages(item.appPages, appId, item.subcategory)
        : [],
    });
    setPriceInput(
      item.visibility === "premium" && item.priceCents > 0
        ? (item.priceCents / 100).toFixed(2)
        : "",
    );
    setSelectedPlanCodes(item.allowedPlanCodes ?? []);
    setTags(item.tags ?? []);
    setTagDraft("");
    setSourceMode("url");
    setShowAdvanced((item.tags ?? []).length > 0);
    setFormOpen(true);
    setError(null);
  }

  function setVisibility(visibility: VideoVisibility) {
    setForm((p) => ({
      ...p,
      visibility,
      ...(visibility === "public"
        ? { allowAllMembers: false, priceCents: 0, allowedPlanCodes: [] }
        : {}),
      ...(visibility === "premium"
        ? { allowAllMembers: false, allowedPlanCodes: [] }
        : {}),
      ...(visibility === "private" ? { priceCents: 0 } : {}),
    }));
    if (visibility !== "premium") setPriceInput("");
    if (visibility !== "private") setSelectedPlanCodes([]);
  }

  function togglePlanCode(code: string) {
    setSelectedPlanCodes((current) =>
      current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code],
    );
  }

  function selectAllPlans() {
    setSelectedPlanCodes(subscriptionPlans.map((p) => p.code));
    setForm((p) => ({ ...p, allowAllMembers: false }));
  }

  function clearPlans() {
    setSelectedPlanCodes([]);
  }

  function toggleAppPage(page: string) {
    setForm((current) => {
      const appId = resolveTutorialAppId(current.appId);
      const pages = normalizeTutorialAppPages(current.appPages, appId);
      return {
        ...current,
        appId,
        appPages: pages.includes(page)
          ? pages.filter((value) => value !== page)
          : [...pages, page],
      };
    });
  }

  function selectAllAppPages() {
    setForm((current) => {
      const appId = resolveTutorialAppId(current.appId);
      return {
        ...current,
        appId,
        appPages: [...pagesForTutorialApp(appId)],
      };
    });
  }

  function clearAppPages() {
    setForm((current) => ({ ...current, appPages: [] }));
  }

  function normalizeTag(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }

  function addTagsFromDraft(raw: string = tagDraft) {
    const next = raw
      .split(/[,]+/)
      .map(normalizeTag)
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

  function setTutorialAppId(appId: TutorialTargetAppId) {
    setForm((current) => ({
      ...current,
      appId,
      appPages: normalizeTutorialAppPages(current.appPages, appId),
    }));
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
      setError("Title and video source are required.");
      return;
    }
    const resolvedCategory = lockedCategory ?? form.category ?? "webinar";
    const visibility =
      resolvedCategory === "tutorial" ? "public" : form.visibility ?? "public";
    const priceCents =
      visibility === "premium" ? parsePricePesosToCents(priceInput) : 0;
    if (visibility === "premium" && priceCents <= 0) {
      setError("Premium videos require a price amount.");
      return;
    }
    const allowAllMembers =
      visibility === "private" && form.allowAllMembers === true;
    if (
      visibility === "private" &&
      !allowAllMembers &&
      selectedPlanCodes.length === 0
    ) {
      setError("Private videos need all members and/or at least one subscription plan.");
      return;
    }
    const resolvedAppId =
      resolvedCategory === "tutorial"
        ? resolveTutorialAppId(form.appId)
        : null;
    const resolvedAppPages =
      resolvedCategory === "tutorial"
        ? normalizeTutorialAppPages(
            form.appPages,
            resolvedAppId,
            form.subcategory,
          )
        : [];
    if (resolvedCategory === "tutorial" && !resolvedAppId) {
      setError("Select which app this tutorial is for.");
      return;
    }
    if (resolvedCategory === "tutorial" && resolvedAppPages.length === 0) {
      setError("Select at least one page for the chosen app.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const playbackProvider =
      form.playbackProvider ?? detectPlaybackProvider(playbackUrl);
    const payload = {
      ...form,
      category: resolvedCategory,
      subcategory:
        resolvedCategory === "tutorial" ? null : form.subcategory ?? null,
      appId: resolvedAppId,
      appPages: resolvedAppPages,
      playbackUrl,
      playbackProvider,
      visibility,
      featured: resolvedCategory === "tutorial" ? false : form.featured === true,
      priceCents: visibility === "premium" ? priceCents : 0,
      allowedPlanCodes:
        visibility === "private" && !allowAllMembers ? selectedPlanCodes : [],
      allowAllMembers:
        resolvedCategory === "tutorial" ? false : allowAllMembers,
      tags,
    };
    try {
      if (editingId) {
        await updateTrainingVideo(editingId, payload);
      } else {
        await createTrainingVideo(payload);
      }
      closeForm();
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === "PREMIUM_PRICE_REQUIRED") {
          setError("Premium videos require a price amount.");
        } else if (err.message === "PRIVATE_ACCESS_REQUIRED") {
          setError(
            "Private videos need all members and/or at least one subscription plan.",
          );
        } else if (err.message === "TUTORIAL_APP_REQUIRED") {
          setError("Select which app this tutorial is for.");
        } else if (err.message === "TUTORIAL_PAGES_REQUIRED") {
          setError("Select at least one page for the chosen app.");
        } else {
          setError(err.message || "Unable to save video.");
        }
      } else {
        setError("Unable to save video.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setSubmitting(true);
    setError(null);
    try {
      await deleteTrainingVideo(id);
      if (editingId === id) closeForm();
      if (viewingItem?.id === id) setViewingItem(null);
      await load();
    } catch {
      setError("Unable to delete video.");
      throw new Error("Unable to delete video.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyShareLink(item: TrainingVideoRecord) {
    const url = buildResourceVideoShareUrl({
      videoId: item.id,
      category: item.category,
    });
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopiedId(item.id);
      window.setTimeout(() => {
        setShareCopiedId((current) => (current === item.id ? null : current));
      }, 2000);
    } catch {
      setError("Unable to copy share link.");
    }
  }

  async function handleStatusChange(item: TrainingVideoRecord, status: VideoStatus) {
    if (item.status === status) return;
    setStatusUpdatingId(item.id);
    setError(null);
    try {
      const updated = await updateTrainingVideo(item.id, {
        status,
        // Keep tutorial identity explicit on every status write.
        ...(item.category === "tutorial" ? { category: "tutorial" as const } : {}),
      });
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, ...updated } : row)),
      );
      setViewingItem((current) =>
        current?.id === item.id ? { ...current, ...updated } : current,
      );
    } catch {
      setError("Unable to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function applyPlaybackInput(value: string) {
    const detected = detectPlaybackProvider(value);
    setForm((p) => ({
      ...p,
      playbackUrl: value,
      playbackProvider: detected === "other" ? p.playbackProvider : detected,
    }));
  }

  const normalizedPlaybackUrl = normalizePlaybackInput(form.playbackUrl ?? "");
  const showEmbedPreview =
    Boolean(normalizedPlaybackUrl) &&
    normalizedPlaybackUrl !== (form.playbackUrl ?? "").trim();
  const isTutorialForm = lockedCategory === "tutorial";
  const isStoryForm = lockedCategory === "wrs_stories";
  const usesDedicatedForm = isTutorialForm || isStoryForm;
  const category = (form.category ?? lockedCategory ?? "webinar") as VideoCategory;
  const showWebinarSubcategory = category !== "tutorial";
  const tutorialAppId = resolveTutorialAppId(form.appId);
  const availableAppPages = pagesForTutorialApp(tutorialAppId);
  const selectedAppPages = normalizeTutorialAppPages(
    form.appPages,
    tutorialAppId,
    form.subcategory,
  );

  const statusCounts = useMemo(
    () => countTrainingVideosByStatus(items),
    [items],
  );
  const appOptions = useMemo(() => uniqueTrainingVideoAppIds(items), [items]);
  const providerOptions = useMemo(
    () => uniqueTrainingVideoProviders(items),
    [items],
  );
  const filteredItems = useMemo(
    () =>
      filterTrainingVideos(items, {
        search: searchQuery,
        status: statusFilter,
        appId: appFilter,
        provider: providerFilter,
      }),
    [items, searchQuery, statusFilter, appFilter, providerFilter],
  );
  const listResetKey = `${searchQuery}:${statusFilter}:${appFilter}:${providerFilter}:${pageSize}`;
  const { paginatedItems, page, setPage, totalPages, totalItems } =
    usePagination(filteredItems, pageSize, listResetKey);
  const hasActiveListFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    appFilter !== "all" ||
    providerFilter !== "all";

  function clearListFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setAppFilter("all");
    setProviderFilter("all");
  }

  const tagsEditor = (
    <div className="space-y-2">
      <label className={labelClassName} htmlFor="video-tags">
        Tags
      </label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
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
          id="video-tags"
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
          placeholder={
            tags.length === 0
              ? "Type a tag and press Enter"
              : "Add another tag"
          }
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
      <p className="text-xs text-muted-foreground">
        {isTutorialForm
          ? "Optional. Press Enter or comma to add."
          : isStoryForm
            ? "Optional. Press Enter or comma to add."
            : "Press Enter or comma to add. Click × on a badge to remove."}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {copy.title}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> {copy.addLabel}
        </Button>
      </div>

      {formOpen && !usesDedicatedForm
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center sm:p-6">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
                onClick={() => {
                  if (!submitting) closeForm();
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="video-form-title"
                className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 bg-teal-50/40 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <h3
                      id="video-form-title"
                      className="text-lg font-semibold text-foreground"
                    >
                      {editingId ? copy.formEditTitle : copy.formCreateTitle}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isTutorialForm
                        ? "Add a video, pick where it shows in Smart Refill, then publish."
                        : "Paste a YouTube link or embed code, then set where it should appear."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 p-0"
                    disabled={submitting}
                    onClick={closeForm}
                    aria-label="Close form"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
                  {error ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}

            <section className="space-y-3">
              <h3 className={sectionTitleClassName}>Video source</h3>
              <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition",
                    sourceMode === "url"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setSourceMode("url")}
                >
                  URL
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition",
                    sourceMode === "embed"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setSourceMode("embed")}
                >
                  Embed HTML
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <div>
                  <label className={labelClassName} htmlFor="playback-provider">
                    Provider
                  </label>
                  <select
                    id="playback-provider"
                    className={inputClassName}
                    value={form.playbackProvider ?? "youtube"}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        playbackProvider: e.target.value as PlaybackProvider,
                      }))
                    }
                  >
                    {PLAYBACK_PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName} htmlFor="playback-source">
                    {sourceMode === "embed"
                      ? "Paste YouTube / Loom embed code"
                      : "Playback URL"}
                  </label>
                  {sourceMode === "embed" ? (
                    <textarea
                      id="playback-source"
                      className={cn(textareaClassName, "min-h-[120px] font-mono text-xs")}
                      placeholder={`<iframe width="560" height="315" src="https://www.youtube.com/embed/…" …></iframe>`}
                      value={form.playbackUrl ?? ""}
                      onChange={(e) => applyPlaybackInput(e.target.value)}
                    />
                  ) : (
                    <input
                      id="playback-source"
                      className={inputClassName}
                      placeholder="https://www.youtube.com/watch?v=… or /embed/…"
                      value={form.playbackUrl ?? ""}
                      onChange={(e) => applyPlaybackInput(e.target.value)}
                    />
                  )}
                  {showEmbedPreview ? (
                    <p className="mt-1.5 text-xs text-teal-700">
                      Embed detected — saving as{" "}
                      <span className="break-all font-medium">
                        {normalizedPlaybackUrl}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {sourceMode === "embed"
                        ? "We’ll extract the video URL from the iframe src."
                        : "Watch, share, or embed links all work."}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h3 className={sectionTitleClassName}>Details</h3>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClassName} htmlFor="video-name">
                  Title
                </label>
                <input
                  id="video-name"
                  className={inputClassName}
                  placeholder="Video title"
                  value={form.name ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClassName} htmlFor="video-description">
                  Description
                </label>
                <textarea
                  id="video-description"
                  className={textareaClassName}
                  placeholder="Short summary shown on Resources"
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
              <div className={showWebinarSubcategory ? "" : "sm:col-span-2"}>
                <p className={labelClassName}>Appears on</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClassName} htmlFor="video-app">
                      App
                    </label>
                    <input
                      id="video-app"
                      className={inputClassName}
                      value="Smart Refill"
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <label className={labelClassName} htmlFor="video-page">
                      Page
                    </label>
                    <select
                      id="video-page"
                      className={inputClassName}
                      value={form.category ?? "webinar"}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          category: e.target.value as VideoCategory,
                        }))
                      }
                    >
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {categoryLabel(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Smart Refill ·{" "}
                  <code className="rounded bg-muted px-1">
                    {categoryPath(category)}
                  </code>
                </p>
              </div>
              {showWebinarSubcategory ? (
              <div>
                <label className={labelClassName} htmlFor="video-subcategory">
                  Subcategory
                </label>
                <select
                  id="video-subcategory"
                  className={inputClassName}
                  value={form.subcategory ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, subcategory: e.target.value }))
                  }
                >
                  {WEBINAR_SUBCATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              ) : null}
              <div>
                <label className={labelClassName} htmlFor="video-recorded-at">
                  Recorded at
                </label>
                <input
                  id="video-recorded-at"
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
                <label className={labelClassName} htmlFor="video-thumbnail">
                  Thumbnail
                </label>
                <input
                  id="video-thumbnail"
                  className={cn(inputClassName, "h-auto py-2 file:mr-3")}
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
                    Optional — YouTube videos get a thumbnail automatically.
                  </p>
                )}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <h3 className={sectionTitleClassName}>
                  {isTutorialForm ? "Publish" : "Publishing"}
                </h3>
              </div>
              <div className={isTutorialForm ? "sm:col-span-3" : undefined}>
                <label className={labelClassName} htmlFor="video-status">
                  Status
                </label>
                {isTutorialForm ? (
                  <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                    {(
                      [
                        { value: "draft", label: "Draft" },
                        { value: "published", label: "Published" },
                        { value: "archived", label: "Archived" },
                      ] as const
                    ).map((option) => {
                      const active = (form.status ?? "draft") === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "rounded-md px-3 py-1.5 text-sm font-medium transition",
                            active
                              ? "bg-white text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() =>
                            setForm((p) => ({ ...p, status: option.value }))
                          }
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <select
                    id="video-status"
                    className={inputClassName}
                    value={form.status ?? "draft"}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        status: e.target.value as VideoStatus,
                      }))
                    }
                  >
                    {VIDEO_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
                {isTutorialForm ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Drafts stay internal. Published tutorials are available in
                    the selected Smart Refill pages.
                  </p>
                ) : null}
              </div>
              {!isTutorialForm ? (
                <>
              <div>
                <label className={labelClassName} htmlFor="video-visibility">
                  Visibility
                </label>
                <select
                  id="video-visibility"
                  className={inputClassName}
                  value={form.visibility ?? "public"}
                  onChange={(e) =>
                    setVisibility(e.target.value as VideoVisibility)
                  }
                >
                  {VIDEO_VISIBILITY_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {VIDEO_VISIBILITY_LABELS[v]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-zinc-300"
                    checked={form.featured === true}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, featured: e.target.checked }))
                    }
                  />
                  Featured on Resources
                </label>
              </div>

              {(form.visibility ?? "public") === "premium" ? (
                <div className="sm:col-span-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                  <label className={labelClassName} htmlFor="video-price">
                    Price amount (PHP) <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="video-price"
                    className={cn(inputClassName, "max-w-xs")}
                    inputMode="decimal"
                    placeholder="e.g. 199.00"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    required
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Required for premium videos. Viewers must pay this amount to unlock.
                  </p>
                </div>
              ) : null}

              {(form.visibility ?? "public") === "private" ? (
                <div className="sm:col-span-3 space-y-4 rounded-lg border border-teal-200 bg-teal-50/40 p-4">
                  <div>
                    <p className={sectionTitleClassName}>Private access</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose all members and/or which subscription plans can watch.
                    </p>
                  </div>

                  <label className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 rounded border-zinc-300"
                      checked={form.allowAllMembers === true}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((p) => ({ ...p, allowAllMembers: checked }));
                        if (checked) setSelectedPlanCodes([]);
                      }}
                    />
                    <span>
                      <span className="font-medium text-foreground">All members</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Any signed-in Smart Refill member can watch this video.
                      </span>
                    </span>
                  </label>

                  <div className={cn(form.allowAllMembers && "pointer-events-none opacity-50")}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <label className={cn(labelClassName, "mb-0")}>
                        Subscription plans
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-teal-700 hover:text-teal-800"
                          onClick={selectAllPlans}
                          disabled={form.allowAllMembers === true || plansLoading}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          onClick={clearPlans}
                          disabled={form.allowAllMembers === true}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    {plansLoading ? (
                      <p className="text-xs text-muted-foreground">Loading plans…</p>
                    ) : subscriptionPlans.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No active subscription plans found.
                      </p>
                    ) : (
                      <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 sm:grid-cols-2">
                        {subscriptionPlans.map((plan) => (
                          <label
                            key={plan.code}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50"
                          >
                            <input
                              type="checkbox"
                              className="size-4 rounded border-zinc-300"
                              checked={selectedPlanCodes.includes(plan.code)}
                              disabled={form.allowAllMembers === true}
                              onChange={() => togglePlanCode(plan.code)}
                            />
                            <span className="truncate">{plan.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {form.allowAllMembers
                        ? "Plan checklist is ignored while All members is on."
                        : "Select every plan that should unlock this video."}
                    </p>
                  </div>
                </div>
              ) : null}
                </>
              ) : null}
            </section>

            <div>
              {isTutorialForm ? (
                tagsEditor
              ) : (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
                    onClick={() => setShowAdvanced((v) => !v)}
                  >
                    {showAdvanced ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Tags
                    {tags.length > 0 ? (
                      <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                        {tags.length}
                      </span>
                    ) : null}
                  </button>
                  {showAdvanced ? (
                    <div className="mt-3">{tagsEditor}</div>
                  ) : null}
                </>
              )}
            </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={closeForm}
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
                        : "Create video"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isTutorialForm ? (
        <TutorialFormDialog
          open={formOpen}
          initial={
            editingId
              ? (items.find((item) => item.id === editingId) ?? null)
              : null
          }
          onClose={closeForm}
          onSaved={load}
        />
      ) : null}

      {isStoryForm ? (
        <StoryFormDialog
          open={formOpen}
          initial={
            editingId
              ? (items.find((item) => item.id === editingId) ?? null)
              : null
          }
          onClose={closeForm}
          onSaved={load}
        />
      ) : null}

      <Card>
        <CardHeader className="space-y-4 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              {copy.listTitle}
              {!loading ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredItems.length}
                  {filteredItems.length !== items.length
                    ? ` of ${items.length}`
                    : ""}
                  )
                </span>
              ) : null}
            </CardTitle>
            {items.length > 0 ? (
              <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-600">
                <span className="whitespace-nowrap font-medium">Rows</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(
                      Number(event.target.value) as TrainingVideoPageSize,
                    );
                  }}
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                >
                  {TRAINING_VIDEO_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {items.length > 0 ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={
                    isTutorialForm
                      ? "Search title, pages, tags, or link…"
                      : isStoryForm
                        ? "Search title, tags, or link…"
                        : "Search title, tags, or link…"
                  }
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-9 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 rounded-md p-1 text-zinc-400 -translate-y-1/2 hover:bg-zinc-100 hover:text-zinc-600"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "draft", label: "Draft" },
                    { id: "published", label: "Published" },
                    { id: "archived", label: "Archived" },
                  ] as const
                ).map((filter) => {
                  const active = statusFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                        active
                          ? "bg-teal-600 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                      )}
                    >
                      {filter.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          active
                            ? "bg-white/20 text-white"
                            : "bg-white text-zinc-600",
                        )}
                      >
                        {statusCounts[filter.id]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isTutorialForm && appOptions.length > 0 ? (
                  <select
                    value={appFilter}
                    onChange={(event) =>
                      setAppFilter(event.target.value as TrainingVideoAppFilter)
                    }
                    className="h-9 min-w-[10rem] rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    aria-label="Filter by app"
                  >
                    <option value="all">All apps</option>
                    {appOptions.map((appId) => (
                      <option key={appId} value={appId}>
                        {tutorialTargetAppLabel(appId)}
                      </option>
                    ))}
                  </select>
                ) : null}
                {providerOptions.length > 1 ? (
                  <select
                    value={providerFilter}
                    onChange={(event) =>
                      setProviderFilter(
                        event.target.value as TrainingVideoProviderFilter,
                      )
                    }
                    className="h-9 min-w-[9rem] rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    aria-label="Filter by provider"
                  >
                    <option value="all">All providers</option>
                    {providerOptions.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                ) : null}
                {hasActiveListFilters ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={clearListFilters}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">{copy.emptyTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {copy.emptyHint}
                </p>
              </div>
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> {copy.addLabel}
              </Button>
            </div>
          ) : null}
          {!loading && items.length > 0 && filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-6 py-10 text-center">
              <p className="font-medium text-foreground">No matches</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try another search or clear filters.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={clearListFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
          {!loading && filteredItems.length > 0 ? (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Showing {paginatedItems.length} of {filteredItems.length}{" "}
                {isTutorialForm
                  ? "tutorial"
                  : isStoryForm
                    ? "story"
                    : "video"}
                {filteredItems.length === 1 ? "" : "s"}
              </p>
              <ul className="divide-y divide-zinc-100">
                {paginatedItems.map((item) => {
                  const selected =
                    (formOpen && editingId === item.id) ||
                    viewingItem?.id === item.id;
                  const itemShareUrl = buildResourceVideoShareUrl({
                    videoId: item.id,
                    category: item.category,
                  });
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "flex cursor-pointer gap-4 rounded-lg py-4 first:pt-0 last:pb-0",
                        selected && "bg-teal-50/50 px-3 -mx-1",
                        !selected && "hover:bg-zinc-50/80",
                      )}
                      onClick={() => setViewingItem(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setViewingItem(item);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200">
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <Film className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium leading-snug text-foreground">
                          {item.name}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <VideoStatusPicker
                            value={item.status}
                            disabled={statusUpdatingId === item.id || submitting}
                            onChange={(status) => {
                              void handleStatusChange(item, status);
                            }}
                          />
                          <Badge className="bg-teal-50 text-teal-800">
                            {item.category === "tutorial"
                              ? `${tutorialTargetAppLabel(item.appId)} · ${formatTutorialPages(
                                  normalizeTutorialAppPages(
                                    item.appPages,
                                    item.appId,
                                    item.subcategory,
                                  ),
                                )}`
                              : item.category === "webinar"
                                ? "Webinar recording"
                                : categoryLabel(item.category)}
                          </Badge>
                          {item.category !== "tutorial" ? (
                            <Badge className="bg-zinc-100 text-zinc-700">
                              {item.visibility === "public"
                                ? "public"
                                : item.visibility === "private"
                                  ? "members"
                                  : "premium"}
                            </Badge>
                          ) : null}
                          {item.visibility === "private" && item.allowAllMembers ? (
                            <Badge className="bg-sky-50 text-sky-800">
                              {privateAudienceLabel("all")}
                            </Badge>
                          ) : null}
                          {item.visibility === "private" &&
                          !item.allowAllMembers &&
                          item.allowedPlanCodes.length > 0 ? (
                            <Badge className="bg-violet-50 text-violet-800">
                              {privateAudienceLabel(
                                inferPrivateAudience({
                                  allowAllMembers: false,
                                  allowedPlanCodes: item.allowedPlanCodes,
                                }),
                              )}
                            </Badge>
                          ) : null}
                          {item.featured ? (
                            <Badge className="bg-sky-50 text-sky-800">
                              featured
                            </Badge>
                          ) : null}
                          {item.visibility === "premium" && item.priceCents > 0 ? (
                            <Badge>{formatPricePesos(item.priceCents)}</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1.5 truncate text-xs text-muted-foreground">
                          {item.playbackProvider} · {item.playbackUrl}
                        </p>
                      </div>
                      <div
                        className="flex shrink-0 gap-1"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {itemShareUrl ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleCopyShareLink(item)}
                            title="Copy shareable Resources link"
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            {shareCopiedId === item.id ? "Copied" : "Link"}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            usesDedicatedForm
                              ? openDedicatedEdit(item)
                              : startEdit(item)
                          }
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(item)}
                          disabled={submitting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
                  );
                })}
              </ul>
              <ListPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      {viewingItem ? (
        <VideoDetailDialog
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={() =>
            usesDedicatedForm
              ? openDedicatedEdit(viewingItem)
              : startEdit(viewingItem)
          }
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDeleteDialog
          title="Delete this video?"
          itemLabel={deleteTarget.name}
          description="This removes the video from Resources. Comments and engagement on this item will no longer be available in the CMS."
          confirmLabel="Delete video"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  );
}
