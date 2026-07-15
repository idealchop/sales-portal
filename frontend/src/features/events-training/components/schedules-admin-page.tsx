"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Globe,
  Loader2,
  Mail,
  Megaphone,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  fetchWebinarAutomation,
  fetchWebinars,
  installWebinarAutomation,
  previewWebinarAutomationMilestone,
  setWebinarAutomationEnabled,
  type WebinarAutomationPlan,
} from "../lib/events-training-api";
import type {
  ComposedWebinarScheduleMessage,
  WebinarRecord,
} from "../lib/events-training-types";

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  meta: "Meta",
  in_app: "In-app",
  push: "Push",
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(item: WebinarAutomationPlan["items"][number]): {
  label: string;
  className: string;
} {
  if (item.lastRunAt) {
    return { label: "Sent / queued", className: "bg-emerald-50 text-emerald-800" };
  }
  if (!item.enabled) {
    return { label: "Paused", className: "bg-zinc-100 text-zinc-600" };
  }
  if (item.nextRunAt && new Date(item.nextRunAt) < new Date()) {
    return { label: "Due", className: "bg-amber-50 text-amber-900" };
  }
  return { label: "Scheduled", className: "bg-sky-50 text-sky-900" };
}

export function SchedulesAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [webinars, setWebinars] = useState<WebinarRecord[]>([]);
  const [webinarId, setWebinarId] = useState("");
  const [plan, setPlan] = useState<WebinarAutomationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<ComposedWebinarScheduleMessage | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);

  const publishedWebinars = useMemo(
    () =>
      webinars
        .filter((w) => w.status === "published" || w.status === "completed")
        .sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? "")),
    [webinars],
  );

  const loadWebinars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const events = await fetchWebinars();
      setWebinars(events);
      setWebinarId((prev) => {
        if (prev && events.some((e) => e.id === prev)) return prev;
        const published = events.find((e) => e.status === "published");
        return published?.id || events[0]?.id || "";
      });
    } catch {
      setError("Unable to load webinars.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlan = useCallback(async (id: string) => {
    if (!id) {
      setPlan(null);
      return;
    }
    setPlanLoading(true);
    setError(null);
    try {
      const data = await fetchWebinarAutomation(id);
      setPlan(data);
    } catch {
      // Plan may not exist yet for older webinars.
      setPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin" && profile?.role !== "manager") {
      router.replace("/dashboard");
      return;
    }
    void loadWebinars();
  }, [loadWebinars, profile?.role, profileLoading, router]);

  useEffect(() => {
    if (!webinarId) return;
    setPreview(null);
    setPreviewKey(null);
    void loadPlan(webinarId);
  }, [loadPlan, webinarId]);

  const selectedWebinar = useMemo(
    () => webinars.find((w) => w.id === webinarId) ?? null,
    [webinarId, webinars],
  );

  async function handleInstall(fireImmediate: boolean) {
    if (!webinarId) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await installWebinarAutomation(webinarId, fireImmediate);
      setPlan(data);
      setSuccess(
        fireImmediate
          ? "Automation installed. Publish announcement was queued for Meta + email."
          : "Automation plan refreshed for this webinar.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError && err.message
          ? err.message
          : "Unable to install automation.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(enabled: boolean) {
    if (!webinarId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await setWebinarAutomationEnabled(webinarId, enabled);
      setPlan(data);
      setSuccess(
        enabled
          ? "Automation turned on for this webinar."
          : "Automation paused for this webinar.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError && err.message
          ? err.message
          : "Unable to update automation.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handlePreview(milestoneKey: string) {
    if (!webinarId) return;
    if (previewKey === milestoneKey) {
      setPreviewKey(null);
      setPreview(null);
      return;
    }
    setPreviewKey(milestoneKey);
    setPreviewLoading(true);
    setError(null);
    try {
      const data = await previewWebinarAutomationMilestone(
        webinarId,
        milestoneKey,
      );
      setPreview(data);
    } catch {
      setError("Unable to preview message.");
      setPreviewKey(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Automated promotions</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
          When you publish a webinar, we automatically queue a Meta community
          post and member email, then schedule weekly reminders and a countdown
          (7d · 3d · 2d Meta · 1d · 1h · on-going). No manual posting.
        </p>
      </div>

      {success ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <div className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{success}</p>
          </div>
          <button
            type="button"
            className="text-emerald-700 hover:underline"
            onClick={() => setSuccess(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card className="border-teal-200">
        <CardHeader className="space-y-3 border-b bg-gradient-to-r from-teal-50/70 to-white pb-4">
          <CardTitle className="text-base">Webinar plan</CardTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Webinar
              </label>
              <select
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                value={webinarId}
                onChange={(e) => setWebinarId(e.target.value)}
                disabled={loading}
              >
                <option value="">
                  {loading ? "Loading…" : "Select a webinar…"}
                </option>
                {publishedWebinars.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.status !== "published" ? ` (${w.status})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!webinarId || busy}
                onClick={() => void handleInstall(false)}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Refresh plan
              </Button>
              {selectedWebinar?.status === "published" ? (
                <Button
                  type="button"
                  disabled={!webinarId || busy}
                  onClick={() => void handleInstall(true)}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Queue publish now
                </Button>
              ) : null}
            </div>
          </div>
          {selectedWebinar ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                Starts {formatWhen(selectedWebinar.startsAt)}
              </span>
              <span>·</span>
              <span>
                {selectedWebinar.capacity == null
                  ? "Open seats"
                  : `${Math.max(0, selectedWebinar.capacity - (selectedWebinar.registrationCount || 0))} seats left`}
              </span>
              <span>·</span>
              <span>
                {selectedWebinar.certificationEnabled
                  ? "Certificate offered"
                  : "No certificate"}
              </span>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="pt-5">
          {!webinarId ? (
            <div className="rounded-2xl border border-dashed py-12 text-center">
              <Bell className="mx-auto h-6 w-6 text-zinc-400" />
              <p className="mt-3 font-medium">Pick a published webinar</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Publishing a webinar installs this plan automatically. Use this
                page to review the timeline or re-queue the publish blast.
              </p>
            </div>
          ) : null}

          {webinarId && planLoading ? (
            <p className="text-sm text-muted-foreground">Loading plan…</p>
          ) : null}

          {webinarId && !planLoading && !plan ? (
            <div className="rounded-2xl border border-dashed py-10 text-center">
              <p className="font-medium">No automation plan yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Install the automatic Meta + email timeline for this webinar.
              </p>
              <Button
                type="button"
                className="mt-4"
                disabled={busy}
                onClick={() =>
                  void handleInstall(selectedWebinar?.status === "published")
                }
              >
                Install automation
              </Button>
            </div>
          ) : null}

          {plan ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{plan.webinarName}</p>
                  <p className="text-xs text-muted-foreground">
                    Auto plan · publish → weekly → countdown → live
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      plan.automationEnabled
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-zinc-100 text-zinc-600"
                    }
                  >
                    {plan.automationEnabled ? "Automation on" : "Paused"}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void handleToggle(!plan.automationEnabled)}
                  >
                    {plan.automationEnabled ? "Pause all" : "Turn on"}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-teal-100 bg-teal-50/40 px-4 py-3 text-xs text-teal-950">
                <p className="font-semibold">What runs automatically</p>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  <li className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5" />
                    Meta: publish, weekly, 7d, 3d, 2d, 1d, 1h, on-going
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Email: publish, weekly, 7d, 3d, 1d, 1h, on-going
                  </li>
                </ul>
              </div>

              <ol className="space-y-3">
                {plan.items.map((item, index) => {
                  const tone = statusTone(item);
                  const isPreviewing = previewKey === item.milestoneKey;
                  return (
                    <li
                      key={item.milestoneKey}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800">
                              {index + 1}
                            </span>
                            <p className="font-semibold">{item.label}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.audience === "all_members"
                              ? "All members"
                              : item.audience === "registrants"
                                ? "Registrants"
                                : item.audience}
                            {" · "}
                            Next {formatWhen(item.nextRunAt)}
                            {item.lastRunAt
                              ? ` · Last ${formatWhen(item.lastRunAt)}`
                              : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge className={tone.className}>{tone.label}</Badge>
                            {item.channels.map((channel) => (
                              <Badge
                                key={channel}
                                className="bg-zinc-100 text-zinc-700"
                              >
                                {CHANNEL_LABEL[channel] || channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={previewLoading && isPreviewing}
                          onClick={() => void handlePreview(item.milestoneKey)}
                        >
                          <Megaphone className="mr-1.5 h-3.5 w-3.5" />
                          {isPreviewing ? "Hide preview" : "Preview message"}
                        </Button>
                      </div>
                      {isPreviewing ? (
                        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                          {previewLoading || !preview ? (
                            <p className="text-sm text-muted-foreground">
                              Loading preview…
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {preview.posterUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={preview.posterUrl}
                                  alt=""
                                  className="aspect-video max-w-md rounded-lg object-cover"
                                />
                              ) : null}
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                  Email
                                </p>
                                <p className="text-sm font-medium">
                                  {preview.subject}
                                </p>
                                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-zinc-700">
                                  {preview.emailBody}
                                </pre>
                              </div>
                              {item.channels.includes("meta") ? (
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                                    Meta caption
                                  </p>
                                  <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap text-xs text-zinc-700">
                                    {preview.metaCaption}
                                  </pre>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
