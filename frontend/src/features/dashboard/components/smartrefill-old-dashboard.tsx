"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Building2,
  Package,
  Receipt,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  HorizontalBarChart,
  PlanPieChart,
} from "@/components/charts/distribution-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaginatedList } from "@/components/paginated-list";
import { ListPagination } from "@/components/list-pagination";
import { BusinessLocationsMap } from "@/features/dashboard/components/business-locations-map";
import { BrevoOutreachButton } from "@/features/dashboard/components/brevo-outreach-button";
import { DashboardAppNav } from "@/features/dashboard/components/dashboard-app-nav";
import {
  DashboardSegmentTabs,
  type DashboardSegmentTab,
} from "@/features/dashboard/components/dashboard-segment-tabs";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import { ConfirmDeleteDialog } from "@/features/events-training/components/confirm-delete-dialog";
import { useLegacySmartRefillAnalytics } from "@/hooks/use-legacy-smartrefill-analytics";
import { usePagination } from "@/hooks/use-pagination";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  contactLegacySmartRefillStation,
  deleteLegacySmartRefillStation,
  bulkContactLegacySmartRefillStations,
  bulkDeleteLegacySmartRefillStations,
  bulkIgnoreLegacySmartRefillStations,
  fetchLegacySmartRefillStationDetail,
  ignoreLegacySmartRefillStation,
  restoreLegacySmartRefillStation,
} from "@/lib/dashboard/fetch-legacy-smartrefill-analytics";
import type { BusinessMapLocation } from "@/lib/dashboard/analytics";
import type {
  LegacySmartRefillCustomer,
  LegacySmartRefillLead,
  LegacySmartRefillStation,
  LegacySmartRefillStationDetail,
  LegacySmartRefillTransaction,
  LegacyStationTriageStatus,
} from "@/lib/dashboard/legacy-smartrefill-analytics";
import { ApiError } from "@/lib/api-client";
import { formatPhp } from "@/lib/format";
import { cn } from "@/lib/utils";

type LegacyTab = "overview" | "businesses" | "map" | "leads";
type StationPanelTab = "customers" | "transactions";
type BusinessQueueTab = "triage" | "handled";
type HandledStatusFilter = "all" | "contacted" | "ignored";

type BusinessActivityFilter =
  | "all"
  | "active"
  | "inactive"
  | "has_customers"
  | "has_transactions"
  | "mapped"
  | "onboarded";

type BusinessSort =
  | "revenue_desc"
  | "customers_desc"
  | "transactions_desc"
  | "unpaid_desc"
  | "last_delivery_desc"
  | "name_asc"
  | "name_desc";

const BUSINESS_PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 50, 75, 100] as const;
type BusinessPageSize = (typeof BUSINESS_PAGE_SIZE_OPTIONS)[number];
const DEFAULT_BUSINESS_PAGE_SIZE: BusinessPageSize = 25;

const ACTIVITY_FILTER_OPTIONS: Array<{
  id: BusinessActivityFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "active", label: "Has activity" },
  { id: "inactive", label: "No activity" },
  { id: "has_customers", label: "Has customers" },
  { id: "has_transactions", label: "Has txs" },
  { id: "mapped", label: "On map" },
  { id: "onboarded", label: "Onboarded" },
];

const SORT_OPTIONS: Array<{ id: BusinessSort; label: string }> = [
  { id: "revenue_desc", label: "Revenue (high → low)" },
  { id: "customers_desc", label: "Customers (high → low)" },
  { id: "transactions_desc", label: "Transactions (high → low)" },
  { id: "unpaid_desc", label: "Unpaid (high → low)" },
  { id: "last_delivery_desc", label: "Last delivery (newest)" },
  { id: "name_asc", label: "Name (A → Z)" },
  { id: "name_desc", label: "Name (Z → A)" },
];

function matchesActivityFilter(
  station: LegacySmartRefillStation,
  filter: BusinessActivityFilter,
): boolean {
  switch (filter) {
  case "active":
    return station.customerCount + station.deliveryCount > 0;
  case "inactive":
    return station.customerCount + station.deliveryCount === 0;
  case "has_customers":
    return station.customerCount > 0;
  case "has_transactions":
    return station.deliveryCount > 0;
  case "mapped":
    return station.lat != null && station.lng != null;
  case "onboarded":
    return station.onboardingComplete;
  default:
    return true;
  }
}

