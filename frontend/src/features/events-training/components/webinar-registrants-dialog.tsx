"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchRegistrations,
  setRegistrationAttendance,
} from "../lib/events-training-api";
import type {
  RegistrationRecord,
  RegistrationStatus,
  WebinarRecord,
} from "../lib/events-training-types";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClass(status: RegistrationStatus): string {
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-950";
  if (status === "accepted") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "declined") return "border-red-200 bg-red-50 text-red-800";
  return "bg-zinc-100 text-zinc-600";
}

export function WebinarRegistrantsDialog({
  webinar,
  onClose,
}: {
  webinar: WebinarRecord;
  onClose: () => void;
}) {
  const [items, setItems] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const rows = await fetchRegistrations({ eventId: webinar.id });
    setItems(
      [...rows].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    );
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchRegistrations({ eventId: webinar.id })
      .then((rows) => {
        if (cancelled) return;
        setItems(
          [...rows].sort((a, b) =>
            (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load registrants.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [webinar.id]);

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

  const markAttendance = async (
    item: RegistrationRecord,
    attendanceStatus: "attended" | "no_show" | "cleared",
  ) => {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      await setRegistrationAttendance(item.id, attendanceStatus);
      await reload();
    } catch {
      setError("Unable to update attendance.");
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    pending: items.filter((row) => row.status === "pending").length,
    accepted: items.filter((row) => row.status === "accepted").length,
    declined: items.filter((row) => row.status === "declined").length,
    attended: items.filter((row) => row.attendanceStatus === "attended").length,
  };

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
        aria-labelledby="webinar-registrants-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              Registrants
            </p>
            <h3
              id="webinar-registrants-title"
              className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground"
            >
              {webinar.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? "Loading…"
                : `${items.length} total · ${counts.accepted} accepted · ${counts.attended} attended · ${counts.pending} pending`}
            </p>
            {webinar.autoAccept ? (
              <p className="mt-1 text-xs font-medium text-teal-700">
                Auto-accept is on for this webinar
              </p>
            ) : null}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {loading ? (
            <div className="flex min-h-[12rem] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              Loading registrants…
            </div>
          ) : null}
          {!loading && items.length === 0 ? (
            <div className="flex min-h-[12rem] flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">
                No registrations yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Names appear here when station owners sign up.
              </p>
            </div>
          ) : null}
          {!loading && items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.email || item.userId || "Unknown member"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Signed up {formatWhen(item.createdAt)}
                        {item.attendanceStatus === "attended"
                          ? ` · Attended ${formatWhen(item.attendedAt)}`
                          : item.attendanceStatus === "no_show"
                            ? " · No-show"
                            : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className={cn("capitalize", statusClass(item.status))}>
                        {item.status}
                      </Badge>
                      {item.attendanceStatus === "attended" ? (
                        <Badge className="border-sky-200 bg-sky-50 text-sky-800">
                          Attended
                        </Badge>
                      ) : null}
                      {item.attendanceStatus === "no_show" ? (
                        <Badge className="border-zinc-200 bg-zinc-100 text-zinc-700">
                          No-show
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  {item.status === "accepted" ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full text-xs"
                        disabled={busyId === item.id}
                        onClick={() => void markAttendance(item, "attended")}
                      >
                        Mark attended
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full text-xs"
                        disabled={busyId === item.id}
                        onClick={() => void markAttendance(item, "no_show")}
                      >
                        No-show
                      </Button>
                      {item.attendanceStatus ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-full text-xs"
                          disabled={busyId === item.id}
                          onClick={() => void markAttendance(item, "cleared")}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
