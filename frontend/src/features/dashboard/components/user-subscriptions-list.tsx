"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  CreditCard,
  Printer,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListPagination } from "@/components/list-pagination";
import { SubscriptionUploadPreview } from "@/features/dashboard/components/subscription-upload-preview";
import { TrialStationEditDialog } from "@/features/admin/components/trial-station-edit-dialog";
import {
  manilaDateInputValue,
  trialEndsAtFromManilaDate,
} from "@/features/admin/lib/trial-station-edit";
import {
  extendSubscription,
  updateTrialStation,
} from "@/features/admin/lib/update-trial-station";
import { PLAN_PRESET_OPTIONS } from "@/lib/admin/plan-catalog-display";
import { ApiError } from "@/lib/api-client";
import { SubscriptionApprovalDetailDialog } from "@/features/dashboard/components/subscription-approval-detail-dialog";
import {
  applyApprovedSubscription,
  approveSubscription,
} from "@/features/dashboard/lib/approve-subscription";
import {
  printSubscriptionOfficialReceipt,
  printSubscriptionStatement,
  subscriptionEligibleForOfficialReceipt,
} from "@/features/dashboard/lib/subscription-official-receipt";
import {
  buildUserSubscriptionKpis,
  buildUserSubscriptionsList,
  countUserSubscriptionsByFilter,
  filterUserSubscriptionsOps,
  isSubscriptionExpiredByDate,
  type SubscriptionChangeKind,
  type SubscriptionListFilterKind,
  type SubscriptionOpsBucket,
  type SubscriptionOpsQuery,
  type UserSubscriptionListItem,
} from "@/features/dashboard/lib/build-user-subscriptions-list";
import { usePagination } from "@/hooks/use-pagination";
import type { ActiveOwner, OwnerSubscription } from "@/lib/dashboard/analytics";
import {
  displaySubscriptionPlanName,
  formatBillingCycleLabel,
  formatSubscriptionListAmount,
  formatSubscriptionPeriod,
  formatSubscriptionStatus,
  formatTrialDaysRemaining,
  isTrialBillingCycle,
} from "@/lib/dashboard/subscription-labels";
import { cn } from "@/lib/utils";
import type { DashboardAnalyticsRefresh } from "@/hooks/use-dashboard-analytics";

const CHANGE_KIND_LABELS: Record<SubscriptionChangeKind, string> = {
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  renewal: "Renewal",
  other: "Plan change",
};

const CHANGE_KIND_STYLES: Record<SubscriptionChangeKind, string> = {
  upgrade: "bg-violet-100 text-violet-800",
  downgrade: "bg-amber-100 text-amber-800",
  renewal: "bg-sky-100 text-sky-800",
  other: "bg-zinc-100 text-zinc-700",
};

const ACTIVITY_LABELS: Record<SubscriptionListFilterKind, string> = {
  all: "Any activity",
  pending: "Pending approval",
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  renewal: "Renewal",
};

const ACTIVITY_ORDER: SubscriptionListFilterKind[] = [
  "all",
  "pending",
  "upgrade",
  "downgrade",
  "renewal",
];

const BUCKET_LABELS: Record<SubscriptionOpsBucket, string> = {
  attention: "Needs attention",
  paying: "Paying",
  voucher: "Voucher",
  trial: "Trial",
  free: "Free",
  ended: "Ended",
};

const PLAN_FILTERS: Array<{
  id: SubscriptionOpsQuery["plan"];
  label: string;
}> = [
  { id: "all", label: "All plans" },
  { id: "scale", label: "Scale" },
  { id: "grow", label: "Grow" },
  { id: "starter", label: "Starter" },
  { id: "free", label: "Free" },
  { id: "trial", label: "Trial" },
];

const SUBSCRIPTIONS_PAGE_SIZE_OPTIONS = [5, 8, 10, 15, 20, 25] as const;
const DEFAULT_SUBSCRIPTIONS_PAGE_SIZE = 25;

type SubscriptionsPageSize = (typeof SUBSCRIPTIONS_PAGE_SIZE_OPTIONS)[number];

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
        active ?
          "bg-[var(--primary)] text-white"
        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
      )}
      aria-pressed={active}
    >
      {label}
      {count != null ?
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            active ? "bg-white/20 text-white" : "bg-white text-zinc-600",
          )}
        >
          {count}
        </span>
      : null}
    </button>
  );
}