function sortStations(
  stations: LegacySmartRefillStation[],
  sort: BusinessSort,
): LegacySmartRefillStation[] {
  const rows = stations.slice();
  rows.sort((a, b) => {
    switch (sort) {
    case "revenue_desc":
      return b.revenueTotal - a.revenueTotal || a.businessName.localeCompare(b.businessName);
    case "customers_desc":
      return b.customerCount - a.customerCount || a.businessName.localeCompare(b.businessName);
    case "transactions_desc":
      return b.deliveryCount - a.deliveryCount || a.businessName.localeCompare(b.businessName);
    case "unpaid_desc":
      return b.unpaidTotal - a.unpaidTotal || a.businessName.localeCompare(b.businessName);
    case "last_delivery_desc": {
      const aMs = a.lastDeliveryAt ? Date.parse(a.lastDeliveryAt) : 0;
      const bMs = b.lastDeliveryAt ? Date.parse(b.lastDeliveryAt) : 0;
      return bMs - aMs || a.businessName.localeCompare(b.businessName);
    }
    case "name_desc":
      return b.businessName.localeCompare(a.businessName);
    case "name_asc":
    default:
      return a.businessName.localeCompare(b.businessName);
    }
  });
  return rows;
}

const LEAD_LABELS: Record<LegacySmartRefillLead["kind"], string> = {
  inquiry: "Inquiry",
  demo_request: "Demo request",
  business_inquiry: "Business inquiry",
};

const TX_PAGE_SIZE = 50;

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SnapshotStat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {value}
          </p>
          {hint ?
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
          : null}
        </div>
        <div className="rounded-lg bg-amber-50 p-2 text-amber-800">{icon}</div>
      </div>
    </div>
  );
}

function toMapLocations(
  stations: LegacySmartRefillStation[],
): BusinessMapLocation[] {
  return stations
    .filter(
      (station) =>
        typeof station.lat === "number" && typeof station.lng === "number",
    )
    .map((station) => ({
      id: station.id,
      name: station.businessName,
      lat: station.lat as number,
      lng: station.lng as number,
      address: station.address || undefined,
      onboardingComplete: station.onboardingComplete,
      customers: station.customerCount,
      transactionsLast30Days: station.deliveryCount,
      appLabel: "Legacy",
    }));
}

function LeadRow({ lead }: { lead: LegacySmartRefillLead }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{lead.name}</p>
            <Badge className="bg-amber-100 text-amber-900">
              {LEAD_LABELS[lead.kind]}
            </Badge>
          </div>
          {lead.businessName ?
            <p className="mt-1 text-sm text-foreground">{lead.businessName}</p>
          : null}
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {lead.subtitle}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {formatWhen(lead.occurredAt)}
          </p>
        </div>
        {lead.email ?
          <BrevoOutreachButton
            toEmail={lead.email}
            recipientName={lead.name}
            businessName={lead.businessName || undefined}
            subtitle={lead.subtitle}
            label="Email"
          />
        : null}
      </div>
    </div>
  );
}

