"use client";

import { useMemo, useState } from "react";
import { ChevronDown, CreditCard, Printer } from "lucide-react";
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
import { SubscriptionApprovalDetailDialog } from "@/features/dashboard/components/subscription-approval-detail-dialog";
import { SubscriptionReasonDialog } from "@/features/dashboard/components/subscription-reason-dialog";
import {
  applyApprovedSubscription,
  approveSubscription,
} from "@/features/dashboard/lib/approve-subscription";
import {
  printSubscriptionOfficialReceipt,
  printSubscriptionStatement,
  subscriptionEligibleForOfficialReceipt,
  subscriptionHistoryHasStatementPayments,
} from "@/features/dashboard/lib/subscription-official-receipt";
import {
  buildUserSubscriptionsList,
  countUserSubscriptionsByFilter,
  filterUserSubscriptionsList,
  isSubscriptionExpiredByDate,
  type SubscriptionChangeKind,
  type SubscriptionListFilterKind,
  type UserSubscriptionListItem,
} from "@/features/dashboard/lib/build-user-subscriptions-list";
import { usePagination } from "@/hooks/use-pagination";
import type { ActiveOwner, OwnerSubscription } from "@/lib/dashboard/analytics";
import {
  formatBillingCycleLabel,
  formatPaymentStatus,
  formatSubscriptionPeriod,
  formatSubscriptionStatus,
  formatTrialDaysRemaining,
  isTrialBillingCycle,
} from "@/lib/dashboard/subscription-labels";
import { formatPhp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardAnalyticsRefresh } from "@/hooks/use-dashboard-analytics";

const CHANGE_KIND_LABELS: Record<SubscriptionChangeKind, string> = {
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  renewal: "Renewal",
  other: "Subscription",
};

const CHANGE_KIND_STYLES: Record<SubscriptionChangeKind, string> = {
  upgrade: "bg-violet-100 text-violet-800",
  downgrade: "bg-amber-100 text-amber-800",
  renewal: "bg-sky-100 text-sky-800",
  other: "bg-zinc-100 text-zinc-700",
};

const FILTER_LABELS: Record<SubscriptionListFilterKind, string> = {
  all: "All",
  pending: "Pending approval",
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  renewal: "Renewal",
};

const FILTER_ORDER: SubscriptionListFilterKind[] = [
  "all",
  "pending",
  "upgrade",
  "downgrade",
  "renewal",
];

const SUBSCRIPTIONS_PAGE_SIZE_OPTIONS = [5, 8, 10, 15, 20, 25] as const;
const DEFAULT_SUBSCRIPTIONS_PAGE_SIZE = 10;

type SubscriptionsPageSize = (typeof SUBSCRIPTIONS_PAGE_SIZE_OPTIONS)[number];

const TIMELINE_LABELS = {
  current: "Current",
  future: "Upcoming",
  past: "Past",
} as const;

