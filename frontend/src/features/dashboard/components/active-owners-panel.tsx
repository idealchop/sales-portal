"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubscriptionReasonDialog } from "@/features/dashboard/components/subscription-reason-dialog";
import { SubscriptionApprovalDetailDialog } from "@/features/dashboard/components/subscription-approval-detail-dialog";
import {
  applyApprovedSubscription,
  approveSubscription,
} from "@/features/dashboard/lib/approve-subscription";
import {
  INACTIVE_OWNERS_LIST_LIMIT,
  filterInactiveOwners,
  inactiveOwnersForList,
  sortInactiveOwners,
} from "@/features/dashboard/lib/sort-active-owners";
import {
  mergeOwnersPreservingContact,
  shouldShowInactiveOwnerContactButton,
} from "@/features/dashboard/lib/inactive-owner-contact";
import { recordInactiveOwnerContact } from "@/features/dashboard/lib/record-inactive-owner-contact";
import { PaginatedList } from "@/components/paginated-list";
import type { ActiveOwner, OwnerSubscription } from "@/lib/dashboard/analytics";
import {
  WORKSPACE_HEALTH_BADGE_STYLES,
  formatWorkspaceHealthTier,
} from "@/lib/dashboard/workspace-health";
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
import { ApiError } from "@/lib/api-client";

const SUBSCRIPTION_PAGE_SIZE = 5;

const TIMELINE_LABELS = {
  current: "Current",
  future: "Upcoming",
  past: "Past",
} as const;

function formatSubscriptionLine(subscription: OwnerSubscription): string {
  const status = formatSubscriptionStatus(subscription.status);
  if (!subscription.paymentStatus || !subscription.needsApproval) {
    return status;
  }
  return `${status} · ${formatPaymentStatus(subscription.paymentStatus)}`;
}

function SubscriptionRow({
  subscription,
  businessId,
  businessName,
  ownerEmail,
  canApprove,
  onApprove,
  onViewReason,
  onViewDetail,
  approvingId,
}: {
  subscription: OwnerSubscription;
  businessId: string;
  businessName: string;
  ownerEmail?: string;
  canApprove: boolean;
  onApprove: (businessId: string, subscriptionId: string) => void;
  onViewReason: (subscription: OwnerSubscription, businessName: string) => void;
  onViewDetail: (
    subscription: OwnerSubscription,
    businessName: string,
    ownerEmail?: string,
  ) => void;
  approvingId: string | null;
}) {
  const showReason = subscription.isDowngrade || subscription.isCancellation;
  const isFreeTrial = isTrialBillingCycle(subscription.billingCycle);
  const billingCycleLabel = formatBillingCycleLabel(subscription.billingCycle);
  const trialDaysRemaining = isFreeTrial ?
    formatTrialDaysRemaining(subscription.expiresAt)
  : null;

  return (
    <div className="rounded-lg border border-zinc-100 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {subscription.planName}
            {billingCycleLabel ?
              <span className="ml-1.5 text-xs font-normal text-[var(--muted-foreground)]">
                · {billingCycleLabel}
              </span>
            : null}
            {trialDaysRemaining ?
              <Badge className="ml-1.5 bg-sky-50 font-normal text-sky-800">
                {trialDaysRemaining}
              </Badge>
            : null}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {formatSubscriptionLine(subscription)}
          </p>
        </div>
        <div className="text-right text-sm font-medium text-foreground">
          {subscription.price > 0 ? formatPhp(subscription.price) : "Free"}
        </div>
      </div>

      <div className="mt-2 text-xs text-[var(--muted-foreground)]">
        {formatSubscriptionPeriod(subscription)}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {subscription.needsApproval && (
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() =>
              onViewDetail(subscription, businessName, ownerEmail)
            }
          >
            View
          </Button>
        )}
        {subscription.needsApproval && canApprove && (
          <Button
            size="sm"
            className="h-8"
            disabled={approvingId === subscription.id}
            onClick={() => onApprove(businessId, subscription.id)}
          >
            {approvingId === subscription.id ? "Approving…" : "Approve"}
          </Button>
        )}
        {subscription.needsApproval && !canApprove && (
          <Badge className="bg-amber-100 text-amber-800">Needs approval</Badge>
        )}
        {showReason && (
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => onViewReason(subscription, businessName)}
          >
            View reason
          </Button>
        )}
      </div>
    </div>
  );
}

