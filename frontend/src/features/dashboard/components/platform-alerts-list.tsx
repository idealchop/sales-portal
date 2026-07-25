"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListPagination } from "@/components/list-pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { useDashboardAnalyticsContext } from "@/features/dashboard/components/dashboard-analytics-context";
import {
  contactPlatformAlert,
  markPlatformAlertDone,
} from "@/features/dashboard/lib/platform-alert-contact";
import { resolvePlatformAlertDataManagementPath } from "@/features/dashboard/lib/platform-alert-data-management";
import {
  buildPlatformAlertsSummary,
  dismissPlatformAlertFromSummary,
} from "@/features/dashboard/lib/platform-alert-list-state";
import {
  businessInfoPath,
  dataManagementPath,
} from "@/lib/admin/data-management-url-state";
import { cn } from "@/lib/utils";
import type {
  PlatformAlert,
  PlatformAlertKind,
} from "@/lib/dashboard/analytics";

const KIND_LABELS: Record<PlatformAlertKind, string> = {
  demo_inquiry: "Inquire for demo",
  new_user_registration: "New user register",
  subscription_change: "Subscription change",
  subscription_expiring_soon: "Expiring soon",
  subscription_grace_period: "Grace period",
};

const KIND_STYLES: Record<PlatformAlertKind, string> = {
  demo_inquiry: "bg-sky-100 text-sky-800",
  new_user_registration: "bg-emerald-100 text-emerald-800",
  subscription_change: "bg-violet-100 text-violet-800",
  subscription_expiring_soon: "bg-amber-100 text-amber-800",
  subscription_grace_period: "bg-red-100 text-red-800",
};

const KIND_FILTER_STYLES: Record<
  PlatformAlertKind,
  { active: string; inactive: string }
> = {
  demo_inquiry: {
    active: "bg-sky-600 text-white",
    inactive: "bg-sky-50 text-sky-800 hover:bg-sky-100",
  },
  new_user_registration: {
    active: "bg-emerald-600 text-white",
    inactive: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  },
  subscription_change: {
    active: "bg-violet-600 text-white",
    inactive: "bg-violet-50 text-violet-800 hover:bg-violet-100",
  },
  subscription_expiring_soon: {
    active: "bg-amber-600 text-white",
    inactive: "bg-amber-50 text-amber-800 hover:bg-amber-100",
  },
  subscription_grace_period: {
    active: "bg-red-600 text-white",
    inactive: "bg-red-50 text-red-800 hover:bg-red-100",
  },
};

const ALERT_KIND_ORDER: PlatformAlertKind[] = [
  "demo_inquiry",
  "new_user_registration",
  "subscription_change",
  "subscription_expiring_soon",
  "subscription_grace_period",
];

const ALERTS_PAGE_SIZE_OPTIONS = [5, 8, 10, 15, 20, 25] as const;
const DEFAULT_ALERTS_PAGE_SIZE = 10;
const ALERTS_RETURN_TO = "/dashboard/smartrefill#smartrefill-alerts";

type AlertKindFilter = PlatformAlertKind | "all";
type AlertsPageSize = (typeof ALERTS_PAGE_SIZE_OPTIONS)[number];
type AlertSaveMode = "contact" | "done";

function formatOccurredAt(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function decrementKindCount(
  counts: Record<PlatformAlertKind, number>,
  kind: PlatformAlertKind,
): Record<PlatformAlertKind, number> {
  return {
    ...counts,
    [kind]: Math.max(0, counts[kind] - 1),
  };
}

function PlatformAlertRow({
  item,
  isSaving,
  saveMode,
  canOpenDataManagement,
  onOpen,
  onContact,
  onMarkDone,
}: {
  item: PlatformAlert;
  isSaving: boolean;
  saveMode: AlertSaveMode | null;
  canOpenDataManagement: boolean;
  onOpen: (item: PlatformAlert) => void;
  onContact: (item: PlatformAlert) => void;
  onMarkDone: (item: PlatformAlert) => void;
}) {
  const dmHref = resolvePlatformAlertDataManagementPath(item, ALERTS_RETURN_TO);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item);
        }
      }}
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4 text-left transition",
        "cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
        item.isNew ?
          "border-teal-300 bg-teal-50/40"
        : "border-[var(--border)]",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.isNew ?
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-teal-500"
              aria-hidden
            />
          : null}
          <p className="font-medium text-foreground">{item.title}</p>
          {item.isNew ?
            <Badge className="bg-teal-600 text-white">New</Badge>
          : null}
          <Badge className={KIND_STYLES[item.kind]}>
            {KIND_LABELS[item.kind]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {item.subtitle}
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {formatOccurredAt(item.occurredAt)}
        </p>
        {canOpenDataManagement && dmHref ?
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={dmHref}
              onClick={(event) => event.stopPropagation()}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              {item.businessId ? "Open workspace →" : "Open in Data management →"}
            </Link>
          </div>
        : null}
      </div>

      <div
        className="flex shrink-0 flex-wrap items-start gap-2"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSaving}
          onClick={() => onMarkDone(item)}
          className="gap-1.5"
        >
          <Check className="h-3.5 w-3.5" />
          {isSaving && saveMode === "done" ? "Saving…" : "Mark done"}
        </Button>
        {item.email?.trim() ?
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => onContact(item)}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isSaving && saveMode === "contact" ? "Sending…" : "Contact"}
          </Button>
        : null}
      </div>
    </div>
  );
}