function StationListRow({
  station,
  checked,
  mode,
  selectable,
  canDelete,
  busyAction,
  onToggleChecked,
  onSelect,
  onContact,
  onIgnore,
  onRestore,
  onDelete,
}: {
  station: LegacySmartRefillStation;
  checked: boolean;
  mode: BusinessQueueTab;
  selectable: boolean;
  canDelete: boolean;
  busyAction: "contact" | "ignore" | "restore" | "delete" | null;
  onToggleChecked: () => void;
  onSelect: () => void;
  onContact: () => void;
  onIgnore: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const busy = busyAction != null;
  const status = station.triageStatus ?? "open";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition",
        checked ?
          "border-amber-400 bg-amber-50/60"
        : "border-[var(--border)] hover:border-amber-200 hover:bg-amber-50/30",
      )}
    >
      <div className="flex items-start gap-3">
        {selectable ?
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
            checked={checked}
            disabled={busy}
            onChange={onToggleChecked}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select ${station.businessName}`}
          />
        : null}
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{station.businessName}</p>
                {mode === "handled" ?
                  <Badge
                    className={
                      status === "ignored" ?
                        "bg-zinc-200 text-zinc-800"
                      : "bg-emerald-100 text-emerald-800"
                    }
                  >
                    {status === "ignored" ? "Ignored" : "Contacted"}
                  </Badge>
                : null}
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {station.ownerName}
                {station.email ? ` · ${station.email}` : ""}
              </p>
              {station.address ?
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {station.address}
                </p>
              : null}
              {mode === "handled" ?
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {status === "ignored" ?
                    `Ignored ${formatWhen(station.ignoredAt)}`
                  : `Contacted ${formatWhen(station.contactedAt)}`}
                </p>
              : null}
            </div>
            <div className="text-right text-xs tabular-nums text-[var(--muted-foreground)]">
              <p>{station.customerCount} customers</p>
              <p>{station.deliveryCount} txs</p>
              <p className="font-medium text-foreground">
                {formatPhp(station.revenueTotal)}
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
        {mode === "triage" ?
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !station.email?.trim()}
              title={
                station.email?.trim() ?
                  undefined
                : "No email on this station"
              }
              onClick={(event) => {
                event.stopPropagation();
                onContact();
              }}
            >
              {busyAction === "contact" ? "Sending…" : "Contact"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                onIgnore();
              }}
            >
              {busyAction === "ignore" ? "Ignoring…" : "Ignore"}
            </Button>
          </>
        : <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onRestore();
            }}
          >
            {busyAction === "restore" ? "Restoring…" : "Back to triage"}
          </Button>
        }
        {canDelete ?
          <Button
            type="button"
            size="sm"
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            {busyAction === "delete" ? "Deleting…" : "Delete"}
          </Button>
        : null}
      </div>
    </div>
  );
}

function CustomerRow({ customer }: { customer: LegacySmartRefillCustomer }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{customer.name}</p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {[customer.phone, customer.email].filter(Boolean).join(" · ") ||
              "No contact"}
          </p>
          {customer.address ?
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {customer.address}
            </p>
          : null}
        </div>
        <div className="text-right text-xs text-[var(--muted-foreground)]">
          {customer.containerType ?
            <p>{customer.containerType}</p>
          : null}
          {customer.pricePerBottle != null ?
            <p>{formatPhp(customer.pricePerBottle)} / bottle</p>
          : null}
          <p>Last order {formatWhen(customer.lastOrder)}</p>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ tx }: { tx: LegacySmartRefillTransaction }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{tx.customerName}</p>
            {tx.deliveryType ?
              <Badge className="bg-zinc-100 text-zinc-700">{tx.deliveryType}</Badge>
            : null}
            {tx.status ?
              <Badge className="bg-teal-50 text-teal-800">{tx.status}</Badge>
            : null}
          </div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {formatWhen(tx.date)}
            {tx.referenceNumber ? ` · ${tx.referenceNumber}` : ""}
            {tx.deliveredBy ? ` · by ${tx.deliveredBy}` : ""}
          </p>
          {tx.notes ?
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{tx.notes}</p>
          : null}
        </div>
        <div className="text-right text-xs tabular-nums">
          <p className="font-medium text-foreground">{formatPhp(tx.amount)}</p>
          <p className="text-[var(--muted-foreground)]">{tx.bottles} bottles</p>
          {tx.unpaidAmount > 0 ?
            <p className="text-amber-700">Unpaid {formatPhp(tx.unpaidAmount)}</p>
          : null}
        </div>
      </div>
    </div>
  );
}

function StationDetailPanel({
  stationId,
  onBack,
}: {
  stationId: string;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<LegacySmartRefillStationDetail | null>(
    null,
  );
  const [panelTab, setPanelTab] = useState<StationPanelTab>("customers");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<
    LegacySmartRefillTransaction[]
  >([]);

  const load = useCallback(
    async (offset = 0, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const result = await fetchLegacySmartRefillStationDetail({
          stationId,
          offset,
          limit: TX_PAGE_SIZE,
        });
        setDetail(result);
        setTransactions((current) =>
          append ? [...current, ...result.transactions] : result.transactions,
        );
        setError(null);
      } catch {
        setError("Could not load station customers and transactions.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [stationId],
  );

  useEffect(() => {
    setTransactions([]);
    void load(0, false);
  }, [load]);

  if (loading && !detail) {
    return (
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-white p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-zinc-200" />
        <div className="h-40 animate-pulse rounded bg-zinc-100" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-red-800">{error || "Station unavailable."}</p>
          <Button type="button" size="sm" variant="outline" onClick={onBack}>
            Back to businesses
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { station, customers, transactionPage } = detail;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All businesses
          </button>
          <h2 className="text-base font-semibold text-foreground">
            {station.businessName}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {station.ownerName}
            {station.email ? ` · ${station.email}` : ""}
          </p>
          {station.address ?
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {station.address}
            </p>
          : null}
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-xs tabular-nums sm:grid-cols-4">
          <div className="rounded-lg border p-2">
            <p className="text-[var(--muted-foreground)]">Customers</p>
            <p className="text-sm font-semibold">{station.customerCount}</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-[var(--muted-foreground)]">Transactions</p>
            <p className="text-sm font-semibold">{station.deliveryCount}</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-[var(--muted-foreground)]">Revenue</p>
            <p className="text-sm font-semibold">
              {formatPhp(station.revenueTotal)}
            </p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-[var(--muted-foreground)]">Unpaid</p>
            <p className="text-sm font-semibold">
              {formatPhp(station.unpaidTotal)}
            </p>
          </div>
        </div>
      </div>

      <DashboardSegmentTabs
        tabs={[
          { id: "customers", label: "Customers", count: customers.length },
          {
            id: "transactions",
            label: "Transactions",
            count: transactionPage.total,
          },
        ]}
        activeId={panelTab}
        onChange={(id) => setPanelTab(id as StationPanelTab)}
      />

      {panelTab === "customers" ?
        <PaginatedList
          items={customers}
          pageSize={15}
          className="space-y-2"
          emptyMessage="No customers for this station."
          renderItem={(customer) => (
            <CustomerRow key={customer.id} customer={customer} />
          )}
        />
      : <div className="space-y-3">
          {transactions.length === 0 ?
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              No transactions for this station.
            </p>
          : transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
          {transactionPage.hasMore ||
          transactions.length < transactionPage.total ?
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loadingMore}
                onClick={() => void load(transactions.length, true)}
              >
                {loadingMore ?
                  "Loading…"
                : `Load more (${transactions.length} / ${transactionPage.total})`}
              </Button>
            </div>
          : null}
        </div>
      }
    </div>
  );
}

export function SmartRefillOldDashboard() {
  const { profile } = useSalesProfile();
  const { data, setData, isLoading, isRefreshing, error, computedAt, refresh } =
    useLegacySmartRefillAnalytics();
  const [tab, setTab] = useState<LegacyTab>("overview");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null,
  );
  const [businessQuery, setBusinessQuery] = useState("");
  const [businessQueueTab, setBusinessQueueTab] =
    useState<BusinessQueueTab>("triage");
  const [handledStatusFilter, setHandledStatusFilter] =
    useState<HandledStatusFilter>("all");
  const [activityFilter, setActivityFilter] =
    useState<BusinessActivityFilter>("all");
  const [businessSort, setBusinessSort] =
    useState<BusinessSort>("revenue_desc");
  const [businessPageSize, setBusinessPageSize] = useState<BusinessPageSize>(
    DEFAULT_BUSINESS_PAGE_SIZE,
  );
  const [busyStationId, setBusyStationId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "contact" | "ignore" | "restore" | "delete" | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stationPendingDelete, setStationPendingDelete] =
    useState<LegacySmartRefillStation | null>(null);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkActing, setBulkActing] = useState<"contact" | "ignore" | null>(
    null,
  );

  const canDelete = profile?.role === "admin" || profile?.role === "manager";
  const mapLocations = useMemo(
    () => (data ? toMapLocations(data.stations) : []),
    [data],
  );

  const triageCount = useMemo(
    () =>
      data?.stations.filter(
        (station) => (station.triageStatus ?? "open") === "open",
      ).length ?? 0,
    [data],
  );
  const handledCount = useMemo(
    () =>
      data?.stations.filter((station) => {
        const status = station.triageStatus ?? "open";
        return status === "contacted" || status === "ignored";
      }).length ?? 0,
    [data],
  );

  const filteredStations = useMemo(() => {
    if (!data) return [];
    const q = businessQuery.trim().toLowerCase();
    const filtered = data.stations.filter((station) => {
      const status = (station.triageStatus ?? "open") as LegacyStationTriageStatus;
      if (businessQueueTab === "triage") {
        if (status !== "open") return false;
      } else if (handledStatusFilter === "all") {
        if (status !== "contacted" && status !== "ignored") return false;
      } else if (status !== handledStatusFilter) {
        return false;
      }

      if (!matchesActivityFilter(station, activityFilter)) return false;
      if (!q) return true;
      const haystack = [
        station.businessName,
        station.ownerName,
        station.email,
        station.address || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return sortStations(filtered, businessSort);
  }, [
    activityFilter,
    businessQuery,
    businessQueueTab,
    businessSort,
    data,
    handledStatusFilter,
  ]);

  const businessResetKey = `${businessQueueTab}:${handledStatusFilter}:${activityFilter}:${businessSort}:${businessQuery}:${businessPageSize}`;
  const {
    paginatedItems: pagedStations,
    page: businessPage,
    setPage: setBusinessPage,
    totalPages: businessTotalPages,
    totalItems: businessTotalItems,
  } = usePagination(filteredStations, businessPageSize, businessResetKey);

  const pageStationIds = useMemo(
    () => pagedStations.map((station) => station.id),
    [pagedStations],
  );
  const allPageSelected =
    pageStationIds.length > 0 &&
    pageStationIds.every((id) => selectedStationIds.includes(id));
  const selectedCount = selectedStationIds.length;
  const showBulkToolbar =
    pagedStations.length > 0 &&
    (businessQueueTab === "triage" || canDelete);
  const bulkBusy = bulkDeleting || bulkActing != null;

  useEffect(() => {
    setSelectedStationIds([]);
  }, [businessQueueTab, handledStatusFilter, activityFilter, businessQuery]);

  function toggleStationChecked(stationId: string) {
    setSelectedStationIds((current) =>
      current.includes(stationId) ?
        current.filter((id) => id !== stationId)
      : [...current, stationId],
    );
  }

  function toggleSelectPage() {
    setSelectedStationIds((current) => {
      if (allPageSelected) {
        return current.filter((id) => !pageStationIds.includes(id));
      }
      return [...new Set([...current, ...pageStationIds])];
    });
  }

  async function handleBulkDelete() {
    if (selectedStationIds.length === 0) return;
    setActionError(null);
    setBulkDeleting(true);
    const ids = selectedStationIds.slice(0, 50);
    const skipped = selectedStationIds.length - ids.length;
    const previousStations = data?.stations ?? [];
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        stations: current.stations.filter((row) => !ids.includes(row.id)),
      };
    });
    setSelectedStationIds([]);
    if (selectedStationId && ids.includes(selectedStationId)) {
      setSelectedStationId(null);
    }
    try {
      const result = await bulkDeleteLegacySmartRefillStations(ids);
      const notes: string[] = [];
      if (result.failed.length > 0) {
        notes.push(
          `Deleted ${result.deletedIds.length}. Failed: ${result.failed.length}.`,
        );
      }
      if (skipped > 0) {
        notes.push(`${skipped} extra selection(s) skipped (max 50 per run).`);
      }
      if (notes.length > 0) setActionError(notes.join(" "));
      void refresh({ force: true, silent: true });
    } catch (err) {
      setData((current) => {
        if (!current) return current;
        return { ...current, stations: previousStations };
      });
      setActionError(
        err instanceof ApiError ?
          err.message
        : "Could not bulk delete stations.",
      );
      throw err;
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleBulkContact() {
    if (selectedStationIds.length === 0) return;
    setActionError(null);
    setBulkActing("contact");
    const ids = selectedStationIds.slice(0, 50);
    const skipped = selectedStationIds.length - ids.length;
    const previousStations = data?.stations ?? [];
    const contactedAt = new Date().toISOString();
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        stations: current.stations.map((row) =>
          ids.includes(row.id) ?
            {
              ...row,
              triageStatus: "contacted" as const,
              contactedAt,
              ignoredAt: null,
            }
          : row,
        ),
      };
    });
    setSelectedStationIds([]);
    if (selectedStationId && ids.includes(selectedStationId)) {
      setSelectedStationId(null);
    }
    setBusinessQueueTab("handled");
    setHandledStatusFilter("contacted");
    try {
      const result = await bulkContactLegacySmartRefillStations(ids);
      const notes: string[] = [];
      if (result.failed.length > 0) {
        // Roll back failed rows so they stay in triage.
        const failedIds = new Set(result.failed.map((row) => row.stationId));
        setData((current) => {
          if (!current) return current;
          const priorById = new Map(previousStations.map((row) => [row.id, row]));
          return {
            ...current,
            stations: current.stations.map((row) => {
              if (!failedIds.has(row.id)) return row;
              const prior = priorById.get(row.id);
              return prior ?? row;
            }),
          };
        });
        notes.push(
          `Contacted ${result.updatedIds.length}. Failed: ${result.failed.length}.`,
        );
      }
      if (skipped > 0) {
        notes.push(`${skipped} extra selection(s) skipped (max 50 per run).`);
      }
      if (notes.length > 0) setActionError(notes.join(" "));
      void refresh({ force: true, silent: true });
    } catch (err) {
      setData((current) => {
        if (!current) return current;
        return { ...current, stations: previousStations };
      });
      setBusinessQueueTab("triage");
      setActionError(
        err instanceof ApiError ?
          err.message
        : "Could not bulk contact stations.",
      );
    } finally {
      setBulkActing(null);
    }
  }

  async function handleBulkIgnore() {
    if (selectedStationIds.length === 0) return;
    setActionError(null);
    setBulkActing("ignore");
    const ids = selectedStationIds.slice(0, 50);
    const skipped = selectedStationIds.length - ids.length;
    const previousStations = data?.stations ?? [];
    const ignoredAt = new Date().toISOString();
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        stations: current.stations.map((row) =>
          ids.includes(row.id) ?
            {
              ...row,
              triageStatus: "ignored" as const,
              ignoredAt,
            }
          : row,
        ),
      };
    });
    setSelectedStationIds([]);
    if (selectedStationId && ids.includes(selectedStationId)) {
      setSelectedStationId(null);
    }
    setBusinessQueueTab("handled");
    setHandledStatusFilter("ignored");
    try {
      const result = await bulkIgnoreLegacySmartRefillStations(ids);
      const notes: string[] = [];
      if (result.failed.length > 0) {
        notes.push(
          `Ignored ${result.updatedIds.length}. Failed: ${result.failed.length}.`,
        );
      }
      if (skipped > 0) {
        notes.push(`${skipped} extra selection(s) skipped (max 50 per run).`);
      }
      if (notes.length > 0) setActionError(notes.join(" "));
      void refresh({ force: true, silent: true });
    } catch (err) {
      setData((current) => {
        if (!current) return current;
        return { ...current, stations: previousStations };
      });
      setBusinessQueueTab("triage");
      setActionError(
        err instanceof ApiError ?
          err.message
        : "Could not bulk ignore stations.",
      );
    } finally {
      setBulkActing(null);
    }
  }

  function patchStationLocally(
    stationId: string,
    patch: Partial<LegacySmartRefillStation> | null,
  ) {
    setData((current) => {
      if (!current) return current;
      if (patch == null) {
        return {
          ...current,
          stations: current.stations.filter((row) => row.id !== stationId),
        };
      }
      return {
        ...current,
        stations: current.stations.map((row) =>
          row.id === stationId ? { ...row, ...patch } : row,
        ),
      };
    });
  }

  async function handleContact(station: LegacySmartRefillStation) {
    setActionError(null);
    if (!station.email?.trim()) {
      setActionError("This station has no email — cannot send outreach.");
      return;
    }
    setBusyStationId(station.id);
    setBusyAction("contact");
    const contactedAt = new Date().toISOString();
    patchStationLocally(station.id, {
      triageStatus: "contacted",
      contactedAt,
      ignoredAt: null,
    });
    if (selectedStationId === station.id) setSelectedStationId(null);
    setBusinessQueueTab("handled");
    setHandledStatusFilter("contacted");
    try {
      await contactLegacySmartRefillStation(station.id, {
        toEmail: station.email,
        recipientName: station.ownerName,
        businessName: station.businessName,
      });
      void refresh({ force: true, silent: true });
    } catch (err) {
      patchStationLocally(station.id, {
        triageStatus: station.triageStatus ?? "open",
        contactedAt: station.contactedAt ?? null,
        ignoredAt: station.ignoredAt ?? null,
      });
      setBusinessQueueTab("triage");
      setActionError(
        err instanceof ApiError ?
          err.message
        : "Could not send contact email for this station.",
      );
    } finally {
      setBusyStationId(null);
      setBusyAction(null);
    }
  }

  async function handleIgnore(station: LegacySmartRefillStation) {
    setActionError(null);
    setBusyStationId(station.id);
    setBusyAction("ignore");
    const ignoredAt = new Date().toISOString();
    patchStationLocally(station.id, {
      triageStatus: "ignored",
      ignoredAt,
    });
    if (selectedStationId === station.id) setSelectedStationId(null);
    setBusinessQueueTab("handled");
    setHandledStatusFilter("ignored");
    try {
      await ignoreLegacySmartRefillStation(station.id);
      void refresh({ force: true, silent: true });
    } catch (err) {
      patchStationLocally(station.id, {
        triageStatus: station.triageStatus ?? "open",
        contactedAt: station.contactedAt ?? null,
        ignoredAt: station.ignoredAt ?? null,
      });
      setBusinessQueueTab("triage");
      setActionError(
        err instanceof ApiError ?
          err.message
        : "Could not ignore this station.",
      );
    } finally {
      setBusyStationId(null);
      setBusyAction(null);
    }
  }

  async function handleRestore(station: LegacySmartRefillStation) {
    setActionError(null);
    setBusyStationId(station.id);
    setBusyAction("restore");
    patchStationLocally(station.id, {
      triageStatus: "open",
      contactedAt: null,
      ignoredAt: null,
    });
    try {
      await restoreLegacySmartRefillStation(station.id);
      void refresh({ force: true, silent: true });
    } catch (err) {
      patchStationLocally(station.id, {
        triageStatus: station.triageStatus ?? "open",
        contactedAt: station.contactedAt ?? null,
        ignoredAt: station.ignoredAt ?? null,
      });
      setActionError(
        err instanceof ApiError ?
          err.message
        : "Could not restore this station to triage.",
      );
    } finally {
      setBusyStationId(null);
      setBusyAction(null);
    }
  }

  async function handleDelete(station: LegacySmartRefillStation) {
    setActionError(null);
    setBusyStationId(station.id);
    setBusyAction("delete");
    const previous = station;
    patchStationLocally(station.id, null);
    if (selectedStationId === station.id) setSelectedStationId(null);
    try {
      await deleteLegacySmartRefillStation(station.id);
      void refresh({ force: true, silent: true });
    } catch (err) {
      setData((current) => {
        if (!current) return current;
        if (current.stations.some((row) => row.id === previous.id)) {
          return current;
        }
        return {
          ...current,
          stations: [...current.stations, previous],
        };
      });
      setActionError(
        err instanceof ApiError ?
          err.message
        : "Could not delete this station.",
      );
      throw err;
    } finally {
      setBusyStationId(null);
      setBusyAction(null);
    }
  }

  const tabs: DashboardSegmentTab[] = useMemo(() => {
    if (!data) return [];
    return [
      { id: "overview", label: "Overview", count: data.summary.stationsWithActivity },
      {
        id: "businesses",
        label: "Businesses",
        count: triageCount,
      },
      { id: "map", label: "Map", count: mapLocations.length },
      { id: "leads", label: "Leads", count: data.leads.length },
    ];
  }, [data, mapLocations.length]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <DashboardAppNav />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <DashboardAppNav />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center text-sm text-red-800">
            {error || "Legacy analytics unavailable."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DashboardAppNav />

      <div className="sticky top-0 z-10 -mx-1 space-y-3 bg-[var(--background)]/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-foreground">
              SmartRefill (legacy)
            </h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Businesses, customers, and deliveries from Firestore{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5">
                {data.sourceDatabase}
              </code>
              {computedAt ? ` · refreshed ${formatWhen(computedAt)}` : ""}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isRefreshing}
            onClick={() => void refresh({ force: true })}
          >
            <RefreshCw
              className={cn("mr-1.5 h-3.5 w-3.5", isRefreshing && "animate-spin")}
            />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        <DashboardSegmentTabs
          tabs={tabs}
          activeId={tab}
          onChange={(id) => {
            setTab(id as LegacyTab);
            if (id !== "businesses") setSelectedStationId(null);
          }}
        />
      </div>

      {tab === "overview" ?
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SnapshotStat
              label="Businesses"
              value={String(data.summary.stationsWithProfile)}
              hint={`${data.summary.stationsWithActivity} with customers/txs`}
              icon={<Building2 className="h-4 w-4" />}
            />
            <SnapshotStat
              label="Customers"
              value={String(data.summary.totalCustomers)}
              hint={`${data.summary.mappedStations} stations on map`}
              icon={<Users className="h-4 w-4" />}
            />
            <SnapshotStat
              label="Transactions"
              value={String(data.summary.totalDeliveries)}
              hint={`${data.summary.totalBottles.toLocaleString()} bottles`}
              icon={<Package className="h-4 w-4" />}
            />
            <SnapshotStat
              label="Revenue"
              value={formatPhp(data.summary.totalRevenue)}
              hint={`Unpaid ${formatPhp(data.summary.totalUnpaid)}`}
              icon={<Receipt className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                  Deliveries · last 90 days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.charts.deliveriesByDay.length === 0 ?
                  <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">
                    No delivery activity in the last 90 days.
                  </p>
                : <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={data.charts.deliveriesByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#0f766e"
                        fill="#99f6e4"
                        name="Deliveries"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                }
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                  Top stations by revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  data={data.charts.topStationsByRevenue.map((row) => ({
                    name: row.name.slice(0, 18),
                    revenue: row.value ?? 0,
                  }))}
                  labelKey="name"
                  valueKey="revenue"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                  Top stations by customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  data={data.charts.topStationsByCustomers.map((row) => ({
                    name: row.name.slice(0, 18),
                    customers: row.count,
                  }))}
                  labelKey="name"
                  valueKey="customers"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                  Delivery type mix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlanPieChart
                  data={data.charts.deliveryTypeMix.map((row) => ({
                    name: row.name,
                    count: row.count,
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      : null}

      {tab === "businesses" ?
        selectedStationId ?
          <StationDetailPanel
            stationId={selectedStationId}
            onBack={() => setSelectedStationId(null)}
          />
        : <DashboardSection
            title="Businesses / owners"
            description="Triage stations with Contact, Ignore, or Delete. Handled holds contacted and ignored stations."
            count={filteredStations.length}
          >
            {actionError ?
              <p className="mb-3 text-sm text-red-600" role="alert">
                {actionError}
              </p>
            : null}

            <div className="mb-3 space-y-3">
              <DashboardSegmentTabs
                tabs={[
                  { id: "triage", label: "Triage", count: triageCount },
                  {
                    id: "handled",
                    label: "Contacted / Ignored",
                    count: handledCount,
                  },
                ]}
                activeId={businessQueueTab}
                onChange={(id) => {
                  setBusinessQueueTab(id as BusinessQueueTab);
                  setSelectedStationId(null);
                }}
              />

              {businessQueueTab === "handled" ?
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "all", label: "All handled" },
                      { id: "contacted", label: "Contacted" },
                      { id: "ignored", label: "Ignored" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setHandledStatusFilter(option.id)}
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition",
                        handledStatusFilter === option.id ?
                          "bg-amber-700 text-white"
                        : "bg-amber-50 text-amber-900 hover:bg-amber-100",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              : null}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <input
                  value={businessQuery}
                  onChange={(event) => setBusinessQuery(event.target.value)}
                  placeholder="Search business, owner, email, address…"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm lg:max-w-md"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-600">
                    <span className="whitespace-nowrap font-medium">Sort</span>
                    <select
                      value={businessSort}
                      onChange={(event) =>
                        setBusinessSort(event.target.value as BusinessSort)
                      }
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-600">
                    <span className="whitespace-nowrap font-medium">Rows</span>
                    <select
                      value={businessPageSize}
                      onChange={(event) =>
                        setBusinessPageSize(
                          Number(event.target.value) as BusinessPageSize,
                        )
                      }
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                    >
                      {BUSINESS_PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {ACTIVITY_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setActivityFilter(option.id)}
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition",
                      activityFilter === option.id ?
                        "bg-[var(--primary)] text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {showBulkToolbar ?
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300"
                      checked={allPageSelected}
                      onChange={toggleSelectPage}
                      disabled={bulkBusy}
                    />
                    Select page ({pageStationIds.length})
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedCount > 0 ?
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={bulkBusy}
                        onClick={() => setSelectedStationIds([])}
                      >
                        Clear ({selectedCount})
                      </Button>
                    : null}
                    {businessQueueTab === "triage" ?
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={selectedCount === 0 || bulkBusy}
                          onClick={() => void handleBulkContact()}
                        >
                          {bulkActing === "contact" ?
                            "Contacting…"
                          : `Contact selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={selectedCount === 0 || bulkBusy}
                          onClick={() => void handleBulkIgnore()}
                        >
                          {bulkActing === "ignore" ?
                            "Ignoring…"
                          : `Ignore selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
                        </Button>
                      </>
                    : null}
                    {canDelete ?
                      <Button
                        type="button"
                        size="sm"
                        className="bg-red-600 text-white hover:bg-red-700"
                        disabled={selectedCount === 0 || bulkBusy}
                        onClick={() => setBulkDeletePending(true)}
                      >
                        {bulkDeleting ?
                          "Deleting…"
                        : `Delete selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
                      </Button>
                    : null}
                  </div>
                </div>
              : null}
            </div>

            {pagedStations.length === 0 ?
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                {businessQueueTab === "triage" ?
                  "No stations left to triage."
                : "No contacted or ignored stations yet."}
              </p>
            : <div className="space-y-3">
                {pagedStations.map((station) => (
                  <StationListRow
                    key={station.id}
                    station={station}
                    checked={selectedStationIds.includes(station.id)}
                    mode={businessQueueTab}
                    selectable={showBulkToolbar}
                    canDelete={canDelete}
                    busyAction={
                      busyStationId === station.id ? busyAction : null
                    }
                    onToggleChecked={() => toggleStationChecked(station.id)}
                    onSelect={() => setSelectedStationId(station.id)}
                    onContact={() => void handleContact(station)}
                    onIgnore={() => void handleIgnore(station)}
                    onRestore={() => void handleRestore(station)}
                    onDelete={() => setStationPendingDelete(station)}
                  />
                ))}
                <ListPagination
                  page={businessPage}
                  totalPages={businessTotalPages}
                  totalItems={businessTotalItems}
                  pageSize={businessPageSize}
                  onPageChange={setBusinessPage}
                />
              </div>
            }
          </DashboardSection>
      : null}

      {stationPendingDelete ?
        <ConfirmDeleteDialog
          title="Delete legacy station?"
          itemLabel={stationPendingDelete.businessName}
          description="This permanently removes the owner profile, customers, and deliveries from prod-smartrefill. This cannot be undone."
          confirmLabel="Delete all records"
          onClose={() => setStationPendingDelete(null)}
          onConfirm={async () => {
            await handleDelete(stationPendingDelete);
            setStationPendingDelete(null);
          }}
        />
      : null}

      {bulkDeletePending ?
        <ConfirmDeleteDialog
          title="Delete selected stations?"
          itemLabel={`${selectedCount} station${selectedCount === 1 ? "" : "s"}`}
          description="This permanently removes each selected owner profile, customers, and deliveries from prod-smartrefill. Up to 50 stations per bulk run. This cannot be undone."
          confirmLabel={`Delete ${selectedCount}`}
          busyLabel="Deleting…"
          onClose={() => setBulkDeletePending(false)}
          onConfirm={async () => {
            await handleBulkDelete();
            setBulkDeletePending(false);
          }}
        />
      : null}

      {tab === "map" ?
        <DashboardSection
          title="Station map"
          description="Legacy profiles with latitude / longitude."
          count={mapLocations.length}
        >
          {mapLocations.length === 0 ?
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              No mapped stations in prod-smartrefill.
            </p>
          : <BusinessLocationsMap
              locations={mapLocations}
              onRefresh={() => refresh({ force: true })}
              isRefreshing={isRefreshing}
            />
          }
        </DashboardSection>
      : null}

      {tab === "leads" ?
        <DashboardSection
          title="Leads & inquiries"
          description="Legacy inquiries, demos, and business inquiries."
          count={data.leads.length}
        >
          <PaginatedList
            items={data.leads}
            pageSize={8}
            emptyMessage="No legacy leads."
            renderItem={(lead) => <LeadRow key={lead.id} lead={lead} />}
          />
        </DashboardSection>
      : null}
    </div>
  );
}