function HistoryRow({
  subscription,
  businessId,
  canApprove,
  approvingId,
  printingId,
  onApprove,
  onPrintOr,
  onReview,
  onViewReason,
}: {
  subscription: OwnerSubscription;
  businessId: string;
  canApprove: boolean;
  approvingId: string | null;
  printingId: string | null;
  onApprove: (businessId: string, subscriptionId: string) => void;
  onPrintOr: (businessId: string, subscriptionId: string) => void;
  onReview: (businessId: string, subscription: OwnerSubscription) => void;
  onViewReason: (subscription: OwnerSubscription) => void;
}) {
  const changeKind = (() => {
    const changeType = (subscription.changeType || "").toLowerCase();
    if (changeType === "upgrade") return "upgrade" as const;
    if (changeType === "downgrade" || subscription.isDowngrade) {
      return "downgrade" as const;
    }
    if (changeType === "renew") return "renewal" as const;
    return "other" as const;
  })();
  const isExpired = isSubscriptionExpiredByDate(subscription);
  const isFreeTrial = isTrialBillingCycle(subscription.billingCycle);
  const billingCycleLabel = formatBillingCycleLabel(subscription.billingCycle);
  const trialDaysRemaining = isFreeTrial ?
    formatTrialDaysRemaining(subscription.expiresAt)
  : null;
  const canPrintOr = subscriptionEligibleForOfficialReceipt(subscription);
  const showReason = subscription.isDowngrade || subscription.isCancellation;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{subscription.planName}</p>
            <Badge className={CHANGE_KIND_STYLES[changeKind]}>
              {CHANGE_KIND_LABELS[changeKind]}
            </Badge>
            {subscription.needsApproval ?
              <Badge className="bg-amber-100 text-amber-800">Needs approval</Badge>
            : null}
            {isExpired ?
              <Badge className="bg-red-100 text-red-800">Expired</Badge>
            : <Badge className="border-zinc-200 bg-white font-normal text-zinc-600">
                {TIMELINE_LABELS[subscription.timeline]}
              </Badge>}
            {isFreeTrial && trialDaysRemaining ?
              <Badge className="bg-sky-50 font-normal text-sky-800">
                {trialDaysRemaining}
              </Badge>
            : null}
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {billingCycleLabel ? `${billingCycleLabel} · ` : ""}
            {formatSubscriptionStatus(subscription.status)}
            {subscription.paymentStatus ?
              ` · ${formatPaymentStatus(subscription.paymentStatus)}`
            : ""}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {formatSubscriptionPeriod(subscription)}
          </p>
          <SubscriptionUploadPreview subscription={subscription} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-sm font-medium text-foreground">
            {subscription.price > 0 ? formatPhp(subscription.price) : "Free"}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReview(businessId, subscription)}
            >
              Review
            </Button>
            {canPrintOr ?
              <Button
                size="sm"
                variant="outline"
                disabled={printingId === subscription.id}
                onClick={() => onPrintOr(businessId, subscription.id)}
              >
                {printingId === subscription.id ? "Preparing…" : "Print OR"}
              </Button>
            : null}
            {showReason ?
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewReason(subscription)}
              >
                View reason
              </Button>
            : null}
            {subscription.needsApproval && canApprove ?
              <Button
                size="sm"
                disabled={approvingId === subscription.id}
                onClick={() => onApprove(businessId, subscription.id)}
              >
                {approvingId === subscription.id ? "Approving…" : "Approve"}
              </Button>
            : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserSubscriptionCard({
  item,
  expanded,
  canApprove,
  approvingId,
  printingId,
  onToggle,
  onApprove,
  onPrintOr,
  onPrintStatement,
  onReview,
  onViewReason,
}: {
  item: UserSubscriptionListItem;
  expanded: boolean;
  canApprove: boolean;
  approvingId: string | null;
  printingId: string | null;
  onToggle: () => void;
  onApprove: (businessId: string, subscriptionId: string) => void;
  onPrintOr: (businessId: string, subscriptionId: string) => void;
  onPrintStatement: (businessId: string) => void;
  onReview: (businessId: string, subscription: OwnerSubscription) => void;
  onViewReason: (
    item: UserSubscriptionListItem,
    subscription: OwnerSubscription,
  ) => void;
}) {
  const { subscription, businessName, ownerEmail } = item;
  const isExpired = isSubscriptionExpiredByDate(subscription);
  const isFreeTrial = isTrialBillingCycle(subscription.billingCycle);
  const billingCycleLabel = formatBillingCycleLabel(subscription.billingCycle);
  const trialDaysRemaining = isFreeTrial ?
    formatTrialDaysRemaining(subscription.expiresAt)
  : null;
  const canPrintStatement = subscriptionHistoryHasStatementPayments(
    item.history,
  );
  const statementBusy = printingId === `statement:${item.businessId}`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-white",
        item.hasPendingPayment ?
          "border-amber-300 ring-1 ring-amber-100"
        : item.justPaid ?
          "border-emerald-300 ring-1 ring-emerald-100"
        : "border-[var(--border)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          <div className="flex flex-wrap items-center gap-2">
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-zinc-500 transition",
                expanded ? "rotate-0" : "-rotate-90",
              )}
              aria-hidden
            />
            <p className="font-medium text-foreground">{businessName}</p>
            {item.hasPendingPayment ?
              <Badge className="bg-amber-500 font-semibold text-white hover:bg-amber-500">
                Pending payment
              </Badge>
            : null}
            {item.justPaid ?
              <Badge className="bg-emerald-600 font-semibold text-white hover:bg-emerald-600">
                Just paid
              </Badge>
            : null}
            <Badge className={CHANGE_KIND_STYLES[item.changeKind]}>
              {CHANGE_KIND_LABELS[item.changeKind]}
            </Badge>
            {isExpired ?
              <Badge className="bg-red-100 text-red-800">Expired</Badge>
            : <Badge className="border-zinc-200 bg-white font-normal text-zinc-600">
                {TIMELINE_LABELS[subscription.timeline]}
              </Badge>}
            {isFreeTrial && trialDaysRemaining ?
              <Badge className="bg-sky-50 font-normal text-sky-800">
                {trialDaysRemaining}
              </Badge>
            : null}
            <Badge
              className={cn(
                "font-normal",
                item.activeSubscriptionCount === 1 ?
                  "bg-emerald-50 text-emerald-800"
                : "bg-red-100 text-red-800",
              )}
            >
              {item.activeSubscriptionCount} active
              {item.activeSubscriptionCount === 1 ? "" : " · should be 1"}
            </Badge>
            <Badge className="bg-teal-50 font-normal text-teal-800">
              {item.history.length} in history
            </Badge>
          </div>
          {item.hasPendingPayment ?
            <p className="mt-1 pl-6 text-xs font-medium text-amber-800">
              Waiting for payment verification or approval.
            </p>
          : item.justPaid ?
            <p className="mt-1 pl-6 text-xs font-medium text-emerald-800">
              Recent paid subscription recorded (last 7 days).
            </p>
          : null}
          <p className="mt-1 pl-6 text-sm text-[var(--muted-foreground)]">
            {subscription.planName}
            {billingCycleLabel ? ` · ${billingCycleLabel}` : ""} ·{" "}
            {formatSubscriptionStatus(subscription.status)}
            {subscription.paymentStatus ?
              ` · ${formatPaymentStatus(subscription.paymentStatus)}`
            : ""}
          </p>
          <p className="mt-1 pl-6 text-xs text-[var(--muted-foreground)]">
            {formatSubscriptionPeriod(subscription)}
            {ownerEmail ? ` · ${ownerEmail}` : ""}
          </p>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-sm font-medium text-foreground">
            {subscription.price > 0 ? formatPhp(subscription.price) : "Free"}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={!canPrintStatement || statementBusy}
            onClick={() => onPrintStatement(item.businessId)}
            className="gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            {statementBusy ? "Preparing…" : "Print statement"}
          </Button>
        </div>
      </div>

      {expanded ?
        <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/70 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Subscription history
            </p>
            <p className="text-xs text-zinc-500">Latest first</p>
          </div>
          <div className="space-y-2">
            {item.history.map((sub) => (
              <HistoryRow
                key={sub.id}
                subscription={sub}
                businessId={item.businessId}
                canApprove={canApprove}
                approvingId={approvingId}
                printingId={printingId}
                onApprove={onApprove}
                onPrintOr={onPrintOr}
                onReview={onReview}
                onViewReason={(historySub) => onViewReason(item, historySub)}
              />
            ))}
          </div>
        </div>
      : null}
    </div>
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
  const [kindFilter, setKindFilter] = useState<SubscriptionListFilterKind>("all");
  const [pageSize, setPageSize] = useState<SubscriptionsPageSize>(
    DEFAULT_SUBSCRIPTIONS_PAGE_SIZE,
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<{
    businessName: string;
    subscription: OwnerSubscription;
  } | null>(null);
  const [detailTarget, setDetailTarget] = useState<{
    businessId: string;
    businessName: string;
    ownerEmail?: string;
    subscription: OwnerSubscription;
  } | null>(null);

  if (ownersSource !== owners) {
    setOwnersSource(owners);
    setLocalOwners(owners);
  }

  const allItems = useMemo(
    () => buildUserSubscriptionsList(localOwners),
    [localOwners],
  );
  const filterCounts = useMemo(
    () => countUserSubscriptionsByFilter(allItems),
    [allItems],
  );
  const filteredItems = useMemo(
    () => filterUserSubscriptionsList(allItems, kindFilter),
    [allItems, kindFilter],
  );

  const resetKey = `${kindFilter}:${pageSize}`;
  const { paginatedItems, page, setPage, totalPages, totalItems } =
    usePagination(filteredItems, pageSize, resetKey);

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
    setPrintingId(`statement:${businessId}`);
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
            No active subscriptions to review
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
              User subscriptions · {filteredItems.length}
            </CardTitle>
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

          <p className="text-xs text-[var(--muted-foreground)]">
            Sorted by latest active plan: Scale → Grow → Scale trial. Expand a
            row for subscription history (newest first).
          </p>

          <div className="flex flex-wrap gap-2">
            {FILTER_ORDER.map((filter) => {
              const isActive = kindFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setKindFilter(filter)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                    isActive ?
                      "bg-[var(--primary)] text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                  )}
                >
                  {FILTER_LABELS[filter]}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      isActive ?
                        "bg-white/20 text-white"
                      : "bg-white text-zinc-600",
                    )}
                  >
                    {filterCounts[filter]}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent>
          {error ?
            <p className="mb-3 text-sm text-red-600">{error}</p>
          : null}
          {filteredItems.length === 0 ?
            <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              No subscriptions match this filter
            </p>
          : <>
              <p className="mb-3 text-xs text-[var(--muted-foreground)]">
                Showing {paginatedItems.length} of {filteredItems.length} user
                {filteredItems.length === 1 ? "" : "s"}
              </p>
              <div className="space-y-3">
                {paginatedItems.map((item) => (
                  <UserSubscriptionCard
                    key={item.businessId}
                    item={item}
                    expanded={expandedIds.has(item.businessId)}
                    canApprove={canApprove}
                    approvingId={approvingId}
                    printingId={printingId}
                    onToggle={() => toggleExpanded(item.businessId)}
                    onApprove={handleApprove}
                    onPrintOr={(businessId, subscriptionId) => {
                      void handlePrintOr(businessId, subscriptionId);
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
                    onViewReason={(listItem, subscription) =>
                      setReasonTarget({
                        businessName: listItem.businessName,
                        subscription,
                      })
                    }
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

      {reasonTarget ?
        <SubscriptionReasonDialog
          subscription={reasonTarget.subscription}
          businessName={reasonTarget.businessName}
          onClose={() => setReasonTarget(null)}
        />
      : null}
    </>
  );
}
