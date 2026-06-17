"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
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
import {
  applyApprovedSubscription,
  approveSubscription,
} from "@/features/dashboard/lib/approve-subscription";
import { buildSubscriptionApprovalQueue } from "@/features/dashboard/lib/build-subscription-approval-queue";
import type { ActiveOwner, OwnerSubscription } from "@/lib/dashboard/analytics";
import {
  formatPaymentStatus,
  formatSubscriptionPeriod,
  formatSubscriptionStatus,
} from "@/lib/dashboard/subscription-labels";
import { formatPhp } from "@/lib/format";
import type { DashboardAnalyticsRefresh } from "@/hooks/use-dashboard-analytics";

export function SubscriptionApprovalQueue({
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
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<{
    subscription: OwnerSubscription;
    businessName: string;
  } | null>(null);

  if (ownersSource !== owners) {
    setOwnersSource(owners);
    setLocalOwners(owners);
  }

  const queue = useMemo(
    () => buildSubscriptionApprovalQueue(localOwners),
    [localOwners],
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

  if (queue.length === 0) return null;

  return (
    <>
      <Card id="subscription-approvals">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" />
            Subscription approval queue
          </CardTitle>
          <CardDescription>
            {queue.length} pending payment{queue.length === 1 ? "" : "s"} across
            active owners
          </CardDescription>
          {error ?
            <p className="text-sm text-red-600">{error}</p>
          : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.map((item) => {
            const { subscription } = item;
            const showReason =
              subscription.isDowngrade || subscription.isCancellation;

            return (
              <div
                key={`${item.businessId}-${subscription.id}`}
                className="rounded-lg border border-[var(--border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {item.businessName}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {subscription.planName} ·{" "}
                      {formatSubscriptionStatus(subscription.status)}
                      {subscription.paymentStatus ?
                        ` · ${formatPaymentStatus(subscription.paymentStatus)}`
                      : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {formatSubscriptionPeriod(subscription)}
                      {item.ownerEmail ? ` · ${item.ownerEmail}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">
                      {subscription.price > 0 ?
                        formatPhp(subscription.price)
                      : "Free"}
                    </p>
                    <Badge className="mt-1 bg-amber-100 text-amber-800">
                      Needs approval
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canApprove ?
                    <Button
                      size="sm"
                      disabled={approvingId === subscription.id}
                      onClick={() =>
                        void handleApprove(item.businessId, subscription.id)
                      }
                    >
                      {approvingId === subscription.id ? "Approving…" : "Approve"}
                    </Button>
                  : null}
                  {showReason ?
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setReasonTarget({
                          subscription,
                          businessName: item.businessName,
                        })
                      }
                    >
                      View reason
                    </Button>
                  : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

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