function SubscriptionGroup({
  label,
  items,
  businessId,
  businessName,
  ownerEmail,
  canApprove,
  onApprove,
  onViewReason,
  onViewDetail,
  approvingId,
}: {
  label: string;
  items: OwnerSubscription[];
  businessId: string;
  businessName: string;
  ownerEmail?: string;
  canApprove: boolean;
  onApprove: (businessId: string, subscriptionId: string) => void;
  onViewReason: (subscription: OwnerSubscription, businessName: string) => void;
  onViewDetail: (
    subscription: OwnerSubscription,
    businessName: string,
    ownerEmail?: string,
  ) => void;
  approvingId: string | null;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label} ({items.length})
      </p>
      <PaginatedList
        items={items}
        pageSize={SUBSCRIPTION_PAGE_SIZE}
        resetKey={`${businessId}-${label}`}
        className="space-y-2"
        renderItem={(subscription) => (
          <SubscriptionRow
            key={subscription.id}
            subscription={subscription}
            businessId={businessId}
            businessName={businessName}
            ownerEmail={ownerEmail}
            canApprove={canApprove}
            onApprove={onApprove}
            onViewReason={onViewReason}
            onViewDetail={onViewDetail}
            approvingId={approvingId}
          />
        )}
      />
    </div>
  );
}