function statusBadges(item: UserSubscriptionListItem): Array<{
  label: string;
  className: string;
}> {
  const badges: Array<{ label: string; className: string }> = [];
  if (item.hasPendingPayment) {
    badges.push({
      label: "Pending payment",
      className: "bg-amber-500 text-white hover:bg-amber-500",
    });
  }
  if (item.justPaid) {
    badges.push({
      label: "Just paid",
      className: "bg-emerald-600 text-white hover:bg-emerald-600",
    });
  }
  if (item.isExpired) {
    badges.push({
      label: "Expired",
      className: "bg-red-100 text-red-800",
    });
  } else if (item.isGrace) {
    badges.push({
      label: "Grace period",
      className: "bg-amber-100 text-amber-800",
    });
  } else if (item.isExpiringSoon) {
    badges.push({
      label: "Expiring soon",
      className: "bg-orange-100 text-orange-800",
    });
  }
  if (item.isVoucher && !item.isExpired) {
    badges.push({
      label: "Voucher",
      className: "bg-sky-50 text-sky-800",
    });
  }
  if (item.opsBucket === "ended" && !item.isExpired) {
    badges.push({
      label: item.history.length === 0 ? "No plan" : "Ended",
      className: "bg-zinc-100 text-zinc-700",
    });
  }
  if (item.changeKind !== "other") {
    badges.push({
      label: CHANGE_KIND_LABELS[item.changeKind],
      className: CHANGE_KIND_STYLES[item.changeKind],
    });
  }
  if (item.activeSubscriptionCount !== 1) {
    badges.push({
      label: `${item.activeSubscriptionCount} live periods`,
      className: "bg-red-100 text-red-800",
    });
  }
  return badges;
}

function periodActivityLabel(subscription: OwnerSubscription): string {
  if (isTrialBillingCycle(subscription.billingCycle)) return "Trial";
  const changeType = (subscription.changeType || "").toLowerCase();
  if (changeType === "upgrade") return "Upgrade";
  if (changeType === "downgrade" || subscription.isDowngrade) return "Downgrade";
  if (changeType === "renew") return "Renewal";
  const name = (subscription.planName || subscription.planCode || "").toLowerCase();
  if (name === "free" || subscription.planCode === "free") return "Free";
  return "Plan";
}

const OVERWRITE_PLAN_OPTIONS = PLAN_PRESET_OPTIONS.filter(
  (option) => option.code !== "enterprise",
).map((option) => ({ code: option.code, label: option.label }));

