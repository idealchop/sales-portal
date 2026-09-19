"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  ChevronDown,
  CreditCard,
  Gift,
  Printer,
  Search,
  Sparkles,
  Timer,
  Wallet,
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
  formatPaymentStatus,
  formatSubscriptionListAmount,
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

const BUCKET_HINTS: Record<SubscriptionOpsBucket, string> = {
  attention: "Grace, expired current period, pending payment, expiring soon, or more than one live period",
  paying: "Active paid plans billed monthly or yearly",
  voucher: "Listed paid plan at ₱0 (voucher / comped)",
  trial: "Scale or Grow free trial still running",
  free: "Forever Free plan",
  ended: "No live period — expired, cancelled, or never subscribed",
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

function KpiCard({
  label,
  value,
  hint,
  icon,
  active,
  onClick,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
  tone?: "default" | "alert";
}) {
  const className = cn(
    "rounded-xl border p-4 text-left shadow-sm transition",
    tone === "alert" ?
      "border-amber-200 bg-amber-50/70"
    : "border-zinc-200 bg-white",
    onClick && "hover:border-teal-300 hover:shadow",
    active && "ring-2 ring-teal-600",
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <div
          className={cn(
            "rounded-lg p-2",
            tone === "alert" ? "bg-amber-100 text-amber-800" : "bg-teal-50 text-teal-700",
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
        {value}
      </p>
      {hint ?
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      : null}
    </>
  );

  if (!onClick) {
    return <div className={className}>{body}</div>;
  }

  return (
    <button type="button" className={className} onClick={onClick} aria-pressed={active}>
      {body}
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
            <p className="font-medium text-foreground">
              {displaySubscriptionPlanName(subscription)}
            </p>
            {changeKind !== "other" ?
              <Badge className={CHANGE_KIND_STYLES[changeKind]}>
                {CHANGE_KIND_LABELS[changeKind]}
              </Badge>
            : null}
            {subscription.needsApproval ?
              <Badge className="bg-amber-100 text-amber-800">Needs approval</Badge>
            : null}
            {isExpired ?
              <Badge className="bg-red-100 text-red-800">Expired</Badge>
            : <Badge className="border-zinc-200 bg-white font-normal text-zinc-600">
                {subscription.timeline === "current" ?
                  "Current period"
                : subscription.timeline === "future" ?
                  "Upcoming"
                : "Past"}
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
            {formatSubscriptionListAmount(subscription)}
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
  const isFreeTrial = isTrialBillingCycle(subscription.billingCycle);
  const billingCycleLabel = formatBillingCycleLabel(subscription.billingCycle);
  const trialDaysRemaining = isFreeTrial ?
    formatTrialDaysRemaining(subscription.expiresAt)
  : null;
  const canPrintStatement = subscriptionHistoryHasStatementPayments(
    item.history,
  );
  const statementBusy = printingId === `statement:${item.businessId}`;
  const badges = statusBadges(item);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-white",
        item.opsBucket === "attention" ?
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
            <Badge className="border-zinc-200 bg-white font-medium text-zinc-800">
              {displaySubscriptionPlanName(subscription)}
            </Badge>
            {badges.map((badge) => (
              <Badge key={badge.label} className={badge.className}>
                {badge.label}
              </Badge>
            ))}
            {isFreeTrial && trialDaysRemaining ?
              <Badge className="bg-sky-50 font-normal text-sky-800">
                {trialDaysRemaining}
              </Badge>
            : null}
          </div>
          <p className="mt-1 pl-6 text-sm text-[var(--muted-foreground)]">
            {item.opsBucket === "ended" && item.history.length === 0 ?
              "No subscription on file"
            : `${billingCycleLabel ?? "No billing cycle"} · ${formatSubscriptionStatus(
                item.isExpired ? "expired" : subscription.status,
              )}${
                subscription.paymentStatus ?
                  ` · ${formatPaymentStatus(subscription.paymentStatus)}`
                : ""
              }`}
          </p>
          <p className="mt-1 pl-6 text-xs text-[var(--muted-foreground)]">
            {formatSubscriptionPeriod(subscription)}
            {ownerEmail ? ` · ${ownerEmail}` : ""}
            {` · ${item.history.length} period${item.history.length === 1 ? "" : "s"}`}
          </p>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-sm font-medium text-foreground">
            {item.history.length === 0 && item.opsBucket === "ended" ?
              "—"
            : formatSubscriptionListAmount(subscription)}
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
              Billing history
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

  const groupedPage = useMemo(() => {
    const groups: Array<{
      bucket: SubscriptionOpsBucket;
      items: UserSubscriptionListItem[];
    }> = [];
    for (const item of paginatedItems) {
      const current = groups[groups.length - 1];
      if (current && current.bucket === item.opsBucket) {
        current.items.push(item);
      } else {
        groups.push({ bucket: item.opsBucket, items: [item] });
      }
    }
    return groups;
  }, [paginatedItems]);

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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          label="Monthly billed"
          value={formatPhp(kpis.monthlyBilled)}
          hint={`${kpis.paying} paying workspace${kpis.paying === 1 ? "" : "s"}`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          label="Paying"
          value={String(kpis.paying)}
          hint={`${kpis.scale} Scale · ${kpis.grow} Grow · ${kpis.starter} Starter`}
          icon={<CreditCard className="h-4 w-4" />}
          active={bucket === "paying"}
          onClick={() => toggleBucket("paying")}
        />
        <KpiCard
          label="Trials"
          value={String(kpis.trial)}
          hint="Active free trials"
          icon={<Timer className="h-4 w-4" />}
          active={bucket === "trial"}
          onClick={() => toggleBucket("trial")}
        />
        <KpiCard
          label="Free"
          value={String(kpis.free)}
          hint="Forever Free plan"
          icon={<Sparkles className="h-4 w-4" />}
          active={bucket === "free"}
          onClick={() => toggleBucket("free")}
        />
        <KpiCard
          label="Voucher"
          value={String(kpis.voucher)}
          hint="Paid plan listed at ₱0"
          icon={<Gift className="h-4 w-4" />}
          active={bucket === "voucher"}
          onClick={() => toggleBucket("voucher")}
        />
        <KpiCard
          label="Needs attention"
          value={String(kpis.attention)}
          hint={
            kpis.pending > 0 ?
              `${kpis.pending} pending approval`
            : "Grace, expired current period, or overlapping"
          }
          icon={<AlertTriangle className="h-4 w-4" />}
          active={bucket === "attention"}
          onClick={() => toggleBucket("attention")}
          tone="alert"
        />
        <KpiCard
          label="Ended"
          value={String(kpis.ended)}
          hint="Expired, cancelled, or no plan"
          icon={<Archive className="h-4 w-4" />}
          active={bucket === "ended"}
          onClick={() => toggleBucket("ended")}
        />
      </div>

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
                {filteredItems.length === 1 ? "" : "s"}
                {bucket !== "all" ? ` in ${BUCKET_LABELS[bucket].toLowerCase()}` : ""}
              </p>
              <div className="space-y-6">
                {groupedPage.map((group) => (
                  <div key={group.bucket} className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">
                        {BUCKET_LABELS[group.bucket]} · {group.items.length}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {BUCKET_HINTS[group.bucket]}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {group.items.map((item) => (
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
                  </div>
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

function itemBusinessStatementId(businessId: string): string {
  return `statement:${businessId}`;
}