function OwnerRow({
  owner,
  expanded,
  onToggle,
  canApprove,
  onApprove,
  onViewReason,
  onViewDetail,
  approvingId,
  contactingId,
  onContact,
}: {
  owner: ActiveOwner;
  expanded: boolean;
  onToggle: () => void;
  canApprove: boolean;
  onApprove: (businessId: string, subscriptionId: string) => void;
  onViewReason: (subscription: OwnerSubscription, businessName: string) => void;
  onViewDetail: (
    subscription: OwnerSubscription,
    businessName: string,
    ownerEmail?: string,
  ) => void;
  approvingId: string | null;
  contactingId: string | null;
  onContact: (owner: ActiveOwner) => void;
}) {
  const subscriptions = useMemo(
    () => owner.subscriptions ?? [],
    [owner.subscriptions],
  );
  const grouped = useMemo(() => {
    const order: Array<keyof typeof TIMELINE_LABELS> = [
      "current",
      "future",
      "past",
    ];
    return order
      .map((timeline) => ({
        timeline,
        label: TIMELINE_LABELS[timeline],
        items: subscriptions.filter((sub) => sub.timeline === timeline),
      }))
      .filter((group) => group.items.length > 0);
  }, [subscriptions]);

  const showContact = shouldShowInactiveOwnerContactButton(owner);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="flex w-full items-start gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-3 text-left transition hover:opacity-90"
        >
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition",
              expanded && "rotate-180",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{owner.businessName}</p>
              <Badge className={WORKSPACE_HEALTH_BADGE_STYLES[owner.healthTier]}>
                {formatWorkspaceHealthTier(owner.healthTier)}
              </Badge>
              {(owner.pendingApprovals ?? 0) > 0 && (
                <Badge className="bg-amber-100 text-amber-800">
                  {owner.pendingApprovals} pending
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {owner.planName || "—"} · {owner.customers} customers ·{" "}
              {owner.transactionsLast30Days} tx/30d
              {owner.monthlyRevenue > 0 ?
                ` · ${formatPhp(owner.monthlyRevenue)}`
              : ""}
            </p>
          </div>
        </button>
        {showContact ?
          <Button
            type="button"
            size="sm"
            className="mt-0.5 shrink-0 bg-amber-600 text-white hover:bg-amber-700"
            disabled={contactingId === owner.id}
            onClick={() => onContact(owner)}
          >
            {contactingId === owner.id ? "Sending…" : "Contact"}
          </Button>
        : null}
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/60 px-4 py-3">
          {owner.ownerEmail && (
            <p className="text-xs text-[var(--muted-foreground)]">{owner.ownerEmail}</p>
          )}
          {owner.address && (
            <p className="flex items-start gap-1.5 text-xs text-zinc-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {owner.address}
            </p>
          )}

          {grouped.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No subscription history yet.
            </p>
          ) : (
            grouped.map((group) => (
              <SubscriptionGroup
                key={group.timeline}
                label={group.label}
                items={group.items}
                businessId={owner.id}
                businessName={owner.businessName}
                ownerEmail={owner.ownerEmail}
                canApprove={canApprove}
                onApprove={onApprove}
                onViewReason={onViewReason}
                onViewDetail={(subscription, businessName, ownerEmail) =>
                  onViewDetail(subscription, businessName, ownerEmail)
                }
                approvingId={approvingId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ActiveOwnersPanel({
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<{
    subscription: OwnerSubscription;
    businessName: string;
  } | null>(null);
  const [detailTarget, setDetailTarget] = useState<{
    businessId: string;
    subscription: OwnerSubscription;
    businessName: string;
    ownerEmail?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllInactive, setShowAllInactive] = useState(false);

  if (ownersSource !== owners) {
    setOwnersSource(owners);
    setLocalOwners((previous) =>
      mergeOwnersPreservingContact(owners, previous),
    );
  }

  const inactiveOwners = useMemo(
    () => sortInactiveOwners(filterInactiveOwners(localOwners)),
    [localOwners],
  );

  const hiddenCount = Math.max(
    0,
    inactiveOwners.length - INACTIVE_OWNERS_LIST_LIMIT,
  );

  const displayedOwners = useMemo(
    () =>
      showAllInactive ?
        inactiveOwners
      : inactiveOwnersForList(localOwners),
    [localOwners, inactiveOwners, showAllInactive],
  );

  const pendingTotal = inactiveOwners.reduce(
    (sum, owner) => sum + (owner.pendingApprovals ?? 0),
    0,
  );

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

  async function handleContact(owner: ActiveOwner) {
    if (!owner.ownerEmail?.trim()) return;
    const optimisticAt = new Date().toISOString();
    setError(null);
    setContactingId(owner.id);
    // Hide Contact immediately; reappears after 7 days if still inactive.
    setLocalOwners((current) =>
      current.map((item) =>
        item.id === owner.id ?
          { ...item, lastContactedAt: optimisticAt }
        : item,
      ),
    );
    try {
      const { contactedAt } = await recordInactiveOwnerContact({
        businessId: owner.id,
        toEmail: owner.ownerEmail.trim(),
        businessName: owner.businessName,
      });
      setLocalOwners((current) =>
        current.map((item) =>
          item.id === owner.id ?
            { ...item, lastContactedAt: contactedAt }
          : item,
        ),
      );
    } catch (err) {
      setLocalOwners((current) =>
        current.map((item) =>
          item.id === owner.id ?
            { ...item, lastContactedAt: owner.lastContactedAt ?? null }
          : item,
        ),
      );
      setError(
        err instanceof ApiError ?
          err.message
        : "Could not send email via Brevo. Try again.",
      );
    } finally {
      setContactingId(null);
    }
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inactive owners</CardTitle>
          <CardDescription>
            No login in 7+ days · {displayedOwners.length} shown ·{" "}
            {inactiveOwners.length} inactive · {pendingTotal} pending
          </CardDescription>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {inactiveOwners.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              No inactive owners — everyone logged in within the last 7 days.
            </p>
          ) : (
            <>
              {displayedOwners.map((owner) => (
                <OwnerRow
                  key={owner.id}
                  owner={owner}
                  expanded={expandedId === owner.id}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === owner.id ? null : owner.id,
                    )
                  }
                  canApprove={canApprove}
                  onApprove={handleApprove}
                  onViewReason={(subscription, businessName) =>
                    setReasonTarget({ subscription, businessName })
                  }
                  onViewDetail={(subscription, businessName, ownerEmail) =>
                    setDetailTarget({
                      businessId: owner.id,
                      subscription,
                      businessName,
                      ownerEmail,
                    })
                  }
                  approvingId={approvingId}
                  contactingId={contactingId}
                  onContact={(target) => void handleContact(target)}
                />
              ))}

              {hiddenCount > 0 ?
                <div className="border-t border-zinc-100 pt-3 text-center">
                  <button
                    type="button"
                    className="text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
                    onClick={() => setShowAllInactive((current) => !current)}
                  >
                    {showAllInactive ?
                      `Show fewer (top ${INACTIVE_OWNERS_LIST_LIMIT})`
                    : `+${hiddenCount} more inactive — show all`}
                  </button>
                </div>
              : null}
            </>
          )}
        </CardContent>
      </Card>

      <SubscriptionApprovalDetailDialog
        subscription={detailTarget?.subscription ?? null}
        businessId={detailTarget?.businessId}
        businessName={detailTarget?.businessName}
        ownerEmail={detailTarget?.ownerEmail}
        canApprove={canApprove}
        isApproving={
          detailTarget ?
            approvingId === detailTarget.subscription.id
          : false
        }
        onApprove={
          detailTarget ?
            () =>
              void handleApprove(
                detailTarget.businessId,
                detailTarget.subscription.id,
              ).then(() => setDetailTarget(null))
          : undefined
        }
        onClose={() => setDetailTarget(null)}
      />

      <SubscriptionReasonDialog
        subscription={reasonTarget?.subscription ?? null}
        businessName={reasonTarget?.businessName}
        onClose={() => setReasonTarget(null)}
      />
    </>
  );
}