function SubscriptionTableRows({
  item,
  expanded,
  canEdit,
  approvingId,
  printingId,
  onToggle,
  onPrintSubscription,
  onPrintStatement,
  onReview,
  onOverwrite,
  onExtend,
}: {
  item: UserSubscriptionListItem;
  expanded: boolean;
  canEdit: boolean;
  approvingId: string | null;
  printingId: string | null;
  onToggle: () => void;
  onPrintSubscription: (businessId: string, subscription: OwnerSubscription) => void;
  onPrintStatement: (businessId: string) => void;
  onReview: (businessId: string, subscription: OwnerSubscription) => void;
  onOverwrite: (item: UserSubscriptionListItem, subscription: OwnerSubscription) => void;
  onExtend: (item: UserSubscriptionListItem, subscription: OwnerSubscription) => void;
}) {
  const periods =
    item.history.length > 0 ? item.history : [item.subscription];
  const latest = periods[0];
  const statementBusy = printingId === `statement:${item.businessId}`;
  const latestTrial = isTrialBillingCycle(latest.billingCycle);
  const latestCycle = formatBillingCycleLabel(latest.billingCycle);
  const latestDays = latestTrial ? formatTrialDaysRemaining(latest.expiresAt) : null;
  const periodLabel = `${periods.length} period${periods.length === 1 ? "" : "s"}`;

  return (
    <>
      <tr className={item.opsBucket === "attention" ? "bg-amber-50/40" : undefined}>
        <td className="px-3 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="flex items-start gap-2 text-left"
          >
            <ChevronDown
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition",
                expanded ? "rotate-0" : "-rotate-90",
              )}
              aria-hidden
            />
            <span>
              <span className="block font-medium text-foreground">{item.businessName}</span>
              {item.ownerEmail ?
                <span className="mt-0.5 block text-xs text-[var(--primary)]">{item.ownerEmail}</span>
              : null}
              <span className="mt-1 block text-[11px] uppercase tracking-wide text-zinc-400">
                {expanded ? "Hide history" : periodLabel}
              </span>
            </span>
          </button>
        </td>
        <td className="px-3 py-3">
          <p className="font-medium text-foreground">{displaySubscriptionPlanName(latest)}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{formatSubscriptionPeriod(latest)}</p>
        </td>
        <td className="px-3 py-3 whitespace-nowrap text-zinc-700">
          {periodActivityLabel(latest)}
        </td>
        <td className="px-3 py-3">
          <p className="text-zinc-700">
            {latestCycle ? `${latestCycle} · ` : ""}
            {formatSubscriptionStatus(
              isSubscriptionExpiredByDate(latest) ? "expired" : latest.status,
            )}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {statusBadges(item).map((badge) => (
              <Badge key={badge.label} className={badge.className}>
                {badge.label}
              </Badge>
            ))}
            {latestTrial && latestDays ?
              <Badge className="bg-sky-50 font-normal text-sky-800">{latestDays}</Badge>
            : null}
          </div>
        </td>
        <td className="px-3 py-3 text-right font-medium text-foreground">
          {formatSubscriptionListAmount(latest)}
        </td>
        <td className="px-3 py-3 text-right">
          <Button size="sm" variant="outline" onClick={onToggle}>
            {expanded ? "Hide" : "History"}
          </Button>
        </td>
      </tr>
      {expanded ?
        periods.map((subscription, index) => {
          const isLatest = index === 0;
          const isFreeTrial = isTrialBillingCycle(subscription.billingCycle);
          const billingCycleLabel = formatBillingCycleLabel(subscription.billingCycle);
          const trialDaysRemaining = isFreeTrial ?
            formatTrialDaysRemaining(subscription.expiresAt)
          : null;
          const expired = isSubscriptionExpiredByDate(subscription);
          const printBusy = printingId === subscription.id;
          const isRealPeriod = subscription.id !== "__none__";
          return (
            <tr key={subscription.id} className="bg-zinc-50/70">
              <td className="px-3 py-3 pl-10 align-top">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                  {isLatest ? "Latest" : "Earlier"}
                </p>
              </td>
              <td className="px-3 py-3 align-top">
                <p className="font-medium text-foreground">
                  {displaySubscriptionPlanName(subscription)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatSubscriptionPeriod(subscription)}
                </p>
                <SubscriptionUploadPreview subscription={subscription} />
              </td>
              <td className="px-3 py-3 align-top whitespace-nowrap text-zinc-700">
                {periodActivityLabel(subscription)}
              </td>
              <td className="px-3 py-3 align-top">
                <p className="text-zinc-700">
                  {billingCycleLabel ? `${billingCycleLabel} · ` : ""}
                  {formatSubscriptionStatus(expired ? "expired" : subscription.status)}
                </p>
                {isFreeTrial && trialDaysRemaining ?
                  <Badge className="mt-1 bg-sky-50 font-normal text-sky-800">
                    {trialDaysRemaining}
                  </Badge>
                : null}
              </td>
              <td className="px-3 py-3 text-right align-top font-medium text-foreground">
                {formatSubscriptionListAmount(subscription)}
              </td>
              <td className="px-3 py-3 text-right align-top">
                {isLatest && isRealPeriod ?
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approvingId === subscription.id}
                      onClick={() => onReview(item.businessId, subscription)}
                    >
                      Review
                    </Button>
                    {canEdit ?
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOverwrite(item, subscription)}
                        >
                          Overwrite
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onExtend(item, subscription)}
                        >
                          Update
                        </Button>
                      </>
                    : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={printBusy}
                      onClick={() => onPrintSubscription(item.businessId, subscription)}
                      className="gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5" aria-hidden />
                      {printBusy ? "Preparing…" : "Print subscription"}
                    </Button>
                  </div>
                : isRealPeriod ?
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={statementBusy}
                    onClick={() => onPrintStatement(item.businessId)}
                    className="gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" aria-hidden />
                    {statementBusy ? "Preparing…" : "Print statement"}
                  </Button>
                : <span className="text-xs text-zinc-400">—</span>}
              </td>
            </tr>
          );
        })
      : null}
    </>
  );
}