function PlatformAlertDetailDialog({
  item,
  isAdmin,
  isSaving,
  saveMode,
  onClose,
  onContact,
  onMarkDone,
}: {
  item: PlatformAlert;
  isAdmin: boolean;
  isSaving: boolean;
  saveMode: AlertSaveMode | null;
  onClose: () => void;
  onContact: (item: PlatformAlert) => void;
  onMarkDone: (item: PlatformAlert) => void;
}) {
  const dmHref = resolvePlatformAlertDataManagementPath(item, ALERTS_RETURN_TO);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close alert details"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-alert-detail-title"
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Alert details
            </p>
            <h2
              id="platform-alert-detail-title"
              className="text-lg font-semibold text-foreground"
            >
              {item.title}
            </h2>
            <Badge className={KIND_STYLES[item.kind]}>
              {KIND_LABELS[item.kind]}
            </Badge>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 sm:col-span-2">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">
              Summary
            </p>
            <p className="mt-0.5 text-sm text-foreground">{item.subtitle}</p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">
              When
            </p>
            <p className="mt-0.5 text-sm text-foreground">
              {formatOccurredAt(item.occurredAt)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">
              Email
            </p>
            <p className="mt-0.5 break-all text-sm text-foreground">
              {item.email?.trim() || "—"}
            </p>
          </div>
          {item.businessName ?
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Business
              </p>
              <p className="mt-0.5 text-sm text-foreground">{item.businessName}</p>
            </div>
          : null}
          {item.businessId ?
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                Workspace id
              </p>
              <p className="mt-0.5 break-all font-mono text-xs text-foreground">
                {item.businessId}
              </p>
            </div>
          : null}
          {item.userId ?
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                User id
              </p>
              <p className="mt-0.5 break-all font-mono text-xs text-foreground">
                {item.userId}
              </p>
            </div>
          : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {isAdmin && dmHref ?
            <Button type="button" size="sm" href={dmHref}>
              {item.businessId ?
                "Open data management"
              : "Search in data management"}
            </Button>
          : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={() => onMarkDone(item)}
            className="gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            {isSaving && saveMode === "done" ? "Saving…" : "Mark done"}
          </Button>
          {item.email?.trim() ?
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={() => onContact(item)}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isSaving && saveMode === "contact" ? "Sending…" : "Contact"}
            </Button>
          : null}
        </div>
      </div>
    </div>
  );
}

export function PlatformAlertsList({
  items,
  counts,
}: {
  items: PlatformAlert[];
  counts: Record<PlatformAlertKind, number>;
}) {
  const router = useRouter();
  const { profile } = useSalesProfile();
  const { setData } = useDashboardAnalyticsContext();
  const isAdmin = profile?.role === "admin";

  const [kindFilter, setKindFilter] = useState<AlertKindFilter>("all");
  const [pageSize, setPageSize] = useState<AlertsPageSize>(
    DEFAULT_ALERTS_PAGE_SIZE,
  );
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [visibleItems, setVisibleItems] = useState(() =>
    buildPlatformAlertsSummary(items).items,
  );
  const [visibleCounts, setVisibleCounts] = useState(() =>
    buildPlatformAlertsSummary(items, new Set()).counts,
  );
  const [itemsSource, setItemsSource] = useState(items);
  const [countsSource, setCountsSource] = useState(counts);
  const [savingAlertId, setSavingAlertId] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<AlertSaveMode | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<PlatformAlert | null>(null);

  if (itemsSource !== items || countsSource !== counts) {
    const summary = buildPlatformAlertsSummary(items, dismissedIds);
    setItemsSource(items);
    setCountsSource(counts);
    setVisibleItems(summary.items);
    setVisibleCounts(summary.counts);
  }

  const filteredItems = useMemo(() => {
    if (kindFilter === "all") return visibleItems;
    return visibleItems.filter((item) => item.kind === kindFilter);
  }, [visibleItems, kindFilter]);

  const resetKey = `${kindFilter}:${pageSize}`;
  const { paginatedItems, page, setPage, totalPages, totalItems } =
    usePagination(filteredItems, pageSize, resetKey);

  const headerCount =
    kindFilter === "all" ? visibleItems.length : filteredItems.length;

  function dismissAlertOptimistically(item: PlatformAlert) {
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(item.id);
      return next;
    });
    setVisibleItems((current) => current.filter((row) => row.id !== item.id));
    setVisibleCounts((current) => decrementKindCount(current, item.kind));
    setSelectedAlert((current) => (current?.id === item.id ? null : current));
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        platformAlerts: dismissPlatformAlertFromSummary(
          current.platformAlerts,
          item.id,
        ),
      };
    });
  }

  function restoreAlerts(item: PlatformAlert) {
    setDismissedIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    setVisibleItems((current) => {
      if (current.some((row) => row.id === item.id)) return current;
      return [item, ...current];
    });
    setVisibleCounts((current) => ({
      ...current,
      [item.kind]: (current[item.kind] ?? 0) + 1,
    }));
    setData((current) => {
      if (!current) return current;
      if (current.platformAlerts.items.some((row) => row.id === item.id)) {
        return current;
      }
      return {
        ...current,
        platformAlerts: buildPlatformAlertsSummary([
          item,
          ...current.platformAlerts.items,
        ]),
      };
    });
  }

  async function handleContact(item: PlatformAlert) {
    if (!item.email?.trim()) return;

    setContactError(null);
    setSavingAlertId(item.id);
    setSaveMode("contact");
    dismissAlertOptimistically(item);

    try {
      await contactPlatformAlert(item);
    } catch {
      restoreAlerts(item);
      setContactError(
        "Could not send email via Brevo. Alert was kept in the list.",
      );
    } finally {
      setSavingAlertId(null);
      setSaveMode(null);
    }
  }

  async function handleMarkDone(item: PlatformAlert) {
    setContactError(null);
    setSavingAlertId(item.id);
    setSaveMode("done");
    dismissAlertOptimistically(item);

    try {
      await markPlatformAlertDone(item);
    } catch {
      restoreAlerts(item);
      setContactError("Could not mark alert as done. Alert was kept in the list.");
    } finally {
      setSavingAlertId(null);
      setSaveMode(null);
    }
  }

  function handleOpenAlert(item: PlatformAlert) {
    if (isAdmin && item.businessId) {
      router.push(
        businessInfoPath(item.businessId, ALERTS_RETURN_TO, item.userId),
      );
      return;
    }
    if (isAdmin && !item.businessId) {
      const query = (item.email || item.title || "").trim();
      if (query) {
        router.push(
          dataManagementPath({
            tab: "owners",
            q: query,
            status: "all",
            staffRole: "all",
            subscription: "all",
            sortBy: "lastSignIn",
            sortOrder: "desc",
            page: 1,
            pageSize: 10,
          }),
        );
        return;
      }
    }
    setSelectedAlert(item);
  }

  if (visibleItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
            <Bell className="h-4 w-4 text-teal-600" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
            No alerts right now
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
              <Bell className="h-4 w-4 text-teal-600" />
              Alerts · {headerCount}
            </CardTitle>
            <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-600">
              <span className="whitespace-nowrap font-medium">Rows</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as AlertsPageSize);
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                {ALERTS_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setKindFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                kindFilter === "all" ?
                  "bg-[var(--primary)] text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
              )}
            >
              All
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  kindFilter === "all" ?
                    "bg-white/20 text-white"
                  : "bg-white text-zinc-600",
                )}
              >
                {visibleItems.length}
              </span>
            </button>
            {ALERT_KIND_ORDER.map((kind) => {
              const styles = KIND_FILTER_STYLES[kind];
              const isActive = kindFilter === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setKindFilter(kind)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                    isActive ? styles.active : styles.inactive,
                  )}
                >
                  {KIND_LABELS[kind]}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      isActive ?
                        "bg-white/20 text-white"
                      : "bg-white/80 text-inherit",
                    )}
                  >
                    {visibleCounts[kind]}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {contactError ?
            <p className="mb-3 text-sm text-red-600">{contactError}</p>
          : null}
          {filteredItems.length === 0 ?
            <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              No alerts match this filter
            </p>
          : <>
              <p className="mb-3 text-xs text-[var(--muted-foreground)]">
                Showing {paginatedItems.length} of {filteredItems.length} alert
                {filteredItems.length === 1 ? "" : "s"}
                {isAdmin ?
                  " · Click a row to open Data management"
                : " · Click a row for details"}
              </p>
              <div className="space-y-3">
                {paginatedItems.map((item) => (
                  <PlatformAlertRow
                    key={item.id}
                    item={item}
                    isSaving={savingAlertId === item.id}
                    saveMode={savingAlertId === item.id ? saveMode : null}
                    canOpenDataManagement={isAdmin}
                    onOpen={handleOpenAlert}
                    onContact={(target) => void handleContact(target)}
                    onMarkDone={(target) => void handleMarkDone(target)}
                  />
                ))}
              </div>
              <ListPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </>
          }
        </CardContent>
      </Card>

      {selectedAlert ?
        <PlatformAlertDetailDialog
          item={selectedAlert}
          isAdmin={isAdmin}
          isSaving={savingAlertId === selectedAlert.id}
          saveMode={savingAlertId === selectedAlert.id ? saveMode : null}
          onClose={() => setSelectedAlert(null)}
          onContact={(target) => void handleContact(target)}
          onMarkDone={(target) => void handleMarkDone(target)}
        />
      : null}
    </>
  );
}
