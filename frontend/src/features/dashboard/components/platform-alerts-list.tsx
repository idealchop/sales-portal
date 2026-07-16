"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, Mail } from "lucide-react";
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
import { updatePlatformAlertContactStatus } from "@/features/dashboard/lib/platform-alert-contact";
import { businessInfoPath } from "@/lib/admin/data-management-url-state";
import { cn } from "@/lib/utils";
import type {
  PlatformAlert,
  PlatformAlertContactStatus,
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

const KIND_FILTER_STYLES: Record<PlatformAlertKind, { active: string; inactive: string }> = {
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

type AlertKindFilter = PlatformAlertKind | "all";
type AlertsPageSize = (typeof ALERTS_PAGE_SIZE_OPTIONS)[number];

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

function buildContactStatusMap(items: PlatformAlert[]) {
  return Object.fromEntries(
    items.map((item) => [item.id, item.contactStatus ?? "need_contact"]),
  ) as Record<string, PlatformAlertContactStatus>;
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
  contactStatus,
  isSaving,
  onContactStatusChange,
}: {
  item: PlatformAlert;
  contactStatus: PlatformAlertContactStatus;
  isSaving: boolean;
  onContactStatusChange: (
    alertId: string,
    status: PlatformAlertContactStatus,
  ) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4",
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
        <div className="mt-2 flex flex-wrap gap-2">
          {item.email ?
            <a
              href={`mailto:${item.email}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </a>
          : null}
          {item.businessId ?
            <Link
              href={businessInfoPath(item.businessId, "/dashboard#smartrefill-alerts")}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Open workspace →
            </Link>
          : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Contact status
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={contactStatus === "need_contact" ? "primary" : "outline"}
            disabled={isSaving}
            onClick={() => onContactStatusChange(item.id, "need_contact")}
            className={cn(
              contactStatus === "need_contact" &&
                "bg-amber-600 text-white hover:bg-amber-700",
            )}
          >
            Need to contact
          </Button>
          <Button
            type="button"
            size="sm"
            variant={contactStatus === "contacted" ? "primary" : "outline"}
            disabled={isSaving}
            onClick={() => onContactStatusChange(item.id, "contacted")}
            className={cn(
              contactStatus === "contacted" &&
                "bg-emerald-600 text-white hover:bg-emerald-700",
            )}
          >
            Already contacted
          </Button>
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
  const [kindFilter, setKindFilter] = useState<AlertKindFilter>("all");
  const [pageSize, setPageSize] = useState<AlertsPageSize>(
    DEFAULT_ALERTS_PAGE_SIZE,
  );
  const [visibleItems, setVisibleItems] = useState(items);
  const [visibleCounts, setVisibleCounts] = useState(counts);
  const [contactStatusById, setContactStatusById] = useState<
    Record<string, PlatformAlertContactStatus>
  >(() => buildContactStatusMap(items));
  const [itemsSource, setItemsSource] = useState(items);
  const [countsSource, setCountsSource] = useState(counts);
  const [savingAlertId, setSavingAlertId] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  if (itemsSource !== items || countsSource !== counts) {
    setItemsSource(items);
    setCountsSource(counts);
    setVisibleItems(items);
    setVisibleCounts(counts);
    setContactStatusById(buildContactStatusMap(items));
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

  async function handleContactStatusChange(
    alertId: string,
    status: PlatformAlertContactStatus,
  ) {
    const previousStatus = contactStatusById[alertId] ?? "need_contact";
    if (previousStatus === status) return;

    const alertItem = visibleItems.find((item) => item.id === alertId);
    if (!alertItem) return;

    setContactError(null);
    setSavingAlertId(alertId);
    setContactStatusById((current) => ({ ...current, [alertId]: status }));

    if (status === "contacted") {
      setVisibleItems((current) =>
        current.filter((item) => item.id !== alertId),
      );
      setVisibleCounts((current) =>
        decrementKindCount(current, alertItem.kind),
      );
    } else {
      setVisibleItems((current) =>
        current.map((item) =>
          item.id === alertId ?
            { ...item, isNew: false, contactStatus: status }
          : item,
        ),
      );
    }

    try {
      await updatePlatformAlertContactStatus(alertId, status);
    } catch {
      setContactStatusById((current) => ({
        ...current,
        [alertId]: previousStatus,
      }));
      setVisibleItems(items);
      setVisibleCounts(counts);
      setContactError("Could not save contact status. Try again.");
    } finally {
      setSavingAlertId(null);
    }
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
            </p>
            <div className="space-y-3">
              {paginatedItems.map((item) => (
                <PlatformAlertRow
                  key={item.id}
                  item={item}
                  contactStatus={contactStatusById[item.id] ?? "need_contact"}
                  isSaving={savingAlertId === item.id}
                  onContactStatusChange={handleContactStatusChange}
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
  );
}
