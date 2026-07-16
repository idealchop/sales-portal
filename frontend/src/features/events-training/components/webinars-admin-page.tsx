"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  deleteWebinar,
  fetchWebinars,
  formatPricePesos,
  updateWebinar,
} from "../lib/events-training-api";
import type { WebinarRecord, WebinarStatus } from "../lib/events-training-types";
import { tutorialTargetAppLabel } from "../lib/events-training-types";
import {
  inferPrivateAudience,
  privateAudienceLabel,
} from "../lib/private-audience";
import { WebinarFormDialog } from "./webinar-form-dialog";
import { WebinarRegistrantsDialog } from "./webinar-registrants-dialog";
import { WebinarStatusPicker } from "./webinar-status-picker";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

function formatSchedule(startsAt: string | null): string {
  if (!startsAt) return "No schedule";
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "No schedule";
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function webinarVisibilityLabel(item: WebinarRecord): string {
  if (item.visibility === "premium") {
    return item.priceCents > 0
      ? `Premium · ${formatPricePesos(item.priceCents)}`
      : "Premium";
  }
  if (item.visibility === "public") return "Public";
  return privateAudienceLabel(
    inferPrivateAudience({
      allowAllMembers: item.allowAllMembers,
      allowedPlanCodes: item.allowedPlanCodes,
    }),
  );
}

export function WebinarsAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [items, setItems] = useState<WebinarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WebinarRecord | null>(null);
  const [registrantsWebinar, setRegistrantsWebinar] =
    useState<WebinarRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebinarRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchWebinars());
    } catch {
      setError("Unable to load webinars.");
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

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
    setError(null);
  }

  function openEdit(item: WebinarRecord) {
    setEditingItem(item);
    setFormOpen(true);
    setError(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingItem(null);
  }

  async function handleStatusChange(item: WebinarRecord, status: WebinarStatus) {
    if (item.status === status) return;
    setStatusUpdatingId(item.id);
    setError(null);
    try {
      const updated = await updateWebinar(item.id, { status });
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, ...updated } : row)),
      );
      setEditingItem((current) =>
        current?.id === item.id ? { ...current, ...updated } : current,
      );
      setRegistrantsWebinar((current) =>
        current?.id === item.id ? { ...current, ...updated } : current,
      );
    } catch {
      setError("Unable to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setSubmitting(true);
    setError(null);
    try {
      await deleteWebinar(id);
      if (editingItem?.id === id) closeForm();
      if (registrantsWebinar?.id === id) setRegistrantsWebinar(null);
      await load();
    } catch {
      setError("Unable to delete webinar.");
      throw new Error("Unable to delete webinar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Live webinars
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Schedule sessions for{" "}
            <code className="rounded bg-muted px-1 text-xs">
              /resources/webinars
            </code>
            .
          </p>
        </div>
        <Button type="button" className="rounded-full" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Add webinar
        </Button>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            All webinars
            {!loading ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({items.length})
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">No webinars yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Schedule a live session to publish on /resources/webinars.
                </p>
              </div>
              <Button
                type="button"
                className="rounded-full"
                onClick={openCreate}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add webinar
              </Button>
            </div>
          ) : null}
          <ul className="divide-y divide-zinc-100">
            {items.map((item) => {
              const selected = formOpen && editingItem?.id === item.id;
              const registered = item.registrationCount || 0;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex gap-4 py-4 first:pt-0 last:pb-0",
                    selected && "rounded-lg bg-teal-50/50 px-3 -mx-1",
                  )}
                >
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200">
                    {item.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.posterUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <Calendar className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="font-medium leading-snug text-foreground">
                          {item.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <WebinarStatusPicker
                            value={item.status}
                            disabled={
                              statusUpdatingId === item.id || submitting
                            }
                            onChange={(status) => {
                              void handleStatusChange(item, status);
                            }}
                          />
                          <Badge className="bg-sky-50 text-sky-900">
                            {webinarVisibilityLabel(item)}
                          </Badge>
                          <Badge className="bg-zinc-100 text-zinc-700">
                            {tutorialTargetAppLabel(item.appId ?? "smartrefill")}
                          </Badge>
                          {item.certificationEnabled ? (
                            <Badge className="bg-violet-50 text-violet-800">
                              certification
                            </Badge>
                          ) : null}
                          {item.capacity != null ? (
                            <Badge className="bg-zinc-100 text-zinc-700">
                              cap {item.capacity}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatSchedule(item.startsAt)}
                          {item.speaker ? ` · ${item.speaker}` : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                              registered > 0
                                ? "bg-teal-50 text-teal-900 ring-1 ring-teal-100"
                                : "bg-zinc-100 text-zinc-600",
                            )}
                          >
                            <Users className="h-3.5 w-3.5" />
                            {registered} registered
                            {item.capacity != null
                              ? ` / ${item.capacity}`
                              : ""}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-full px-2.5 text-xs"
                            onClick={() => setRegistrantsWebinar(item)}
                          >
                            View names
                          </Button>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={submitting}
                          onClick={() => setDeleteTarget(item)}
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
        </CardContent>
      </Card>

      <WebinarFormDialog
        open={formOpen}
        initial={editingItem}
        onClose={closeForm}
        onSaved={load}
      />

      {registrantsWebinar ? (
        <WebinarRegistrantsDialog
          webinar={registrantsWebinar}
          onClose={() => setRegistrantsWebinar(null)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDeleteDialog
          title="Delete this webinar?"
          itemLabel={deleteTarget.name}
          description="This removes the webinar from Resources. Related registrations and promotion schedules will no longer be managed from this event."
          confirmLabel="Delete webinar"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  );
}
