"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  acceptRegistration,
  declineRegistration,
  fetchRegistrations,
  fetchWebinars,
} from "../lib/events-training-api";
import type {
  RegistrationRecord,
  WebinarRecord,
} from "../lib/events-training-types";

type View = "pending" | "accepted" | "declined" | "cancelled" | "all";

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function webinarScheduleLabel(webinar: WebinarRecord | undefined): string {
  if (!webinar?.startsAt) return "";
  return formatWhen(webinar.startsAt);
}

export function RegistrationsAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [webinars, setWebinars] = useState<WebinarRecord[]>([]);
  const [items, setItems] = useState<RegistrationRecord[]>([]);
  const [eventId, setEventId] = useState("");
  const [view, setView] = useState<View>("pending");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const webinarById = useMemo(() => {
    const map = new Map<string, WebinarRecord>();
    for (const webinar of webinars) map.set(webinar.id, webinar);
    return map;
  }, [webinars]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [regs, events] = await Promise.all([
        fetchRegistrations({
          eventId: eventId || undefined,
        }),
        fetchWebinars(),
      ]);
      setItems(regs);
      setWebinars(events);
      setSelectedIds(new Set());
    } catch {
      setError("Unable to load registrations.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin" && profile?.role !== "manager") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [load, profile?.role, profileLoading, router]);

  const counts = useMemo(() => {
    return {
      pending: items.filter((item) => item.status === "pending").length,
      accepted: items.filter((item) => item.status === "accepted").length,
      declined: items.filter((item) => item.status === "declined").length,
      cancelled: items.filter((item) => item.status === "cancelled").length,
      all: items.length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => (view === "all" ? true : item.status === view))
      .filter((item) => {
        if (!query) return true;
        const webinar = webinarById.get(item.eventId);
        return (
          item.email.toLowerCase().includes(query) ||
          item.userId.toLowerCase().includes(query) ||
          (webinar?.name ?? "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (b.status === "pending" && a.status !== "pending") return 1;
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      });
  }, [items, search, view, webinarById]);

  const selectablePending = useMemo(
    () => filtered.filter((item) => item.status === "pending"),
    [filtered],
  );

  const allPendingSelected =
    selectablePending.length > 0 &&
    selectablePending.every((item) => selectedIds.has(item.id));

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPending() {
    if (allPendingSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectablePending.map((item) => item.id)));
  }

  async function handleAccept(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await acceptRegistration(id);
      setItems((current) =>
        current.map((row) => (row.id === id ? { ...row, ...updated } : row)),
      );
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    } catch {
      setError("Unable to accept registration.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await declineRegistration(id);
      setItems((current) =>
        current.map((row) => (row.id === id ? { ...row, ...updated } : row)),
      );
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    } catch {
      setError("Unable to decline registration.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulk(action: "accept" | "decline") {
    const ids = [...selectedIds].filter((id) =>
      items.some((row) => row.id === id && row.status === "pending"),
    );
    if (ids.length === 0) return;
    if (
      action === "decline" &&
      !window.confirm(`Decline ${ids.length} registration(s)?`)
    ) {
      return;
    }

    setBulkBusy(true);
    setError(null);
    const results = await Promise.allSettled(
      ids.map((id) =>
        action === "accept" ? acceptRegistration(id) : declineRegistration(id),
      ),
    );

    const succeeded = new Map<string, RegistrationRecord>();
    results.forEach((result, index) => {
      const id = ids[index]!;
      if (result.status === "fulfilled") succeeded.set(id, result.value);
    });

    if (succeeded.size > 0) {
      setItems((current) =>
        current.map((row) => {
          const next = succeeded.get(row.id);
          return next ? { ...row, ...next } : row;
        }),
      );
    }
    setSelectedIds(new Set());
    if (succeeded.size < ids.length) {
      setError(
        `Updated ${succeeded.size} of ${ids.length}. Some registrations could not be changed.`,
      );
    }
    setBulkBusy(false);
  }

  async function copyJoinLink(item: RegistrationRecord) {
    if (!item.joinLink) return;
    try {
      await navigator.clipboard.writeText(item.joinLink);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === item.id ? null : current));
      }, 2000);
    } catch {
      setError("Unable to copy join link.");
    }
  }

  const selectedCount = [...selectedIds].filter((id) =>
    items.some((row) => row.id === id && row.status === "pending"),
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
            Sign-up queue
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Registrations
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Review pending webinar sign-ups across every session. Accept to
            unlock the join link for the member.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && counts.pending > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-amber-200/70">
              {counts.pending} pending
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={loading || bulkBusy}
            onClick={() => void load()}
          >
            <RefreshCw
              className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-teal-900/5 bg-gradient-to-b from-white via-white to-teal-50/30 shadow-[0_18px_50px_-28px_rgba(15,118,110,0.35)]">
        <div className="border-b border-zinc-100 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full max-w-xl flex-wrap rounded-full bg-zinc-100/80 p-1">
              {(
                [
                  ["pending", "To do", counts.pending],
                  ["accepted", "Accepted", counts.accepted],
                  ["declined", "Declined", counts.declined],
                  ["all", "All", counts.all],
                ] as const
              ).map(([id, label, count]) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setView(id);
                      setSelectedIds(new Set());
                    }}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition sm:flex-none",
                      active
                        ? "bg-white text-teal-900 shadow-sm ring-1 ring-teal-900/5"
                        : "text-zinc-500 hover:text-zinc-800",
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        active
                          ? id === "pending" && count > 0
                            ? "bg-amber-100 text-amber-950"
                            : "bg-zinc-100 text-zinc-600"
                          : "text-zinc-400",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:min-w-[28rem]">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  className="h-10 w-full rounded-full border border-zinc-200/90 bg-white pl-10 pr-9 text-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                  placeholder="Search email or webinar…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search registrations"
                />
                {search ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <select
                className="h-10 rounded-full border border-zinc-200/90 bg-white px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 sm:max-w-[15rem]"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                aria-label="Filter by webinar"
              >
                <option value="">All webinars</option>
                {webinars.map((webinar) => (
                  <option key={webinar.id} value={webinar.id}>
                    {webinar.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(view === "pending" || view === "all") &&
          selectablePending.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600">
                <input
                  type="checkbox"
                  className="size-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30"
                  checked={allPendingSelected}
                  onChange={toggleSelectAllPending}
                />
                Select pending on this page
                {selectedCount > 0 ? (
                  <span className="text-zinc-400">· {selectedCount} selected</span>
                ) : null}
              </label>
              {selectedCount > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    disabled={bulkBusy}
                    onClick={() => void handleBulk("accept")}
                  >
                    {bulkBusy ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Accept selected
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={bulkBusy}
                    onClick={() => void handleBulk("decline")}
                  >
                    <UserRoundX className="mr-1.5 h-3.5 w-3.5" />
                    Decline selected
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="px-3 py-4 sm:px-5">
          {error ? (
            <p className="mb-3 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
              Loading registrations…
            </div>
          ) : null}

          {!loading && filtered.length === 0 ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center px-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <Users className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-semibold text-foreground">
                {view === "pending" ? "No pending sign-ups" : "Queue is empty"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {view === "pending"
                  ? "New webinar registrations land here for Accept or Decline."
                  : search || eventId
                    ? "Try clearing search or choosing All webinars."
                    : "Member sign-ups will appear as owners register."}
              </p>
              {(search || eventId || view !== "pending") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full"
                  onClick={() => {
                    setSearch("");
                    setEventId("");
                    setView("pending");
                  }}
                >
                  Reset filters
                </Button>
              )}
            </div>
          ) : null}

          {!loading && filtered.length > 0 ? (
            <ul className="space-y-2.5">
              {filtered.map((item) => {
                const webinar = webinarById.get(item.eventId);
                const pending = item.status === "pending";
                const selected = selectedIds.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-2xl border bg-white px-4 py-4 shadow-sm transition",
                      pending
                        ? "border-amber-200/90 bg-amber-50/15"
                        : "border-zinc-200/80",
                      selected && "ring-2 ring-teal-500/25",
                    )}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 flex-1 gap-3">
                        {pending ? (
                          <input
                            type="checkbox"
                            className="mt-1 size-4 shrink-0 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30"
                            checked={selected}
                            onChange={() => toggleSelected(item.id)}
                            aria-label={`Select ${item.email || item.userId}`}
                          />
                        ) : null}
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-foreground">
                              {item.email || item.userId}
                            </p>
                            <Badge
                              className={cn(
                                "capitalize",
                                item.status === "pending" &&
                                  "border-amber-200 bg-amber-50 text-amber-950",
                                item.status === "accepted" &&
                                  "border-emerald-200 bg-emerald-50 text-emerald-800",
                                item.status === "declined" &&
                                  "border-red-200 bg-red-50 text-red-800",
                                item.status === "cancelled" &&
                                  "bg-zinc-100 text-zinc-600",
                              )}
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-800">
                            {webinar?.name ?? "Unknown webinar"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[
                              webinarScheduleLabel(webinar),
                              item.createdAt
                                ? `Signed up ${formatWhen(item.createdAt)}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {item.status === "accepted" && item.joinLink ? (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <a
                                href={item.joinLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
                              >
                                Open join link
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
                                onClick={() => void copyJoinLink(item)}
                              >
                                <Copy className="h-3 w-3" />
                                {copiedId === item.id ? "Copied" : "Copy link"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {pending ? (
                        <div className="flex shrink-0 flex-wrap gap-1.5 lg:justify-end">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full"
                            disabled={busyId === item.id || bulkBusy}
                            onClick={() => void handleAccept(item.id)}
                          >
                            {busyId === item.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            disabled={busyId === item.id || bulkBusy}
                            onClick={() => void handleDecline(item.id)}
                          >
                            <UserRoundX className="mr-1.5 h-3.5 w-3.5" />
                            Decline
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}
