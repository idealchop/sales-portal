"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, ExternalLink, Eye, Plus, Search, Settings2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPagination } from "@/components/list-pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { ApiError } from "@/lib/api-client";
import {
  fetchCertifications,
  fetchTutorialApps,
  fetchWebinars,
  issueCertification,
  previewCertificationSvg,
  revokeCertification,
  setWebinarCertificateTemplate,
} from "../lib/events-training-api";
import { cn } from "@/lib/utils";
import type {
  CertificationRecord,
  TutorialAppOption,
  WebinarRecord,
} from "../lib/events-training-types";
import {
  TUTORIAL_TARGET_APPS,
  tutorialTargetAppLabel,
} from "../lib/events-training-types";
import { formatCertificateIssueDate } from "../lib/certificate-template";
import {
  DEFAULT_WEBINAR_CERT_PAGE_SIZE,
  filterEnabledWebinarCertificates,
  WEBINAR_CERT_PAGE_SIZE_OPTIONS,
  type WebinarCertAppFilter,
  type WebinarCertIssuedFilter,
  type WebinarCertPageSize,
  type WebinarCertStatusFilter,
} from "../lib/filter-webinar-certificates";
import { inputClassName, labelClassName } from "../lib/form-styles";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

function formatWebinarWhen(
  startsAt: string | null | undefined,
  timezone?: string,
): string {
  if (!startsAt) return "Date TBA";
  try {
    return new Date(startsAt).toLocaleDateString("en-PH", {
      timeZone: timezone?.trim() || "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return formatCertificateIssueDate(new Date(startsAt));
  }
}

export function CertificationsAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [items, setItems] = useState<CertificationRecord[]>([]);
  const [webinars, setWebinars] = useState<WebinarRecord[]>([]);
  const [apps, setApps] = useState<TutorialAppOption[]>([...TUTORIAL_TARGET_APPS]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<CertificationRecord | null>(
    null,
  );
  const [webinarId, setWebinarId] = useState("");
  const [appId, setAppId] = useState("smartrefill");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showManualIssue, setShowManualIssue] = useState(false);
  const [userId, setUserId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState("");
  const [listPreviewId, setListPreviewId] = useState<string | null>(null);
  const [listPreviewUrl, setListPreviewUrl] = useState<string | null>(null);
  const [listPreviewLoading, setListPreviewLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<WebinarCertStatusFilter>("all");
  const [appFilter, setAppFilter] = useState<WebinarCertAppFilter>("all");
  const [issuedFilter, setIssuedFilter] =
    useState<WebinarCertIssuedFilter>("all");
  const [pageSize, setPageSize] = useState<WebinarCertPageSize>(
    DEFAULT_WEBINAR_CERT_PAGE_SIZE,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [certs, events] = await Promise.all([
        fetchCertifications(),
        fetchWebinars(),
      ]);
      setItems(certs);
      setWebinars(events);
    } catch {
      setError("Unable to load webinar certificates.");
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

  useEffect(() => {
    let cancelled = false;
    setAppsLoading(true);
    void fetchTutorialApps()
      .then((rows) => {
        if (cancelled || rows.length === 0) return;
        const withLogos = rows.map((row) => ({
          ...row,
          logoUrl:
            row.logoUrl ||
            TUTORIAL_TARGET_APPS.find((app) => app.id === row.id)?.logoUrl ||
            null,
        }));
        setApps(withLogos);
      })
      .catch(() => {
        /* keep TUTORIAL_TARGET_APPS fallback */
      })
      .finally(() => {
        if (!cancelled) setAppsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedWebinar = useMemo(
    () => webinars.find((w) => w.id === webinarId) ?? null,
    [webinarId, webinars],
  );

  const enabledTemplates = useMemo(
    () =>
      webinars
        .filter((w) => w.certificationEnabled)
        .sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? "")),
    [webinars],
  );

  const issuedCountByWebinar = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cert of items) {
      if (cert.status !== "issued") continue;
      counts.set(cert.targetId, (counts.get(cert.targetId) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const filteredTemplates = useMemo(
    () =>
      filterEnabledWebinarCertificates({
        items: enabledTemplates,
        search: searchQuery,
        status: statusFilter,
        appId: appFilter,
        issued: issuedFilter,
        issuedCountByWebinar,
      }),
    [
      enabledTemplates,
      searchQuery,
      statusFilter,
      appFilter,
      issuedFilter,
      issuedCountByWebinar,
    ],
  );

  const listResetKey = `${searchQuery}:${statusFilter}:${appFilter}:${issuedFilter}:${pageSize}`;
  const { paginatedItems, page, setPage, totalPages, totalItems } =
    usePagination(filteredTemplates, pageSize, listResetKey);

  const statusCounts = useMemo(() => {
    const counts: Record<WebinarCertStatusFilter, number> = {
      all: enabledTemplates.length,
      draft: 0,
      published: 0,
      cancelled: 0,
      completed: 0,
      archived: 0,
    };
    for (const webinar of enabledTemplates) {
      counts[webinar.status] = (counts[webinar.status] ?? 0) + 1;
    }
    return counts;
  }, [enabledTemplates]);

  const appOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const webinar of enabledTemplates) {
      ids.add((webinar.appId ?? "").trim() || "smartrefill");
    }
    return [...ids].sort((a, b) =>
      tutorialTargetAppLabel(a, apps).localeCompare(
        tutorialTargetAppLabel(b, apps),
      ),
    );
  }, [enabledTemplates, apps]);

  const hasActiveListFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    appFilter !== "all" ||
    issuedFilter !== "all";

  function clearListFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setAppFilter("all");
    setIssuedFilter("all");
  }

  function openTemplateForWebinar(id: string) {
    setWebinarId(id);
    setFormOpen(true);
    setError(null);
  }

  function clearListPreview() {
    setListPreviewId(null);
    setListPreviewUrl(null);
  }

  async function previewCertificateForWebinar(webinar: WebinarRecord) {
    if (listPreviewId === webinar.id) {
      setListPreviewId(null);
      setListPreviewUrl(null);
      return;
    }
    setListPreviewId(webinar.id);
    setListPreviewLoading(true);
    setListPreviewUrl(null);
    setError(null);
    const brandId = webinar.appId?.trim() || apps[0]?.id || "smartrefill";
    const brand =
      apps.find((app) => app.id === brandId) ??
      ({
        id: brandId,
        label: tutorialTargetAppLabel(brandId, apps),
        pages: [],
        logoUrl:
          TUTORIAL_TARGET_APPS.find((app) => app.id === brandId)?.logoUrl ??
          null,
      } satisfies TutorialAppOption);
    try {
      const { svg } = await previewCertificationSvg({
        appLabel: brand.label,
        appId: brand.id,
        logoUrl: brand.logoUrl ?? null,
        recipientName: "Alex Rivera",
        webinarId: webinar.id,
        courseName: webinar.name,
        speaker: webinar.speaker?.trim() || "Speaker TBA",
        eventDateLabel: formatWebinarWhen(webinar.startsAt, webinar.timezone),
      });
      setListPreviewUrl(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      );
    } catch {
      setError("Unable to preview certificate.");
      setListPreviewId(null);
    } finally {
      setListPreviewLoading(false);
    }
  }

  const publishAppId =
    appId.trim() ||
    selectedWebinar?.appId?.trim() ||
    apps[0]?.id ||
    "smartrefill";
  const selectedApp =
    apps.find((app) => app.id === publishAppId) ??
    ({
      id: publishAppId,
      label: tutorialTargetAppLabel(publishAppId, apps),
      pages: [],
      logoUrl:
        TUTORIAL_TARGET_APPS.find((app) => app.id === publishAppId)?.logoUrl ??
        null,
    } satisfies TutorialAppOption);

  const webinarName = selectedWebinar?.name ?? "";
  const speaker = selectedWebinar?.speaker?.trim() || "Speaker TBA";
  const eventDateLabel = formatWebinarWhen(
    selectedWebinar?.startsAt,
    selectedWebinar?.timezone,
  );

  useEffect(() => {
    if (!selectedWebinar?.appId) return;
    setAppId((prev) =>
      prev === "smartrefill" || !prev ? selectedWebinar.appId! : prev,
    );
  }, [selectedWebinar?.appId]);

  useEffect(() => {
    if (!formOpen || !webinarId) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void previewCertificationSvg({
        appLabel: selectedApp.label,
        appId: publishAppId,
        logoUrl: selectedApp.logoUrl ?? null,
        recipientName: recipientName.trim() || "Alex Rivera",
        webinarId,
        courseName: webinarName || "Webinar",
        speaker,
        eventDateLabel,
      })
        .then(({ svg }) => {
          if (cancelled) return;
          setPreviewUrl(
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
          );
        })
        .catch(() => {
          /* keep last good preview */
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    formOpen,
    webinarId,
    selectedApp.label,
    selectedApp.logoUrl,
    publishAppId,
    recipientName,
    webinarName,
    speaker,
    eventDateLabel,
  ]);

  function resetForm() {
    setWebinarId("");
    setUserId("");
    setBusinessId("");
    setRecipientName("");
    setCertificateUrl("");
    setShowCustomUrl(false);
    setShowManualIssue(false);
    setPreviewUrl(null);
  }

  async function handleEnableTemplateFor(id: string, enabled: boolean) {
    if (!id) {
      setError("Select a webinar first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await setWebinarCertificateTemplate(id, enabled);
      setWebinars((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, certificationEnabled: enabled } : w,
        ),
      );
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : "Unable to update certificate template.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnableTemplate(enabled: boolean) {
    await handleEnableTemplateFor(webinarId, enabled);
  }

  async function handleIssue() {
    if (!webinarId || !userId.trim() || !recipientName.trim()) {
      setError("Webinar, recipient name, and member user ID are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await issueCertification({
        userId: userId.trim(),
        businessId: businessId.trim() || undefined,
        recipientName: recipientName.trim(),
        appId: publishAppId,
        targetId: webinarId,
        targetType: "webinar_event",
        title: webinarName,
        certificateUrl: showCustomUrl
          ? certificateUrl.trim() || null
          : null,
      });
      setFormOpen(false);
      resetForm();
      await load();
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : "Unable to issue certification.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await revokeCertification(revokeTarget.id);
      await load();
    } catch {
      setError("Unable to revoke certification.");
      throw new Error("Unable to revoke certification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Webinar certificates</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure the certificate template for a webinar. Members who attend
            (or finish the linked recording) can claim it in the product app.
          </p>
        </div>
        {!formOpen ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Configure template
          </Button>
        ) : null}
      </div>

      {formOpen ? (
        <Card className="border-teal-200">
          <CardHeader className="flex flex-row items-start justify-between border-b bg-teal-50/40 pb-4">
            <div>
              <CardTitle className="text-base">
                Webinar certificate template
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                The certificate shows the webinar name, speaker, and when it
                happened. Enabling the template lets attendees claim it after
                attendance.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-6 pt-5 lg:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-2">
              {error ? (
                <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="sm:col-span-2">
                <label className={labelClassName}>Webinar</label>
                <select
                  className={inputClassName}
                  value={webinarId}
                  onChange={(e) => setWebinarId(e.target.value)}
                >
                  <option value="">Select webinar…</option>
                  {webinars.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.certificationEnabled ? " · template on" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWebinar ? (
                <section className="sm:col-span-2 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Shown on the certificate
                  </h4>
                  <dl className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Webinar
                      </dt>
                      <dd className="font-medium">{webinarName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Speaker
                      </dt>
                      <dd className="font-medium">{speaker}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        When
                      </dt>
                      <dd className="font-medium">{eventDateLabel}</dd>
                    </div>
                  </dl>
                  <p className="text-[11px] text-muted-foreground">
                    Edit the webinar to change speaker or schedule — this
                    template always reads from the webinar record.
                  </p>
                </section>
              ) : null}

              <section className="sm:col-span-2 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Branding app
                </h4>
                <p className="text-xs text-muted-foreground">
                  Logo and app name stamped on the certificate.
                </p>
                {appsLoading ? (
                  <p className="text-xs text-muted-foreground">Loading apps…</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {apps.map((app) => {
                      const selected = app.id === publishAppId;
                      const monogram = (
                        app.label.replace(/[^a-zA-Z0-9]/g, "").charAt(0) ||
                        "?"
                      ).toUpperCase();
                      return (
                        <button
                          key={app.id}
                          type="button"
                          disabled={submitting || !webinarId}
                          onClick={() => setAppId(app.id)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition",
                            selected
                              ? "border-teal-500 ring-2 ring-teal-100"
                              : "border-zinc-200 hover:border-teal-300",
                          )}
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-teal-50 ring-1 ring-teal-100">
                            {app.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={app.logoUrl}
                                alt=""
                                className="h-8 w-8 object-contain"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-teal-800">
                                {monogram}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {app.label}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {app.id}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedWebinar?.certificationEnabled ? (
                    <>
                      <Badge className="bg-emerald-50 text-emerald-800">
                        Template enabled — attendees can claim
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={submitting || !webinarId}
                        onClick={() => void handleEnableTemplate(false)}
                      >
                        Disable template
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      disabled={submitting || !webinarId}
                      onClick={() => void handleEnableTemplate(true)}
                    >
                      {submitting ? "Saving…" : "Enable for attendees"}
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormOpen(false);
                    resetForm();
                  }}
                >
                  Close
                </Button>
              </div>

              <div className="sm:col-span-2 border-t pt-3">
                <button
                  type="button"
                  className="text-xs font-medium text-teal-700 hover:underline"
                  onClick={() => setShowManualIssue((v) => !v)}
                >
                  {showManualIssue
                    ? "Hide manual issue"
                    : "Manually issue to a member (ops)"}
                </button>
              </div>

              {showManualIssue ? (
                <>
                  <div className="sm:col-span-2">
                    <label className={labelClassName}>Recipient name</label>
                    <input
                      className={inputClassName}
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Name shown on the certificate"
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Member user ID</label>
                    <input
                      className={inputClassName}
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>
                      Business ID (optional)
                    </label>
                    <input
                      className={inputClassName}
                      value={businessId}
                      onChange={(e) => setBusinessId(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-teal-700 hover:underline"
                      onClick={() => setShowCustomUrl((v) => !v)}
                    >
                      {showCustomUrl
                        ? "Use generated template instead"
                        : "Override with custom certificate URL"}
                    </button>
                    {showCustomUrl ? (
                      <div className="mt-2">
                        <label className={labelClassName}>
                          Custom certificate URL
                        </label>
                        <input
                          className={inputClassName}
                          value={certificateUrl}
                          onChange={(e) => setCertificateUrl(e.target.value)}
                          placeholder="https://…"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      disabled={submitting || !webinarId}
                      onClick={() => void handleIssue()}
                    >
                      {submitting ? "Issuing…" : "Issue certificate"}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Template preview</h4>
                <Badge className="bg-zinc-100 text-zinc-700">
                  {selectedApp.label}
                </Badge>
              </div>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                {webinarId && previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Certificate template preview"
                    className="h-auto w-full"
                  />
                ) : (
                  <p className="px-4 py-16 text-center text-sm text-muted-foreground">
                    {webinarId
                      ? "Rendering preview…"
                      : "Select a webinar to preview its certificate."}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Preview uses a sample recipient. Real certificates fill in the
                member’s name when claimed or manually issued.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!formOpen && error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="space-y-4 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">
                Enabled webinar certificates
                {!loading ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredTemplates.length}
                    {filteredTemplates.length !== enabledTemplates.length
                      ? ` of ${enabledTemplates.length}`
                      : ""}
                    )
                  </span>
                ) : null}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Webinars with certification turned on — certificates are issued
                automatically when attendance is marked.
              </p>
            </div>
            {enabledTemplates.length > 0 ? (
              <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-600">
                <span className="whitespace-nowrap font-medium">Rows</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    clearListPreview();
                    setPageSize(
                      Number(event.target.value) as WebinarCertPageSize,
                    );
                  }}
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                >
                  {WEBINAR_CERT_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {enabledTemplates.length > 0 ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    clearListPreview();
                    setSearchQuery(event.target.value);
                  }}
                  placeholder="Search webinar, speaker, app, or tags…"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-9 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    onClick={() => {
                      clearListPreview();
                      setSearchQuery("");
                    }}
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
                    { id: "completed", label: "Completed" },
                    { id: "cancelled", label: "Cancelled" },
                    { id: "archived", label: "Archived" },
                  ] as const
                ).map((filter) => {
                  const active = statusFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => {
                        clearListPreview();
                        setStatusFilter(filter.id);
                      }}
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
                {appOptions.length > 0 ? (
                  <select
                    value={appFilter}
                    onChange={(event) => {
                      clearListPreview();
                      setAppFilter(event.target.value as WebinarCertAppFilter);
                    }}
                    className="h-9 min-w-[10rem] rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    aria-label="Filter by app"
                  >
                    <option value="all">All apps</option>
                    {appOptions.map((id) => (
                      <option key={id} value={id}>
                        {tutorialTargetAppLabel(id, apps)}
                      </option>
                    ))}
                  </select>
                ) : null}
                <select
                  value={issuedFilter}
                  onChange={(event) => {
                    clearListPreview();
                    setIssuedFilter(
                      event.target.value as WebinarCertIssuedFilter,
                    );
                  }}
                  className="h-9 min-w-[10rem] rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  aria-label="Filter by issued certificates"
                >
                  <option value="all">Any issued count</option>
                  <option value="issued">Has issued</option>
                  <option value="none">None issued</option>
                </select>
                {hasActiveListFilters ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      clearListPreview();
                      clearListFilters();
                    }}
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
          {!loading && enabledTemplates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12">
              <Award className="h-5 w-5 text-zinc-400" />
              <p className="font-medium">No webinar certificates enabled</p>
              <p className="text-sm text-muted-foreground">
                Configure a template and enable it for attendees.
              </p>
            </div>
          ) : null}
          {!loading &&
          enabledTemplates.length > 0 &&
          filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12">
              <Award className="h-5 w-5 text-zinc-400" />
              <p className="font-medium">No matches</p>
              <p className="text-sm text-muted-foreground">
                Try a different search or clear filters.
              </p>
              {hasActiveListFilters ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    clearListPreview();
                    clearListFilters();
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : null}
          <ul className="divide-y">
            {paginatedItems.map((webinar) => {
              const issuedForWebinar = issuedCountByWebinar.get(webinar.id) ?? 0;
              const isPreviewing = listPreviewId === webinar.id;
              return (
                <li key={webinar.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{webinar.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {webinar.speaker?.trim()
                          ? webinar.speaker
                          : "Speaker TBA"}
                        {" · "}
                        {formatWebinarWhen(webinar.startsAt, webinar.timezone)}
                        {webinar.appId
                          ? ` · ${tutorialTargetAppLabel(webinar.appId, apps)}`
                          : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-emerald-50 text-emerald-800">
                          Enabled
                        </Badge>
                        <Badge className="bg-zinc-100 text-zinc-700">
                          {webinar.status}
                        </Badge>
                        <Badge className="bg-teal-50 text-teal-900">
                          {issuedForWebinar} issued
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={listPreviewLoading && isPreviewing}
                        onClick={() => void previewCertificateForWebinar(webinar)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        {isPreviewing && listPreviewLoading
                          ? "Loading…"
                          : isPreviewing
                            ? "Hide preview"
                            : "Preview certificate"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openTemplateForWebinar(webinar.id)}
                      >
                        <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                        Configure
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={submitting}
                        onClick={() =>
                          void handleEnableTemplateFor(webinar.id, false)
                        }
                      >
                        Disable
                      </Button>
                    </div>
                  </div>
                  {isPreviewing ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                      {listPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listPreviewUrl}
                          alt={`Certificate template for ${webinar.name}`}
                          className="h-auto w-full"
                        />
                      ) : (
                        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                          Loading preview…
                        </p>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <ListPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(next) => {
              clearListPreview();
              setPage(next);
            }}
            className="mt-2"
          />
        </CardContent>
      </Card>

      {items.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Issued to members ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {item.courseName || item.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.recipientName?.trim()
                        ? `${item.recipientName} · `
                        : ""}
                      {item.userId}
                      {item.speaker ? ` · ${item.speaker}` : ""}
                      {item.eventStartsAt
                        ? ` · ${formatWebinarWhen(item.eventStartsAt)}`
                        : item.issuedAt
                          ? ` · ${new Date(item.issuedAt).toLocaleDateString(
                              "en-PH",
                              {
                                timeZone: "Asia/Manila",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}`
                          : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge
                        className={
                          item.status === "issued"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-zinc-100 text-zinc-600"
                        }
                      >
                        {item.status}
                      </Badge>
                      {item.appId ? (
                        <Badge className="bg-teal-50 text-teal-900">
                          {tutorialTargetAppLabel(item.appId, apps)}
                        </Badge>
                      ) : null}
                      {item.certificateUrl ? (
                        <a
                          href={item.certificateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
                        >
                          View certificate
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                  {item.status === "issued" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => setRevokeTarget(item)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {revokeTarget ? (
        <ConfirmDeleteDialog
          title="Revoke this certification?"
          itemLabel={
            revokeTarget.recipientName ||
            revokeTarget.title ||
            revokeTarget.userId
          }
          description="The member will no longer see this certificate as valid. You can issue a new one later if needed."
          confirmLabel="Revoke certificate"
          busyLabel="Revoking…"
          onClose={() => setRevokeTarget(null)}
          onConfirm={handleRevokeConfirm}
        />
      ) : null}
    </div>
  );
}