export function UserSubscriptionsList({
  owners,
  canApprove,
  onRefresh,
}: {
  owners: ActiveOwner[];
  canApprove: boolean;
  onRefresh?: DashboardAnalyticsRefresh;
}) {
  const [localOwners, setLocalOwners] = useState(owners);
  const [ownersSource, setOwnersSource] = useState(owners);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<"all" | SubscriptionOpsBucket>("all");
  const [plan, setPlan] = useState<SubscriptionOpsQuery["plan"]>("all");
  const [activity, setActivity] = useState<SubscriptionListFilterKind>("all");
  const [pageSize, setPageSize] = useState<SubscriptionsPageSize>(
    DEFAULT_SUBSCRIPTIONS_PAGE_SIZE,
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<{
    businessId: string;
    businessName: string;
    ownerEmail?: string;
    subscription: OwnerSubscription;
  } | null>(null);
  const [overwriteTarget, setOverwriteTarget] = useState<{
    item: UserSubscriptionListItem;
    subscription: OwnerSubscription;
  } | null>(null);
  const [extendTarget, setExtendTarget] = useState<{
    item: UserSubscriptionListItem;
    subscription: OwnerSubscription;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (ownersSource !== owners) {
    setOwnersSource(owners);
    setLocalOwners(owners);
  }

  const allItems = useMemo(
    () => buildUserSubscriptionsList(localOwners),
    [localOwners],
  );
  const kpis = useMemo(() => buildUserSubscriptionKpis(allItems), [allItems]);
  const activityCounts = useMemo(
    () => countUserSubscriptionsByFilter(allItems),
    [allItems],
  );
  const filteredItems = useMemo(
    () =>
      filterUserSubscriptionsOps(allItems, {
        search,
        bucket,
        plan,
        activity,
      }),
    [activity, allItems, bucket, plan, search],
  );

  const resetKey = `${search}:${bucket}:${plan}:${activity}:${pageSize}`;
  const { paginatedItems, page, setPage, totalPages, totalItems } =
    usePagination(filteredItems, pageSize, resetKey);

  const planCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allItems.length };
    for (const item of allItems) {
      counts[item.planTier] = (counts[item.planTier] ?? 0) + 1;
    }
    return counts;
  }, [allItems]);

  async function handleApprove(businessId: string, subscriptionId: string) {
    setError(null);
    setApprovingId(subscriptionId);
    try {
      await approveSubscription(businessId, subscriptionId);
      setLocalOwners((current) =>
        applyApprovedSubscription(current, businessId, subscriptionId),
      );
      void onRefresh?.({ silent: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not approve subscription.",
      );
    } finally {
      setApprovingId(null);
    }
  }

  async function handlePrintOr(businessId: string, subscriptionId: string) {
    setError(null);
    setPrintingId(subscriptionId);
    try {
      await printSubscriptionOfficialReceipt(businessId, subscriptionId);
    } catch (err) {
      setError(
        err instanceof Error ?
          err.message
        : "Could not print Official Receipt.",
      );
    } finally {
      setPrintingId(null);
    }
  }

  async function handlePrintStatement(businessId: string) {
    setError(null);
    setPrintingId(itemBusinessStatementId(businessId));
    try {
      await printSubscriptionStatement(businessId);
    } catch (err) {
      setError(
        err instanceof Error ?
          err.message
        : "Could not print statement of account.",
      );
    } finally {
      setPrintingId(null);
    }
  }

  function toggleExpanded(businessId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });
  }

  async function handlePrintSubscription(
    businessId: string,
    subscription: OwnerSubscription,
  ) {
    if (subscriptionEligibleForOfficialReceipt(subscription)) {
      await handlePrintOr(businessId, subscription.id);
      return;
    }
    await handlePrintStatement(businessId);
  }

  async function handleOverwrite(input: {
    planCode: string;
    expiresAt: string;
    note: string;
  }) {
    if (!overwriteTarget) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const result = await updateTrialStation({
        businessId: overwriteTarget.item.businessId,
        subscriptionId: overwriteTarget.subscription.id,
        planCode: input.planCode,
        expiresAt: input.expiresAt,
        note: input.note,
      });
      setLocalOwners((current) =>
        patchOwnerSubscription(current, overwriteTarget.item.businessId, overwriteTarget.subscription.id, {
          planCode: result.planCode,
          planName: result.planName,
          expiresAt: result.expiresAt,
          billingCycle: result.billingCycle,
          price: result.price,
        }),
      );
      setOverwriteTarget(null);
      void onRefresh?.({ silent: true });
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Could not overwrite this subscription.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleExtend(expiresAt: string) {
    if (!extendTarget) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const result = await extendSubscription({
        businessId: extendTarget.item.businessId,
        subscriptionId: extendTarget.subscription.id,
        expiresAt,
      });
      setLocalOwners((current) =>
        patchOwnerSubscription(current, extendTarget.item.businessId, extendTarget.subscription.id, {
          expiresAt: result.expiresAt,
        }),
      );
      setExtendTarget(null);
      void onRefresh?.({ silent: true });
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Could not update this subscription.");
    } finally {
      setEditSaving(false);
    }
  }

  function toggleBucket(next: SubscriptionOpsBucket) {
    setBucket((current) => (current === next ? "all" : next));
  }

  if (allItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
            <CreditCard className="h-4 w-4 text-teal-600" />
            User subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
            No subscriptions to review
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
              <CreditCard className="h-4 w-4 text-teal-600" />
              Workspaces · {filteredItems.length}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search station or email"
                  aria-label="Search station or email"
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm"
                />
              </label>
              <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-600">
                <span className="whitespace-nowrap font-medium">Rows</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) as SubscriptionsPageSize);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  {SUBSCRIPTIONS_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Group
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="All"
                count={kpis.total}
                active={bucket === "all"}
                onClick={() => setBucket("all")}
              />
              {(Object.keys(BUCKET_LABELS) as SubscriptionOpsBucket[]).map(
                (id) => {
                  const count = kpis[id];
                  if (id !== "attention" && id !== "ended" && count === 0 && bucket !== id) return null;
                  return (
                    <FilterChip
                      key={id}
                      label={BUCKET_LABELS[id]}
                      count={count}
                      active={bucket === id}
                      onClick={() => toggleBucket(id)}
                    />
                  );
                },
              )}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Plan
            </p>
            <div className="flex flex-wrap gap-2">
              {PLAN_FILTERS.map((row) => {
                const count = row.id === "all" ? kpis.total : planCounts[row.id ?? ""] ?? 0;
                if (row.id !== "all" && count === 0 && plan !== row.id) return null;
                return (
                  <FilterChip
                    key={row.id}
                    label={row.label}
                    count={count}
                    active={plan === row.id}
                    onClick={() =>
                      setPlan((current) => (current === row.id ? "all" : row.id))
                    }
                  />
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Activity
            </p>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_ORDER.map((id) => {
                const count = activityCounts[id];
                if (id !== "all" && count === 0 && activity !== id) return null;
                return (
                  <FilterChip
                    key={id}
                    label={ACTIVITY_LABELS[id]}
                    count={count}
                    active={activity === id}
                    onClick={() =>
                      setActivity((current) => (current === id ? "all" : id))
                    }
                  />
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error ?
            <p className="mb-3 text-sm text-red-600">{error}</p>
          : null}
          {filteredItems.length === 0 ?
            <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              No workspaces match these filters
            </p>
          : <>
              <p className="mb-3 text-xs text-[var(--muted-foreground)]">
                Showing {paginatedItems.length} of {filteredItems.length} workspace
                {filteredItems.length === 1 ? "" : "s"}. Open a station to see its
                subscription history, newest first.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50/90 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-3">Station</th>
                      <th className="px-3 py-3">Plan</th>
                      <th className="px-3 py-3">Activity</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Amount</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {paginatedItems.map((item) => (
                      <SubscriptionTableRows
                        key={item.businessId}
                        item={item}
                        expanded={expandedIds.has(item.businessId)}
                        canEdit={canApprove}
                        onToggle={() => toggleExpanded(item.businessId)}
                        approvingId={approvingId}
                        printingId={printingId}
                        onPrintSubscription={(businessId, subscription) => {
                          void handlePrintSubscription(businessId, subscription);
                        }}
                        onPrintStatement={(businessId) => {
                          void handlePrintStatement(businessId);
                        }}
                        onReview={(businessId, subscription) =>
                          setDetailTarget({
                            businessId,
                            businessName: item.businessName,
                            ownerEmail: item.ownerEmail,
                            subscription,
                          })
                        }
                        onOverwrite={(listItem, subscription) => {
                          setEditError(null);
                          setOverwriteTarget({ item: listItem, subscription });
                        }}
                        onExtend={(listItem, subscription) => {
                          setEditError(null);
                          setExtendTarget({ item: listItem, subscription });
                        }}
                      />
                    ))}
                  </tbody>
                </table>
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

      {detailTarget ?
        <SubscriptionApprovalDetailDialog
          subscription={detailTarget.subscription}
          businessId={detailTarget.businessId}
          businessName={detailTarget.businessName}
          ownerEmail={detailTarget.ownerEmail}
          canApprove={canApprove && detailTarget.subscription.needsApproval}
          isApproving={approvingId === detailTarget.subscription.id}
          onApprove={() =>
            void handleApprove(
              detailTarget.businessId,
              detailTarget.subscription.id,
            ).then(() => setDetailTarget(null))
          }
          onClose={() => setDetailTarget(null)}
        />
      : null}

      {overwriteTarget ?
        <TrialStationEditDialog
          station={{
            ...overwriteTarget.item,
            subscription: overwriteTarget.subscription,
          }}
          planOptions={OVERWRITE_PLAN_OPTIONS}
          saving={editSaving}
          error={editError}
          onClose={() => {
            if (!editSaving) setOverwriteTarget(null);
          }}
          onSave={(input) => void handleOverwrite(input)}
        />
      : null}

      {extendTarget ?
        <ExtendSubscriptionDialog
          subscription={extendTarget.subscription}
          stationName={extendTarget.item.businessName}
          saving={editSaving}
          error={editError}
          onClose={() => {
            if (!editSaving) setExtendTarget(null);
          }}
          onSave={(expiresAt) => void handleExtend(expiresAt)}
        />
      : null}

    </>
  );
}

function itemBusinessStatementId(businessId: string): string {
  return `statement:${businessId}`;
}

function patchOwnerSubscription(
  owners: ActiveOwner[],
  businessId: string,
  subscriptionId: string,
  patch: Partial<OwnerSubscription>,
): ActiveOwner[] {
  return owners.map((owner) => {
    if (owner.id !== businessId) return owner;
    return {
      ...owner,
      planName: patch.planName || owner.planName,
      subscriptions: owner.subscriptions?.map((subscription) =>
        subscription.id === subscriptionId ? { ...subscription, ...patch } : subscription,
      ),
    };
  });
}

function ExtendSubscriptionDialog({
  subscription,
  stationName,
  saving,
  error,
  onClose,
  onSave,
}: {
  subscription: OwnerSubscription;
  stationName: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (expiresAt: string) => void;
}) {
  const [endDate, setEndDate] = useState(manilaDateInputValue(subscription.expiresAt));
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold text-foreground">Update subscription</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Extend {stationName}&apos;s {displaySubscriptionPlanName(subscription)} access. The plan
          stays the same.
        </p>
        <label className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Access until</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
          />
        </label>
        {localError || error ?
          <p className="mt-3 text-sm text-red-700">{localError || error}</p>
        : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              try {
                setLocalError(null);
                onSave(trialEndsAtFromManilaDate(endDate));
              } catch (err) {
                setLocalError(err instanceof Error ? err.message : "Enter an end date.");
              }
            }}
          >
            {saving ? "Saving…" : "Update"}
          </Button>
        </div>
      </div>
    </div>
  );
}
